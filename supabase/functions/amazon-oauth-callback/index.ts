
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { code, state, error: oauthError } = await req.json()
    
    console.log('=== Amazon OAuth Callback ===')
    console.log('Received callback with:', { code: !!code, state: !!state, error: oauthError })

    if (oauthError) {
      console.error('OAuth error from Amazon:', oauthError)
      return new Response(
        JSON.stringify({ error: 'OAuth authorization failed', details: oauthError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!code) {
      console.error('No authorization code received')
      return new Response(
        JSON.stringify({ error: 'No authorization code received' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!state) {
      console.error('No state parameter received')
      return new Response(
        JSON.stringify({ error: 'No state parameter received' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse state to get user_id and redirect_uri
    let userId, redirectUri
    try {
      console.log('=== Parsing State Parameter ===')
      console.log('Raw state:', state)
      console.log('State length:', state.length)
      
      const stateData = JSON.parse(atob(state))
      console.log('Decoded state data:', stateData)
      
      userId = stateData.user_id
      redirectUri = stateData.redirect_uri
      
      console.log('Parsed state:', { userId: !!userId, redirectUri })
    } catch (e) {
      console.error('Failed to parse state parameter:', e)
      console.error('State value was:', state)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid state parameter',
          details: 'State parameter could not be decoded' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userId) {
      console.error('No user ID found in state')
      return new Response(
        JSON.stringify({ error: 'User ID not found in state' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate environment variables
    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      console.error('Missing Amazon credentials')
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing Amazon credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Exchange authorization code for access token
    console.log('=== Exchanging Authorization Code ===')
    console.log('Using redirect URI for token exchange:', redirectUri)
    
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', tokenResponse.status, errorText)
      
      let userFriendlyMessage = 'Failed to exchange authorization code with Amazon'
      if (tokenResponse.status === 400) {
        if (errorText.includes('invalid_grant')) {
          userFriendlyMessage = 'Authorization code has expired or is invalid. Please try connecting again.'
        } else if (errorText.includes('invalid_client')) {
          userFriendlyMessage = 'Invalid client configuration. Please contact support.'
        }
      }
      
      return new Response(
        JSON.stringify({ error: userFriendlyMessage, details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()
    console.log('Token exchange successful, received:', Object.keys(tokenData))

    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token || !refresh_token) {
      console.error('Missing tokens in response:', tokenData)
      return new Response(
        JSON.stringify({ error: 'Invalid token response from Amazon' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate token expiry with buffer
    const tokenExpiresAt = new Date(Date.now() + ((expires_in - 300) * 1000)).toISOString() // 5 min buffer

    // Get advertising profiles with retry logic
    console.log('=== Fetching Advertising Profiles ===')
    let profiles = []
    let connectionStatus = 'setup_required'
    let profileId = 'setup_required_no_profiles_found'
    let profileName = 'No profiles found'
    let marketplaceId = null
    let setupRequiredReason = 'needs_sync'

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Profile fetch attempt ${attempt}/3`)
        const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json',
          },
        })

        if (profilesResponse.ok) {
          const profilesData = await profilesResponse.json()
          console.log(`Profiles response (attempt ${attempt}):`, profilesData)

          if (profilesData && Array.isArray(profilesData) && profilesData.length > 0) {
            profiles = profilesData
            // Use the first active profile
            const activeProfile = profiles.find(p => p.accountInfo?.marketplaceStringId) || profiles[0]
            profileId = activeProfile.profileId.toString()
            profileName = activeProfile.countryCode || `Profile ${activeProfile.profileId}`
            marketplaceId = activeProfile.accountInfo?.marketplaceStringId || activeProfile.countryCode
            connectionStatus = 'setup_required' // Will be set to active after first successful sync
            setupRequiredReason = 'needs_sync'
            console.log('Using profile:', { profileId, profileName, marketplaceId })
            break
          } else {
            console.log(`No advertising profiles found (attempt ${attempt})`)
            setupRequiredReason = 'no_advertising_profiles'
          }
        } else {
          const errorText = await profilesResponse.text()
          console.error(`Failed to fetch profiles (attempt ${attempt}):`, profilesResponse.status, errorText)
          
          if (profilesResponse.status === 401) {
            console.error('Token appears to be invalid for advertising API')
            setupRequiredReason = 'token_invalid'
            break
          }
          
          if (attempt === 3) {
            console.error('All profile fetch attempts failed')
            setupRequiredReason = 'api_error'
          }
        }
      } catch (error) {
        console.error(`Profile fetch attempt ${attempt} failed:`, error)
        if (attempt === 3) {
          setupRequiredReason = 'connection_error'
        }
      }
      
      // Wait before retry
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }

    // Check if connection already exists for this user and profile
    const { data: existingConnections, error: fetchError } = await supabaseClient
      .from('amazon_connections')
      .select('id, profile_id')
      .eq('user_id', userId)

    if (fetchError) {
      console.error('Error checking existing connections:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Database error checking existing connections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate profile
    const duplicateConnection = existingConnections?.find(conn => 
      conn.profile_id === profileId && profileId !== 'setup_required_no_profiles_found'
    )

    if (duplicateConnection) {
      console.log('Updating existing connection for profile:', profileId)
      const { data, error } = await supabaseClient
        .from('amazon_connections')
        .update({
          access_token,
          refresh_token,
          token_expires_at: tokenExpiresAt,
          status: connectionStatus,
          profile_name: profileName,
          marketplace_id: marketplaceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', duplicateConnection.id)
        .select('id')
        .single()

      if (error) {
        console.error('Error updating connection:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update connection', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          connection_id: data.id,
          status: connectionStatus,
          profile_count: profiles.length,
          setup_required_reason: setupRequiredReason,
          message: profiles.length > 0 
            ? 'Amazon account connection updated successfully. You can now sync your campaigns.'
            : 'Amazon account connected, but no advertising profiles found. Set up Amazon Advertising and use Force Sync.'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create new connection
    console.log('=== Creating New Connection ===')
    console.log('Connection details:', { userId, profileId, profileName, marketplaceId, status: connectionStatus })
    
    const { data, error } = await supabaseClient
      .from('amazon_connections')
      .insert({
        user_id: userId,
        profile_id: profileId,
        profile_name: profileName,
        marketplace_id: marketplaceId,
        access_token,
        refresh_token,
        token_expires_at: tokenExpiresAt,
        status: connectionStatus,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating connection:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create connection', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== OAuth Callback Successful ===')
    console.log('Connection ID:', data.id)
    console.log('Status:', connectionStatus)
    console.log('Profiles found:', profiles.length)

    return new Response(
      JSON.stringify({
        success: true,
        connection_id: data.id,
        status: connectionStatus,
        profile_count: profiles.length,
        setup_required_reason: setupRequiredReason,
        message: profiles.length > 0 
          ? 'Amazon account connected successfully. You can now sync your campaigns.'
          : 'Amazon account connected, but no advertising profiles found. Set up Amazon Advertising and use Force Sync.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== OAuth Callback Error ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during OAuth callback',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
