

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
      throw new Error('No authorization header')
    }

    // Verify the user session
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    const { action, redirectUri, code, state } = await req.json()
    console.log('Amazon OAuth action:', action)

    if (action === 'initiate') {
      // Generate OAuth URL for Amazon Advertising API
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      if (!clientId) {
        throw new Error('Amazon Client ID not configured')
      }

      console.log('Client ID found:', clientId.substring(0, 10) + '...')
      console.log('Redirect URI:', redirectUri)

      const stateParam = `${user.id}_${Date.now()}`
      
      // TEMPORARY: Use profile scope instead of advertising scope for testing
      // You need to apply for Amazon Ads API access to use advertising:campaign_management
      const authUrl = `https://www.amazon.com/ap/oa?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `scope=profile&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${encodeURIComponent(stateParam)}`

      console.log('Generated auth URL for user:', user.id)
      console.log('Full auth URL:', authUrl)
      console.log('WARNING: Using profile scope instead of advertising scope - you need to apply for Amazon Ads API access')
      
      return new Response(
        JSON.stringify({ 
          authUrl,
          warning: 'Using basic profile scope. You need to apply for Amazon Ads API access for full functionality.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'callback') {
      // Handle OAuth callback
      console.log('Processing OAuth callback for user:', user.id)
      console.log('Received code:', code?.substring(0, 10) + '...')
      console.log('Received state:', state)
      
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
      
      if (!clientId || !clientSecret) {
        throw new Error('Amazon credentials not configured')
      }

      console.log('Attempting token exchange...')

      // Exchange code for tokens using the correct Amazon LWA token endpoint
      const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      })

      console.log('Token response status:', tokenResponse.status)

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text()
        console.error('Token exchange failed:', errorData)
        throw new Error(`Failed to exchange code for tokens: ${errorData}`)
      }

      const tokenData = await tokenResponse.json()
      console.log('Token exchange successful')

      // Since we're using profile scope instead of advertising scope,
      // we'll store a basic connection without trying to fetch advertising profiles
      console.log('Creating basic Amazon connection...')
      
      const { error: insertError } = await supabase
        .from('amazon_connections')
        .upsert({
          user_id: user.id,
          profile_id: 'temp_profile_' + Date.now(),
          profile_name: 'Amazon Profile (Limited Access)',
          marketplace_id: 'US',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          status: 'limited', // Mark as limited since we don't have advertising API access
        }, {
          onConflict: 'user_id, profile_id'
        })

      if (insertError) {
        console.error('Error storing connection:', insertError)
        throw insertError
      }

      console.log('Successfully stored limited connection for user:', user.id)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          profileCount: 1,
          warning: 'Connected with limited access. Apply for Amazon Ads API access for full functionality.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Amazon OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

