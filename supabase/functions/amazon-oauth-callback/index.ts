
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory store to track processed authorization codes
const processedCodes = new Map<string, { timestamp: number; result: any }>();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [code, data] of processedCodes.entries()) {
    if (data.timestamp < tenMinutesAgo) {
      processedCodes.delete(code);
    }
  }
}, 10 * 60 * 1000);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    const { code, state, error: oauthError } = requestBody
    
    console.log('=== Amazon OAuth Callback ===')
    console.log('Request body:', { code: !!code, state: !!state, error: oauthError })
    console.log('Authorization code hash:', code ? btoa(code).substring(0, 10) : 'none')

    // Check if this code has already been processed
    if (code && processedCodes.has(code)) {
      const cached = processedCodes.get(code)!;
      console.log('=== Returning Cached Result ===')
      console.log('Cached result timestamp:', new Date(cached.timestamp).toISOString())
      return new Response(
        JSON.stringify(cached.result),
        { 
          status: cached.result.success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (oauthError) {
      console.error('OAuth error from Amazon:', oauthError)
      const errorResult = { 
        error: 'OAuth authorization failed', 
        details: oauthError,
        errorType: 'oauth_error',
        userAction: 'Please try connecting your Amazon account again'
      }
      
      if (code) {
        processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
      }
      
      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!code) {
      console.error('No authorization code received')
      const errorResult = { 
        error: 'No authorization code received',
        errorType: 'missing_code',
        userAction: 'Please try the authorization process again'
      }
      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!state) {
      console.error('No state parameter received')
      const errorResult = { 
        error: 'No state parameter received',
        errorType: 'missing_state',
        userAction: 'Please start the connection process from the settings page'
      }
      
      processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse state to get user_id and redirect_uri
    let userId, redirectUri
    try {
      console.log('=== Parsing State Parameter ===')
      console.log('Raw state length:', state.length)
      
      const stateData = JSON.parse(atob(state))
      console.log('Decoded state data keys:', Object.keys(stateData))
      
      userId = stateData.user_id
      redirectUri = stateData.redirect_uri
      
      console.log('Parsed state:', { userId: !!userId, redirectUri })
    } catch (e) {
      console.error('Failed to parse state parameter:', e)
      const errorResult = { 
        error: 'Invalid state parameter',
        details: 'State parameter could not be decoded',
        errorType: 'invalid_state',
        userAction: 'Please start the connection process again from the settings page'
      }
      
      processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userId) {
      console.error('No user ID found in state')
      const errorResult = { 
        error: 'User ID not found in state',
        errorType: 'invalid_user',
        userAction: 'Please log in and try connecting again'
      }
      
      processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate environment variables
    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      console.error('Missing Amazon credentials')
      const errorResult = { 
        error: 'Server configuration error - missing Amazon credentials',
        errorType: 'server_config',
        userAction: 'Please contact support - server configuration issue'
      }
      
      processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
      return new Response(
        JSON.stringify(errorResult),
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
      let errorType = 'token_exchange_failed'
      let userAction = 'Please try connecting your Amazon account again'
      
      if (tokenResponse.status === 400) {
        if (errorText.includes('invalid_grant')) {
          userFriendlyMessage = 'Authorization code has expired or been used already'
          errorType = 'code_expired'
          userAction = 'Please start the connection process again - the authorization code has expired'
        } else if (errorText.includes('invalid_client')) {
          userFriendlyMessage = 'Invalid client configuration'
          errorType = 'invalid_client'
          userAction = 'Please contact support - client configuration issue'
        }
      }
      
      const errorResult = { 
        error: userFriendlyMessage, 
        details: errorText,
        errorType,
        userAction
      }
      
      processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()
    console.log('Token exchange successful, received:', Object.keys(tokenData))

    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token || !refresh_token) {
      console.error('Missing tokens in response:', Object.keys(tokenData))
      const errorResult = { 
        error: 'Invalid token response from Amazon',
        errorType: 'invalid_tokens',
        userAction: 'Please try connecting again - Amazon did not provide valid tokens'
      }
      
      processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
      return new Response(
        JSON.stringify(errorResult),
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
      const errorResult = { 
        error: 'Database error checking existing connections',
        errorType: 'database_error',
        userAction: 'Please try again - database connection issue'
      }
      
      processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
      return new Response(
        JSON.stringify(errorResult),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate profile
    const duplicateConnection = existingConnections?.find(conn => 
      conn.profile_id === profileId && profileId !== 'setup_required_no_profiles_found'
    )

    let result;
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
        const errorResult = { 
          error: 'Failed to update connection', 
          details: error.message,
          errorType: 'database_update_error',
          userAction: 'Please try connecting again'
        }
        
        processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
        return new Response(
          JSON.stringify(errorResult),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      result = {
        success: true,
        connection_id: data.id,
        status: connectionStatus,
        profile_count: profiles.length,
        setup_required_reason: setupRequiredReason,
        message: profiles.length > 0 
          ? 'Amazon account connection updated successfully. You can now sync your campaigns.'
          : 'Amazon account connected, but no advertising profiles found. Set up Amazon Advertising and use Force Sync.'
      }
    } else {
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
        const errorResult = { 
          error: 'Failed to create connection', 
          details: error.message,
          errorType: 'database_insert_error',
          userAction: 'Please try connecting again'
        }
        
        processedCodes.set(code, { timestamp: Date.now(), result: errorResult });
        return new Response(
          JSON.stringify(errorResult),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      result = {
        success: true,
        connection_id: data.id,
        status: connectionStatus,
        profile_count: profiles.length,
        setup_required_reason: setupRequiredReason,
        message: profiles.length > 0 
          ? 'Amazon account connected successfully. You can now sync your campaigns.'
          : 'Amazon account connected, but no advertising profiles found. Set up Amazon Advertising and use Force Sync.'
      }
    }

    // Cache the successful result
    processedCodes.set(code, { timestamp: Date.now(), result });

    console.log('=== OAuth Callback Successful ===')
    console.log('Result:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== OAuth Callback Error ===')
    console.error('Error details:', error)
    
    const errorResult = { 
      error: 'Internal server error during OAuth callback',
      details: error.message,
      errorType: 'internal_error',
      userAction: 'Please try connecting again. If the problem persists, contact support.'
    }
    
    return new Response(
      JSON.stringify(errorResult),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
