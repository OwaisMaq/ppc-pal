
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Amazon OAuth Init Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables first
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('=== Environment Variables Check ===');
    console.log('Amazon Client ID present:', !!amazonClientId);
    console.log('Amazon Client Secret present:', !!amazonClientSecret);
    console.log('Supabase URL present:', !!supabaseUrl);
    console.log('Supabase Key present:', !!supabaseKey);
    
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

    // Parse request body safely
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      console.log('Request body length:', bodyText?.length || 0);
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Empty request body received');
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request',
            details: 'Request body is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('Request body parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      console.error('Parse error details:', parseError.message);
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
    console.log('Extracted redirect URI:', redirectUri);
    console.log('Redirect URI type:', typeof redirectUri);
    
    // Validate redirect URI
    if (!redirectUri) {
      console.error('No redirect URI provided in request body');
      console.error('Request body keys:', Object.keys(requestBody || {}));
      return new Response(
        JSON.stringify({ 
          error: 'Redirect URI is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    console.log('=== Supabase Client Setup ===');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    console.log('=== User Authentication Check ===');
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    console.log('Auth header format valid:', authHeader?.startsWith('Bearer '));
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Invalid or missing authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    let userData;
    try {
      console.log('Attempting to get user with token...');
      const { data: userResponse, error: userError } = await supabase.auth.getUser(token);
      
      console.log('=== User Authentication Result ===');
      console.log('User response present:', !!userResponse);
      console.log('User authenticated:', !!userResponse?.user);
      console.log('User ID:', userResponse?.user?.id);
      console.log('User error:', userError);
      
      if (userError || !userResponse?.user) {
        console.error('User authentication failed:', userError);
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      userData = userResponse;
    } catch (authError) {
      console.error('Authentication process failed:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication error'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use the provided redirect URI
    const finalRedirectUri = redirectUri;
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
    console.log('Generated state parameter (base64):', state.substring(0, 50) + '...');

    // Use the correct Amazon Advertising API scope
    const scope = 'advertising::campaign_management';
    const responseType = 'code';
    
    console.log('OAuth parameters:');
    console.log('- Client ID:', amazonClientId.substring(0, 8) + '...');
    console.log('- Scope:', scope);
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
    console.log('Auth URL preview:', finalAuthUrl.substring(0, 100) + '...');
    
    // Validate the constructed URL
    try {
      new URL(finalAuthUrl);
      console.log('Auth URL validation: PASSED');
    } catch (urlError) {
      console.error('Auth URL validation: FAILED', urlError);
      return new Response(
        JSON.stringify({ 
          error: 'URL generation failed'
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
      scope: scope,
      timestamp: new Date().toISOString()
    };
    
    console.log('=== OAuth Init Successful ===');
    console.log('Response prepared successfully');
    console.log('Response data keys:', Object.keys(responseData));

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('=== Amazon OAuth Init Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
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
