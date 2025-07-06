
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
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    // Environment variables check with better error handling
    console.log('=== Checking Environment Variables ===');
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Amazon Client ID present:', !!amazonClientId);
    console.log('Amazon Client Secret present:', !!amazonClientSecret);
    console.log('Supabase URL present:', !!supabaseUrl);
    console.log('Supabase Service Key present:', !!supabaseServiceKey);
    
    if (!amazonClientId || !amazonClientSecret) {
      console.error('Missing Amazon credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon API credentials not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Database configuration missing'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body with better error handling
    console.log('=== Parsing Request Body ===');
    let requestBody;
    
    try {
      const contentType = req.headers.get('content-type') || '';
      console.log('Content-Type header:', contentType);
      
      if (!contentType.includes('application/json')) {
        console.warn('Content-Type is not application/json:', contentType);
      }
      
      const bodyText = await req.text();
      console.log('Request body length:', bodyText.length);
      console.log('Request body preview:', bodyText.substring(0, 200));
      
      if (!bodyText || bodyText.trim().length === 0) {
        throw new Error('Request body is empty');
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('Parsed request body keys:', Object.keys(requestBody));
      
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format',
          details: 'Request body must be valid JSON with redirectUri field'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate redirectUri
    const { redirectUri } = requestBody;
    console.log('=== Validating Redirect URI ===');
    console.log('Received redirectUri:', redirectUri);
    
    if (!redirectUri || typeof redirectUri !== 'string') {
      console.error('Invalid or missing redirectUri');
      return new Response(
        JSON.stringify({ 
          error: 'Missing redirect URI',
          details: 'redirectUri field is required and must be a string'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate redirect URI format
    try {
      const redirectUrl = new URL(redirectUri);
      console.log('Redirect URI is valid:', {
        protocol: redirectUrl.protocol,
        hostname: redirectUrl.hostname,
        pathname: redirectUrl.pathname
      });
      
      // Ensure HTTPS for production
      if (redirectUrl.protocol !== 'https:' && !redirectUrl.hostname.includes('localhost')) {
        throw new Error('Redirect URI must use HTTPS in production');
      }
      
    } catch (urlError) {
      console.error('Invalid redirect URI format:', urlError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid redirect URI',
          details: 'Redirect URI must be a valid HTTPS URL'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate authorization header
    console.log('=== Validating Authorization ===');
    const authHeader = req.headers.get('authorization');
    console.log('Authorization header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
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
    
    // Initialize Supabase client and verify user
    console.log('=== Initializing Supabase Client ===');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('=== Verifying User Authentication ===');
    const { data: userResponse, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: userError.message || 'Invalid or expired token'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!userResponse?.user?.id) {
      console.error('No user found in authentication response');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'User not found or invalid token'
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

    // Generate OAuth state parameter
    console.log('=== Generating OAuth State ===');
    const stateData = {
      user_id: userResponse.user.id,
      redirect_uri: redirectUri,
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    };
    
    const state = btoa(JSON.stringify(stateData));
    console.log('OAuth state generated, length:', state.length);

    // Build Amazon OAuth URL according to the documentation
    console.log('=== Building Amazon OAuth URL ===');
    
    // Use the correct Amazon OAuth endpoint for North America
    const amazonOAuthUrl = new URL('https://www.amazon.com/ap/oa');
    
    // Add required OAuth parameters
    amazonOAuthUrl.searchParams.set('client_id', amazonClientId);
    amazonOAuthUrl.searchParams.set('scope', 'advertising::campaign_management profile');
    amazonOAuthUrl.searchParams.set('response_type', 'code');
    amazonOAuthUrl.searchParams.set('redirect_uri', redirectUri);
    amazonOAuthUrl.searchParams.set('state', state);
    
    const finalAuthUrl = amazonOAuthUrl.toString();
    
    console.log('=== OAuth URL Construction Complete ===');
    console.log('Final URL length:', finalAuthUrl.length);
    console.log('URL parameters:', {
      client_id: amazonClientId.substring(0, 10) + '...',
      scope: 'advertising::campaign_management profile',
      response_type: 'code',
      redirect_uri: redirectUri,
      state_length: state.length
    });

    // Return successful response
    const responseData = { 
      authUrl: finalAuthUrl,
      success: true,
      timestamp: new Date().toISOString(),
      message: 'OAuth URL generated successfully'
    };
    
    console.log('=== Returning Success Response ===');
    console.log('Response data keys:', Object.keys(responseData));

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('=== Unexpected Error in OAuth Init ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    // Return a properly formatted error response
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: 'An unexpected error occurred during OAuth initialization',
        debug: {
          errorType: typeof error,
          errorName: error?.name || 'Unknown',
          errorMessage: error?.message || 'No message available',
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
