
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
    // Check environment variables first
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('=== Environment Variables Check ===');
    console.log('Amazon Client ID exists:', !!amazonClientId);
    console.log('Amazon Client Secret exists:', !!amazonClientSecret);
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Supabase Service Key exists:', !!supabaseKey);
    
    if (!amazonClientId || !amazonClientSecret) {
      console.error('Missing Amazon credentials in environment');
      return new Response(
        JSON.stringify({ 
          error: 'Amazon credentials not configured',
          details: 'Server is missing Amazon API credentials. Please contact support.',
          debug: {
            hasClientId: !!amazonClientId,
            hasClientSecret: !!amazonClientSecret
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration in environment');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Database configuration is missing. Please contact support.',
          debug: {
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseKey: !!supabaseKey
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body with enhanced error handling
    let requestBody;
    let bodyText = '';
    
    try {
      bodyText = await req.text();
      console.log('=== Request Body Analysis ===');
      console.log('Raw body length:', bodyText?.length || 0);
      console.log('Raw body content:', bodyText || 'EMPTY');
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Request body is completely empty');
        return new Response(
          JSON.stringify({ 
            error: 'Missing request data',
            details: 'The request body is empty. Please ensure you are sending the redirectUri parameter.',
            debug: {
              bodyLength: bodyText?.length || 0,
              bodyContent: bodyText || 'EMPTY'
            }
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('Successfully parsed request body:', requestBody);
      
    } catch (parseError) {
      console.error('=== JSON Parse Error ===');
      console.error('Parse error details:', parseError);
      console.error('Raw body that failed to parse:', bodyText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format',
          details: 'Request body must be valid JSON with redirectUri field',
          debug: {
            parseError: parseError.message,
            receivedBody: bodyText,
            expectedFormat: '{"redirectUri": "https://..."}' 
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate redirect URI
    const { redirectUri } = requestBody;
    console.log('=== Redirect URI Validation ===');
    console.log('Redirect URI from request:', redirectUri);
    console.log('Redirect URI type:', typeof redirectUri);
    
    if (!redirectUri) {
      console.error('redirectUri field is missing from request body');
      return new Response(
        JSON.stringify({ 
          error: 'Missing redirect URI',
          details: 'The redirectUri field is required in the request body.',
          debug: {
            requestBody: requestBody,
            missingField: 'redirectUri'
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate redirect URI format
    try {
      const url = new URL(redirectUri);
      console.log('Redirect URI parsed successfully:', {
        protocol: url.protocol,
        hostname: url.hostname,
        pathname: url.pathname
      });
      
      if (!url.protocol.startsWith('https')) {
        throw new Error('Must use HTTPS protocol');
      }
    } catch (urlError) {
      console.error('=== Invalid Redirect URI ===');
      console.error('URL validation error:', urlError);
      console.error('Invalid URL:', redirectUri);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid redirect URI',
          details: 'Redirect URI must be a valid HTTPS URL',
          debug: {
            providedUri: redirectUri,
            urlError: urlError.message,
            requiredFormat: 'https://domain.com/path'
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get and validate authentication token
    const authHeader = req.headers.get('authorization');
    console.log('=== Authentication Check ===');
    console.log('Auth header present:', !!authHeader);
    console.log('Auth header format valid:', authHeader?.startsWith('Bearer '));
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          details: 'Valid Bearer token required in Authorization header',
          debug: {
            hasAuthHeader: !!authHeader,
            headerFormat: authHeader?.substring(0, 10) + '...' || 'MISSING'
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token length:', token.length);
    
    // Initialize Supabase client and verify user
    console.log('=== Supabase Client Initialization ===');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Attempting to verify user token...');
    const { data: userResponse, error: userError } = await supabase.auth.getUser(token);
    
    console.log('=== User Verification Result ===');
    console.log('User data present:', !!userResponse?.user);
    console.log('User ID:', userResponse?.user?.id);
    console.log('User email:', userResponse?.user?.email);
    console.log('Auth error present:', !!userError);
    console.log('Auth error details:', userError);
    
    if (userError || !userResponse?.user) {
      console.error('User authentication failed');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Invalid or expired authentication token',
          debug: {
            authError: userError?.message || 'No user found',
            hasUser: !!userResponse?.user
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate state parameter with user info
    console.log('=== State Parameter Generation ===');
    const stateData = {
      user_id: userResponse.user.id,
      redirect_uri: redirectUri,
      timestamp: Date.now()
    };
    
    const state = btoa(JSON.stringify(stateData));
    console.log('Generated state parameter length:', state.length);

    // Build Amazon OAuth URL
    console.log('=== Amazon OAuth URL Construction ===');
    const scope = 'advertising::campaign_management';
    const authUrl = new URL('https://www.amazon.com/ap/oa');
    authUrl.searchParams.set('client_id', amazonClientId);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    const finalAuthUrl = authUrl.toString();
    console.log('Final Amazon OAuth URL length:', finalAuthUrl.length);
    console.log('OAuth URL components:', {
      baseUrl: 'https://www.amazon.com/ap/oa',
      clientId: amazonClientId.substring(0, 10) + '...',
      scope: scope,
      redirectUri: redirectUri,
      stateLength: state.length
    });

    const responseData = { 
      authUrl: finalAuthUrl, 
      state: state,
      scope: scope,
      timestamp: new Date().toISOString(),
      debug: {
        userId: userResponse.user.id,
        redirectUri: redirectUri
      }
    };
    
    console.log('=== Success Response ===');
    console.log('Response data keys:', Object.keys(responseData));
    console.log('Auth URL length:', responseData.authUrl.length);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('=== Unexpected Error in Amazon OAuth Init ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error cause:', error.cause);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: 'An unexpected error occurred while processing your request',
        debug: {
          errorName: error.name,
          errorMessage: error.message,
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
