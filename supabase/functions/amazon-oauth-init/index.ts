import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Amazon OAuth Init Started ===');
    console.log('Request method:', req.method);
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body format',
          details: 'Request body must be valid JSON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { redirectUri } = requestBody;
    console.log('Requested redirect URI:', redirectUri);
    
    // Validate redirect URI
    if (!redirectUri) {
      console.error('No redirect URI provided');
      return new Response(
        JSON.stringify({ 
          error: 'Redirect URI is required',
          details: 'Please provide a valid redirect URI'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!redirectUri.startsWith('https://')) {
      console.error('Invalid redirect URI scheme:', redirectUri);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid redirect URI',
          details: 'Redirect URI must use HTTPS'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    console.log('=== Environment Variables Check ===');
    console.log('Amazon Client ID present:', !!amazonClientId);
    console.log('Amazon Client Secret present:', !!amazonClientSecret);
    
    if (!amazonClientId || !amazonClientSecret) {
      console.error('Missing Amazon credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon credentials not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    console.log('=== Supabase Client Setup ===');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Supabase configuration incomplete'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    console.log('=== User Authentication Check ===');
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Invalid or missing authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          details: 'Please log in to connect your Amazon account'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      
      console.log('=== User Authentication Result ===');
      console.log('User authenticated:', !!userData?.user);
      console.log('User ID:', userData?.user?.id);
      
      if (userError || !userData?.user) {
        console.error('User authentication failed:', userError);
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            details: 'Please log in again'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Use the callback URL - should be the deployed URL
      const finalRedirectUri = 'https://ppcpal.online/amazon-callback';
      console.log('=== OAuth URL Construction ===');
      console.log('Using final redirect URI:', finalRedirectUri);

      // Generate state parameter with user ID and redirect URI
      const stateData = {
        user_id: userData.user.id,
        redirect_uri: finalRedirectUri,
        timestamp: Date.now()
      };
      
      console.log('=== State Parameter Generation ===');
      console.log('State data:', { user_id: stateData.user_id, redirect_uri: stateData.redirect_uri });
      
      // Encode state as base64 JSON
      const state = btoa(JSON.stringify(stateData));
      console.log('Generated state parameter (base64):', state);

      // CORRECTED SCOPE - Using double colons as per Amazon API documentation
      const scope = 'advertising::campaign_management';
      const responseType = 'code';
      
      console.log('OAuth parameters:');
      console.log('- Client ID:', amazonClientId.substring(0, 8) + '...');
      console.log('- Scope (CORRECTED):', scope);
      console.log('- Response Type:', responseType);
      console.log('- Redirect URI:', finalRedirectUri);
      console.log('- State length:', state.length);
      
      const authUrl = new URL('https://www.amazon.com/ap/oa');
      authUrl.searchParams.set('client_id', amazonClientId);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('response_type', responseType);
      authUrl.searchParams.set('redirect_uri', finalRedirectUri);
      authUrl.searchParams.set('state', state);

      const finalAuthUrl = authUrl.toString();
      console.log('=== Generated Amazon OAuth URL ===');
      console.log('Auth URL length:', finalAuthUrl.length);
      
      // Validate the constructed URL
      try {
        new URL(finalAuthUrl);
        console.log('Auth URL validation: PASSED');
      } catch (urlError) {
        console.error('Auth URL validation: FAILED', urlError);
        return new Response(
          JSON.stringify({ 
            error: 'URL generation failed',
            details: 'Generated auth URL is invalid'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const responseData = { 
        authUrl: finalAuthUrl, 
        state: state,
        scope: scope, // Include scope in response for debugging
        timestamp: new Date().toISOString()
      };
      
      console.log('=== OAuth Init Successful ===');
      console.log('Response prepared successfully with corrected scope');

      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (authError) {
      console.error('Authentication process failed:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication error',
          details: authError.message
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('=== Amazon OAuth Init Error ===');
    console.error('Error details:', error);
    
    const errorResponse = {
      error: 'Server error',
      details: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
