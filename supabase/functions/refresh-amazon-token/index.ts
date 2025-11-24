import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Encryption is now handled by database functions using pgcrypto 'aes' cipher
// No client-side encryption helpers needed


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables first
    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
    
    console.log('Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasEncryptionKey: !!encryptionKey
    })
    
    if (!clientId) {
      throw new Error('AMAZON_CLIENT_ID not configured')
    }
    
    if (!clientSecret) {
      throw new Error('AMAZON_CLIENT_SECRET not configured')
    }
    
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not configured')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Try to parse request body
    const body = await req.json()
    const connectionId = body.connectionId
    const profileId = body.profileId
    
    console.log('Refreshing token for:', { connectionId, profileId })

    // Determine if this is a service role call or user call
    let userId: string | undefined
    
    if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      // Service role call - no user context needed
      console.log('Service role call detected')
    } else {
      // User call - verify authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        throw new Error('Invalid authorization')
      }
      
      userId = user.id
    }

    // Get the connection details (using service role)
    const query = supabase
      .from('amazon_connections')
      .select('id, user_id, profile_id, status')
    
    if (connectionId) {
      query.eq('id', connectionId)
    } else if (profileId) {
      query.eq('profile_id', profileId)
    } else {
      throw new Error('Either connectionId or profileId must be provided')
    }
    
    if (userId) {
      query.eq('user_id', userId)
    }
    
    const { data: connection, error: connectionError } = await query.single()

    if (connectionError || !connection) {
      throw new Error('Connection not found')
    }

    // Set encryption key in session for token decryption
    const { error: setKeyError } = await supabase
      .rpc('set_config', {
        key: 'app.enc_key',
        value: encryptionKey,
        is_local: true
      });

    if (setKeyError) {
      console.error('Failed to set encryption key in session:', setKeyError);
      throw new Error('Failed to configure session for token retrieval');
    }

    // Get tokens from secure storage using the RPC function
    const { data: tokensArray, error: tokenError } = await supabase
      .rpc('get_tokens', {
        p_profile_id: connection.profile_id
      })

    if (tokenError) {
      console.error('Token retrieval error:', tokenError)
      await supabase
        .from('amazon_connections')
        .update({ 
          status: 'setup_required',
          setup_required_reason: 'Failed to retrieve tokens - please reconnect your Amazon account' 
        })
        .eq('id', connectionId)
      throw new Error('Failed to retrieve stored tokens')
    }

    // RPC returns an array, get the first element
    const tokens = tokensArray?.[0]
    
    if (!tokens || !tokens.refresh_token) {
      console.error('No refresh token found for profile:', connection.profile_id, 'tokens:', tokens)
      await supabase
        .from('amazon_connections')
        .update({ 
          status: 'setup_required', 
          setup_required_reason: 'No refresh token found - please reconnect your Amazon account' 
        })
        .eq('id', connectionId)
      throw new Error('No refresh token available')
    }

    const refreshToken = tokens.refresh_token;

    console.log('Attempting to refresh access token...')
    
    // Refresh the access token
    const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text()
      console.error('Token refresh failed:', errorText)
      
      // Mark connection as expired if refresh fails
      await supabase
        .from('amazon_connections')
        .update({ 
          status: 'expired',
          setup_required_reason: 'Token refresh failed - please reconnect'
        })
        .eq('id', connectionId)
      
      throw new Error('Token refresh failed - please reconnect your account')
    }

    const tokenData = await refreshResponse.json()
    console.log('Token refreshed successfully')

    // Calculate new expiry time (Amazon tokens typically last 1 hour)
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    // Update connection metadata
    const { error: connectionUpdateError } = await supabase
      .from('amazon_connections')
      .update({
        token_expires_at: expiresAt.toISOString(),
        status: 'active',
        setup_required_reason: null,
        health_status: 'healthy',
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (connectionUpdateError) {
      console.error('Failed to update connection metadata:', connectionUpdateError)
      throw new Error('Failed to update connection metadata')
    }

    // Update tokens in secure storage using the correct RPC function
    const { error: updateError } = await supabase
      .rpc('store_tokens_with_key', {
        p_user_id: connection.user_id,
        p_profile_id: connection.profile_id,
        p_access_token: tokenData.access_token,
        p_refresh_token: tokenData.refresh_token || tokens.refresh_token,
        p_expires_at: expiresAt.toISOString(),
        p_encryption_key: encryptionKey
      })

    if (updateError) {
      console.error('Failed to update tokens in secure storage:', updateError)
      throw new Error('Failed to store updated tokens')
    }

    console.log('Connection updated with new tokens')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Token refreshed successfully',
        expires_at: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Token refresh error:', error)
    const message = (error as Error)?.message || 'Unknown error'
    let code = 'TOKEN_REFRESH_ERROR'
    if (message.includes('No authorization header')) code = 'NO_AUTH'
    else if (message.includes('Invalid authorization')) code = 'INVALID_AUTH'
    else if (message.includes('Connection not found')) code = 'CONNECTION_NOT_FOUND'
    else if (message.includes('Amazon credentials not configured')) code = 'MISSING_AMAZON_CREDENTIALS'
    else if (message.includes('Token refresh failed')) code = 'REFRESH_FAILED'

    return new Response(
      JSON.stringify({ success: false, code, error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})