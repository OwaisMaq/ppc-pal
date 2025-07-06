
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
    console.log('Received callback with:', { code: !!code, state, error: oauthError })

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

    // Parse state to get user_id and redirect_uri
    let userId, redirectUri
    try {
      const stateData = JSON.parse(atob(state))
      userId = stateData.user_id
      redirectUri = stateData.redirect_uri
      console.log('Parsed state:', { userId: !!userId, redirectUri })
    } catch (e) {
      console.error('Failed to parse state:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid state parameter' }),
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

    // Exchange authorization code for access token
    console.log('Exchanging authorization code for tokens...')
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: Deno.env.get('AMAZON_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('AMAZON_CLIENT_SECRET') ?? '',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', tokenResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code', details: errorText }),
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

    // Get advertising profiles
    console.log('Fetching advertising profiles...')
    const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID') ?? '',
        'Content-Type': 'application/json',
      },
    })

    let profiles = []
    let connectionStatus = 'active'
    let profileId = 'setup_required_no_profiles_found'
    let profileName = 'No profiles found'
    let marketplaceId = null

    if (profilesResponse.ok) {
      profiles = await profilesResponse.json()
      console.log('Profiles response:', profiles)

      if (profiles && profiles.length > 0) {
        // Use the first profile for now
        const firstProfile = profiles[0]
        profileId = firstProfile.profileId.toString()
        profileName = firstProfile.countryCode || `Profile ${firstProfile.profileId}`
        marketplaceId = firstProfile.marketplaceStringId || firstProfile.countryCode
        connectionStatus = 'setup_required' // Will be set to active after first successful sync
        console.log('Using profile:', { profileId, profileName, marketplaceId })
      } else {
        console.log('No advertising profiles found')
        connectionStatus = 'setup_required'
      }
    } else {
      const errorText = await profilesResponse.text()
      console.error('Failed to fetch profiles:', profilesResponse.status, errorText)
      // Continue with setup_required status - user can try force sync later
      connectionStatus = 'setup_required'
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString()

    // Check if connection already exists for this user
    const { data: existingConnections, error: fetchError } = await supabaseClient
      .from('amazon_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('profile_id', profileId)

    if (fetchError) {
      console.error('Error checking existing connections:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Database error checking existing connections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let connectionId
    if (existingConnections && existingConnections.length > 0) {
      // Update existing connection
      console.log('Updating existing connection...')
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
        .eq('id', existingConnections[0].id)
        .select('id')
        .single()

      if (error) {
        console.error('Error updating connection:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update connection', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      connectionId = data.id
    } else {
      // Create new connection
      console.log('Creating new connection...')
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

      connectionId = data.id
    }

    console.log('=== OAuth Callback Successful ===')
    console.log('Connection ID:', connectionId)
    console.log('Status:', connectionStatus)
    console.log('Profiles found:', profiles.length)

    return new Response(
      JSON.stringify({
        success: true,
        connection_id: connectionId,
        status: connectionStatus,
        profile_count: profiles.length,
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
