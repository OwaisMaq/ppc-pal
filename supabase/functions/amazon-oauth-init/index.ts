
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
          error: 'Server configuration error - Amazon credentials missing',
          details: 'Amazon API credentials not configured properly'
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
          error: 'Server configuration error - Supabase missing',
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
      console.log('Raw request body received:', !!bodyText);
      console.log('Request body length:', bodyText?.length || 0);
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Empty request body received');
        return new Response(
          JSON.stringify({ 
            error: 'Empty request body',
            details: 'Request body is required and cannot be empty'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('Request body parsed successfully');
      console.log('Request body keys:', Object.keys(requestBody || {}));
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: `JSON parsing failed: ${parseError.message}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { redirectUri } = requestBody;
    console.log('Extracted redirect URI:', redirectUri);
    
    // Validate redirect URI
    if (!redirectUri) {
      console.error('No redirect URI provided');
      console.error('Available keys in request body:', Object.keys(requestBody || {}));
      return new Response(
        JSON.stringify({ 
          error: 'Missing redirect URI',
          details: 'redirectUri field is required in request body'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate redirect URI format
    try {
      new URL(redirectUri);
      if (!redirectUri.startsWith('https://')) {
        throw new Error('Redirect URI must use HTTPS');
      }
    } catch (urlError) {
      console.error('Invalid redirect URI format:', urlError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid redirect URI format',
          details: `Redirect URI must be a valid HTTPS URL: ${urlError.message}`
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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Invalid or missing authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          details: 'Valid Bearer token required in Authorization header'
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
      
      if (userError) {
        console.error('User authentication failed:', userError.message);
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            details: `Token validation failed: ${userError.message}`
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (!userResponse?.user) {
        console.error('No user found with provided token');
        return new Response(
          JSON.stringify({ 
            error: 'Invalid token',
            details: 'No user found for the provided authentication token'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      userData = userResponse;
    } catch (authError) {
      console.error('Authentication process failed:', authError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication error',
          details: `Authentication process failed: ${authError.message}`
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate state parameter with user ID and redirect URI
    const stateData = {
      user_id: userData.user.id,
      redirect_uri: redirectUri,
      timestamp: Date.now()
    };
    
    console.log('=== State Parameter Generation ===');
    console.log('State data prepared for user:', userData.user.id);
    
    // Encode state as base64 JSON
    const state = btoa(JSON.stringify(stateData));
    console.log('Generated state parameter length:', state.length);

    // Use the correct Amazon Advertising API scope
    const scope = 'advertising::campaign_management';
    const responseType = 'code';
    
    console.log('=== OAuth URL Construction ===');
    console.log('OAuth parameters:');
    console.log('- Client ID preview:', amazonClientId.substring(0, 8) + '...');
    console.log('- Scope:', scope);
    console.log('- Response Type:', responseType);
    console.log('- Redirect URI:', redirectUri);
    
    const authUrl = new URL('https://www.amazon.com/ap/oa');
    authUrl.searchParams.set('client_id', amazonClientId);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', responseType);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    const finalAuthUrl = authUrl.toString();
    console.log('=== Generated Amazon OAuth URL ===');
    console.log('Auth URL length:', finalAuthUrl.length);
    console.log('Auth URL constructed successfully');
    
    // Validate the constructed URL
    try {
      new URL(finalAuthUrl);
      console.log('Auth URL validation: PASSED');
    } catch (urlError) {
      console.error('Auth URL validation: FAILED', urlError.message);
      return new Response(
        JSON.stringify({ 
          error: 'URL generation failed',
          details: `Failed to construct valid OAuth URL: ${urlError.message}`
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
      error: 'Internal server error',
      details: error.message || 'An unexpected error occurred during OAuth initialization',
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
