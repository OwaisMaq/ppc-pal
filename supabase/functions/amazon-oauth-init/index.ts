
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
  
  // Log all headers for debugging
  const headers = Object.fromEntries(req.headers.entries());
  console.log('All request headers:', headers);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // First, let's check all environment variables
    const requiredEnvVars = {
      AMAZON_CLIENT_ID: Deno.env.get('AMAZON_CLIENT_ID'),
      AMAZON_CLIENT_SECRET: Deno.env.get('AMAZON_CLIENT_SECRET'),
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    };
    
    console.log('=== Environment Variables Check ===');
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      console.log(`${key}: ${value ? 'SET' : 'MISSING'} (length: ${value?.length || 0})`);
    }
    
    // Check for missing Amazon credentials
    if (!requiredEnvVars.AMAZON_CLIENT_ID || !requiredEnvVars.AMAZON_CLIENT_SECRET) {
      console.error('Missing Amazon API credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon API credentials are not configured on the server',
          debug: {
            hasClientId: !!requiredEnvVars.AMAZON_CLIENT_ID,
            hasClientSecret: !!requiredEnvVars.AMAZON_CLIENT_SECRET
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for missing Supabase credentials
    if (!requiredEnvVars.SUPABASE_URL || !requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Database configuration is missing',
          debug: {
            hasSupabaseUrl: !!requiredEnvVars.SUPABASE_URL,
            hasSupabaseKey: !!requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body with detailed logging
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('=== Request Body Parsing ===');
      console.log('Raw body length:', bodyText?.length || 0);
      console.log('Raw body preview:', bodyText?.substring(0, 200) || 'EMPTY');
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Request body is empty');
        return new Response(
          JSON.stringify({ 
            error: 'Missing request data',
            details: 'Request body is empty. Please ensure redirectUri is provided.',
            debug: {
              contentType: headers['content-type'] || 'NOT SET',
              bodyLength: bodyText?.length || 0
            }
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('Parsed request body:', requestBody);
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format',
          details: 'Request body must be valid JSON',
          debug: {
            parseError: parseError.message,
            contentType: headers['content-type'] || 'NOT SET'
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate redirectUri
    const { redirectUri } = requestBody;
    console.log('=== Redirect URI Validation ===');
    console.log('Provided redirectUri:', redirectUri);
    
    if (!redirectUri) {
      console.error('redirectUri is missing');
      return new Response(
        JSON.stringify({ 
          error: 'Missing redirect URI',
          details: 'redirectUri field is required',
          debug: {
            receivedFields: Object.keys(requestBody)
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate URL format
    try {
      const url = new URL(redirectUri);
      console.log('Redirect URI validation passed:', {
        protocol: url.protocol,
        hostname: url.hostname,
        pathname: url.pathname
      });
    } catch (urlError) {
      console.error('Invalid redirect URI format:', urlError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid redirect URI format',
          details: 'Redirect URI must be a valid URL',
          debug: {
            providedUri: redirectUri,
            urlError: urlError.message
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate authentication
    const authHeader = req.headers.get('authorization');
    console.log('=== Authentication Validation ===');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          details: 'Valid Bearer token required',
          debug: {
            hasAuthHeader: !!authHeader,
            authHeaderFormat: authHeader?.substring(0, 20) || 'MISSING'
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    // Initialize Supabase and verify user
    const supabase = createClient(
      requiredEnvVars.SUPABASE_URL!,
      requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('=== User Authentication ===');
    const { data: userResponse, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Invalid or expired token',
          debug: {
            authError: userError.message
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!userResponse?.user) {
      console.error('No user found in auth response');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'User not found',
          debug: {
            hasUserResponse: !!userResponse
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User authenticated successfully:', {
      userId: userResponse.user.id,
      email: userResponse.user.email
    });

    // Generate state parameter
    const stateData = {
      user_id: userResponse.user.id,
      redirect_uri: redirectUri,
      timestamp: Date.now()
    };
    
    const state = btoa(JSON.stringify(stateData));
    console.log('State parameter generated, length:', state.length);

    // Build Amazon OAuth URL
    const scope = 'advertising::campaign_management';
    const authUrl = new URL('https://www.amazon.com/ap/oa');
    authUrl.searchParams.set('client_id', requiredEnvVars.AMAZON_CLIENT_ID!);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    const finalAuthUrl = authUrl.toString();
    console.log('=== OAuth URL Generated ===');
    console.log('Final URL length:', finalAuthUrl.length);
    console.log('URL components verified:', {
      baseUrl: authUrl.origin + authUrl.pathname,
      clientIdLength: requiredEnvVars.AMAZON_CLIENT_ID!.length,
      scope: scope,
      responseType: 'code',
      redirectUri: redirectUri,
      stateLength: state.length
    });

    const responseData = { 
      authUrl: finalAuthUrl,
      success: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('=== Success Response ===');
    console.log('Sending successful response with auth URL');

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('=== Unexpected Error ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: 'An unexpected error occurred',
        debug: {
          errorType: typeof error,
          errorName: error?.name || 'Unknown',
          errorMessage: error?.message || 'No message',
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
