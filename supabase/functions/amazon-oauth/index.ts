
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      throw new Error('No authorization header')
    }

    // Verify the user session
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Invalid authorization')
    }

    console.log('Processing request for user:', user.id)

    const { action, redirectUri, code, state } = await req.json()
    console.log('Amazon OAuth action:', action)

    if (action === 'initiate') {
      // Generate OAuth URL for Amazon Advertising API
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      if (!clientId) {
        console.error('Amazon Client ID not configured')
        throw new Error('Amazon Client ID not configured')
      }

      console.log('Client ID found, length:', clientId.length)
      console.log('Redirect URI:', redirectUri)

      const stateParam = `${user.id}_${Date.now()}`
      
      // Use profile scope for testing since advertising scope requires approval
      const authUrl = `https://www.amazon.com/ap/oa?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `scope=profile&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${encodeURIComponent(stateParam)}`

      console.log('Generated auth URL for user:', user.id)
      console.log('State parameter:', stateParam)
      
      return new Response(
        JSON.stringify({ 
          authUrl,
          state: stateParam,
          warning: 'Using basic profile scope. Apply for Amazon Ads API access for full functionality.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'callback') {
      // Handle OAuth callback
      console.log('Processing OAuth callback for user:', user.id)
      console.log('Received code length:', code?.length || 0)
      console.log('Received state:', state)
      
      if (!code) {
        console.error('No authorization code received')
        throw new Error('No authorization code received')
      }

      if (!state) {
        console.error('No state parameter received')
        throw new Error('No state parameter received')
      }

      // Verify state parameter contains user ID
      const stateUserId = state.split('_')[0]
      if (stateUserId !== user.id) {
        console.error('State parameter user ID mismatch. Expected:', user.id, 'Got:', stateUserId)
        throw new Error('Invalid state parameter')
      }

      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
      
      if (!clientId || !clientSecret) {
        console.error('Amazon credentials not configured')
        throw new Error('Amazon credentials not configured')
      }

      console.log('Attempting token exchange with Amazon...')

      // Exchange code for tokens using the correct Amazon LWA token endpoint
      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      })

      console.log('Token request body prepared')

      const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenBody,
      })

      console.log('Token response status:', tokenResponse.status)

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Token exchange failed:', errorText)
        throw new Error(`Failed to exchange code for tokens: ${errorText}`)
      }

      const tokenData = await tokenResponse.json()
      console.log('Token exchange successful, token type:', tokenData.token_type)

      // Create connection record
      const connectionData = {
        user_id: user.id,
        profile_id: 'basic_profile_' + Date.now(),
        profile_name: 'Amazon Profile (Basic Access)',
        marketplace_id: 'US',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        token_expires_at: new Date(Date.now() + ((tokenData.expires_in || 3600) * 1000)).toISOString(),
        status: 'pending' as const, // Changed from 'limited' to 'pending'
      }

      console.log('Creating connection record for user:', user.id)

      const { data: insertedConnection, error: insertError } = await supabase
        .from('amazon_connections')
        .insert(connectionData)
        .select()
        .single()

      if (insertError) {
        console.error('Error storing connection:', insertError)
        throw new Error(`Failed to store connection: ${insertError.message}`)
      }

      console.log('Successfully stored connection with ID:', insertedConnection.id)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          profileCount: 1,
          connectionId: insertedConnection.id,
          warning: 'Connected with limited access. Apply for Amazon Ads API access for full functionality.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Amazon OAuth error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check edge function logs for more information'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
