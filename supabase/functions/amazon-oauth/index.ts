
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
    console.log('Amazon OAuth function called with method:', req.method);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header')
    }

    // Verify the user session
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    console.log('User verification result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.error('Invalid authorization:', authError?.message);
      throw new Error('Invalid authorization')
    }

    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body received:', { 
        action: requestBody.action,
        hasCode: !!requestBody.code,
        hasState: !!requestBody.state,
        hasRedirectUri: !!requestBody.redirectUri
      });
    } catch (jsonError) {
      console.error('Failed to parse JSON body:', jsonError.message);
      throw new Error('Invalid JSON body');
    }

    const { action, redirectUri, code, state } = requestBody;
    console.log('Amazon OAuth action:', action)

    if (action === 'initiate') {
      // Generate OAuth URL for Amazon Advertising API
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      if (!clientId) {
        console.error('Amazon Client ID not configured');
        throw new Error('Amazon Client ID not configured')
      }

      const stateParam = `${user.id}_${Date.now()}`
      const scope = 'advertising::campaign_management'
      
      const authUrl = `https://www.amazon.com/ap/oa?` +
        `client_id=${clientId}&` +
        `scope=${scope}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${stateParam}`

      console.log('Generated auth URL for user:', user.id)
      
      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'callback') {
      // Handle OAuth callback
      console.log('Processing OAuth callback for user:', user.id)
      
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
      
      if (!clientId || !clientSecret) {
        console.error('Amazon credentials not configured');
        throw new Error('Amazon credentials not configured')
      }

      console.log('Exchanging code for tokens...');
      
      // Exchange code for tokens
      const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: 'https://ppcpal.online/auth/amazon/callback', // Must match the one used in authorization
        }),
      })

      console.log('Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text()
        console.error('Token exchange failed:', tokenResponse.status, errorData)
        return new Response(
          JSON.stringify({ 
            error: `Token exchange failed: ${tokenResponse.status}`,
            details: errorData 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const tokenData = await tokenResponse.json()
      console.log('Token exchange successful, access token length:', tokenData.access_token?.length || 0)

      // Get profile information
      console.log('Fetching Amazon profiles...');
      const profileResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
        },
      })

      console.log('Profile response status:', profileResponse.status);

      if (!profileResponse.ok) {
        const profileError = await profileResponse.text();
        console.error('Profile fetch failed:', profileResponse.status, profileError);
        return new Response(
          JSON.stringify({ 
            error: `Profile fetch failed: ${profileResponse.status}`,
            details: profileError 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const profiles = await profileResponse.json()
      console.log('Retrieved profiles count:', profiles.length)
      console.log('Full profiles response:', JSON.stringify(profiles, null, 2));

      // Check if user has any advertising profiles
      if (!profiles || profiles.length === 0) {
        console.log('No advertising profiles found for user');
        return new Response(
          JSON.stringify({ 
            error: 'No Amazon Advertising profiles found',
            message: 'Your Amazon account needs to have an active Amazon Advertising account with at least one advertising profile. Please set up Amazon Advertising first, then try connecting again.',
            helpUrl: 'https://advertising.amazon.com/',
            setupRequired: true
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Store connection for each profile
      for (const profile of profiles) {
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
        
        console.log('Storing connection for profile:', profile.profileId);
        console.log('User ID:', user.id);
        console.log('Profile data:', JSON.stringify(profile, null, 2));
        
        const connectionData = {
          user_id: user.id,
          profile_id: profile.profileId.toString(),
          profile_name: profile.accountInfo?.name || `Profile ${profile.profileId}`,
          marketplace_id: profile.countryCode,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          status: 'active' as const,
        };
        
        console.log('Connection data to insert:', JSON.stringify(connectionData, null, 2));
        
        const { data: insertData, error: insertError } = await supabase
          .from('amazon_connections')
          .upsert(connectionData, {
            onConflict: 'user_id, profile_id'
          })
          .select();

        console.log('Insert result:', { insertData, insertError });

        if (insertError) {
          console.error('Error storing connection:', insertError)
          throw insertError
        }
        
        console.log('Successfully inserted connection:', insertData);
      }

      console.log('Successfully stored connections for user:', user.id)
      
      return new Response(
        JSON.stringify({ success: true, profileCount: profiles.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.error('Invalid action provided:', action);
    throw new Error('Invalid action')

  } catch (error) {
    console.error('Amazon OAuth error:', error.message);
    console.error('Full error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack?.split('\n')[0] || 'No additional details'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
