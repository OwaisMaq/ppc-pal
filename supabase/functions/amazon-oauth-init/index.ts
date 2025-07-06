
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
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    // Environment variables check
    console.log('=== Checking Environment Variables ===');
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      amazonClientId: amazonClientId ? `${amazonClientId.substring(0, 10)}...` : 'MISSING',
      amazonClientSecret: amazonClientSecret ? `${amazonClientSecret.substring(0, 10)}...` : 'MISSING',
      supabaseUrl: supabaseUrl ? 'present' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'present' : 'MISSING'
    });
    
    if (!amazonClientId || !amazonClientSecret) {
      console.error('=== MISSING AMAZON CREDENTIALS ===');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon API credentials not configured',
          debug: {
            amazonClientId: !!amazonClientId,
            amazonClientSecret: !!amazonClientSecret
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('=== MISSING SUPABASE CONFIGURATION ===');
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

    // Parse request body
    console.log('=== Parsing Request Body ===');
    let requestBody;
    let bodyText = '';
    
    try {
      const contentType = req.headers.get('content-type') || '';
      console.log('Content-Type:', contentType);
      
      bodyText = await req.text();
      console.log('Raw body text:', bodyText);
      console.log('Body length:', bodyText.length);
      
      if (!bodyText || bodyText.trim().length === 0) {
        console.error('=== EMPTY REQUEST BODY ===');
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request',
            details: 'Request body is required and cannot be empty',
            debug: {
              contentType,
              bodyLength: bodyText.length,
              bodyPreview: bodyText.substring(0, 100)
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
      console.error('=== REQUEST BODY PARSE ERROR ===');
      console.error('Parse error:', parseError);
      console.error('Raw body that failed to parse:', bodyText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON',
          details: 'Request body must be valid JSON',
          debug: {
            parseError: parseError.message,
            rawBody: bodyText.substring(0, 200),
            bodyLength: bodyText.length
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
    console.log('=== Validating Redirect URI ===');
    console.log('Received redirectUri:', redirectUri);
    
    if (!redirectUri) {
      console.error('=== MISSING REDIRECT URI ===');
      return new Response(
        JSON.stringify({ 
          error: 'Missing redirect URI',
          details: 'redirectUri field is required',
          debug: {
            requestBodyKeys: Object.keys(requestBody),
            redirectUri: redirectUri
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (typeof redirectUri !== 'string') {
      console.error('=== INVALID REDIRECT URI TYPE ===');
      return new Response(
        JSON.stringify({ 
          error: 'Invalid redirect URI',
          details: 'redirectUri must be a string',
          debug: {
            redirectUriType: typeof redirectUri,
            redirectUri: redirectUri
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
      const redirectUrl = new URL(redirectUri);
      console.log('Redirect URI validation passed:', {
        protocol: redirectUrl.protocol,
        hostname: redirectUrl.hostname,
        pathname: redirectUrl.pathname
      });
    } catch (urlError) {
      console.error('=== INVALID REDIRECT URI FORMAT ===');
      console.error('URL validation error:', urlError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid redirect URI format',
          details: 'Redirect URI must be a valid URL',
          debug: {
            redirectUri,
            urlError: urlError.message
          }
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
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('=== MISSING AUTHORIZATION HEADER ===');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          details: 'Authorization header is required'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error('=== INVALID AUTHORIZATION HEADER FORMAT ===');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Authorization header must start with "Bearer "'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    if (token.length < 10) {
      console.error('=== INVALID TOKEN LENGTH ===');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Invalid token format'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Initialize Supabase client and verify user
    console.log('=== Initializing Supabase Client ===');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('=== Verifying User Authentication ===');
    let userResponse;
    
    try {
      const authResult = await supabase.auth.getUser(token);
      userResponse = authResult.data;
      
      if (authResult.error) {
        console.error('=== SUPABASE AUTH ERROR ===');
        console.error('Auth error:', authResult.error);
        
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            details: authResult.error.message || 'Invalid token'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
    } catch (authError) {
      console.error('=== SUPABASE AUTH EXCEPTION ===');
      console.error('Auth exception:', authError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Token validation failed'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!userResponse?.user?.id) {
      console.error('=== NO USER FOUND ===');
      console.error('User response:', userResponse);
      
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

    console.log('=== USER AUTHENTICATED SUCCESSFULLY ===');
    console.log('User ID:', userResponse.user.id);
    console.log('User email:', userResponse.user.email);

    // Generate OAuth state parameter
    console.log('=== Generating OAuth State ===');
    const stateData = {
      user_id: userResponse.user.id,
      redirect_uri: redirectUri,
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    };
    
    const state = btoa(JSON.stringify(stateData));
    console.log('OAuth state generated successfully, length:', state.length);

    // Build Amazon OAuth URL
    console.log('=== Building Amazon OAuth URL ===');
    const amazonOAuthUrl = new URL('https://www.amazon.com/ap/oa');
    
    amazonOAuthUrl.searchParams.set('client_id', amazonClientId);
    amazonOAuthUrl.searchParams.set('scope', 'advertising::campaign_management profile');
    amazonOAuthUrl.searchParams.set('response_type', 'code');
    amazonOAuthUrl.searchParams.set('redirect_uri', redirectUri);
    amazonOAuthUrl.searchParams.set('state', state);
    
    const finalAuthUrl = amazonOAuthUrl.toString();
    
    console.log('=== OAuth URL Generated Successfully ===');
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
      timestamp: new Date().toISOString()
    };
    
    console.log('=== SUCCESS - Returning Auth URL ===');
    console.log('Response keys:', Object.keys(responseData));

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error object:', error);
    
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
