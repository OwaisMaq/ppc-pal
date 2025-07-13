import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Amazon OAuth Init Function Started ===');
  console.log('Request method:', req.method);
  
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
      amazonClientId: amazonClientId ? `Found (${amazonClientId.length} chars)` : 'MISSING',
      amazonClientSecret: amazonClientSecret ? `Found (${amazonClientSecret.length} chars)` : 'MISSING',
      supabaseUrl: supabaseUrl ? 'present' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'present' : 'MISSING'
    });

    // Check for missing Amazon credentials
    if (!amazonClientId) {
      console.error('=== MISSING AMAZON_CLIENT_ID ===');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon Client ID not configured in Supabase secrets',
          errorType: 'missing_amazon_client_id'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!amazonClientSecret) {
      console.error('=== MISSING AMAZON_CLIENT_SECRET ===');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon Client Secret not configured in Supabase secrets',
          errorType: 'missing_amazon_client_secret'
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
          details: 'Database configuration missing',
          errorType: 'missing_supabase_config'
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
    
    try {
      const bodyText = await req.text();
      console.log('Raw body text length:', bodyText.length);
      console.log('Raw body text content:', bodyText); // Add this for debugging
      
      if (!bodyText || bodyText.trim().length === 0) {
        console.error('=== EMPTY REQUEST BODY ===');
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request',
            details: 'Request body is required and cannot be empty',
            errorType: 'empty_body'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('Parsed request body:', JSON.stringify(requestBody, null, 2));
      
    } catch (parseError) {
      console.error('=== REQUEST BODY PARSE ERROR ===');
      console.error('Parse error:', parseError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON',
          details: 'Request body must be valid JSON',
          errorType: 'invalid_json'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle test mode for environment validation FIRST
    const { redirectUri, test } = requestBody;
    
    if (test) {
      console.log('=== Test Mode - Environment Validation ===');
      console.log('Environment validation passed - credentials available');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Amazon API credentials are properly configured',
          credentialsConfigured: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For normal OAuth flow, validate authorization header
    console.log('=== Validating Authorization ===');
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('=== MISSING AUTHORIZATION HEADER ===');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          details: 'Authorization header is required',
          errorType: 'missing_auth_header'
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
          details: 'Authorization header must start with "Bearer "',
          errorType: 'invalid_auth_format'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);

    // Validate redirectUri for normal OAuth flow
    console.log('=== Validating Redirect URI ===');
    console.log('Received redirectUri:', redirectUri);
    
    if (!redirectUri) {
      console.error('=== MISSING REDIRECT URI ===');
      return new Response(
        JSON.stringify({ 
          error: 'Missing redirect URI',
          details: 'redirectUri field is required',
          errorType: 'missing_redirect_uri'
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
          errorType: 'invalid_redirect_uri_format'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Initialize Supabase client and verify user
    console.log('=== Initializing Supabase Client ===');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('=== Verifying User Authentication ===');
    
    try {
      const authResult = await supabase.auth.getUser(token);
      
      if (authResult.error) {
        console.error('=== SUPABASE AUTH ERROR ===');
        console.error('Auth error:', authResult.error);
        
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            details: authResult.error.message || 'Invalid token',
            errorType: 'auth_failed'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (!authResult.data?.user?.id) {
        console.error('=== NO USER FOUND ===');
        
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            details: 'User not found or invalid token',
            errorType: 'user_not_found'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('=== USER AUTHENTICATED SUCCESSFULLY ===');
      console.log('User ID:', authResult.data.user.id);

      // Generate OAuth state parameter
      console.log('=== Generating OAuth State ===');
      const stateData = {
        user_id: authResult.data.user.id,
        redirect_uri: redirectUri,
        timestamp: Date.now(),
        nonce: crypto.randomUUID()
      };
      
      const state = btoa(JSON.stringify(stateData));
      console.log('OAuth state generated successfully');

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

      // Return successful response
      const responseData = { 
        authUrl: finalAuthUrl,
        success: true,
        timestamp: new Date().toISOString()
      };
      
      console.log('=== SUCCESS - Returning Auth URL ===');

      return new Response(
        JSON.stringify(responseData),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
    } catch (authError) {
      console.error('=== SUPABASE AUTH EXCEPTION ===');
      console.error('Auth exception:', authError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Token validation failed',
          errorType: 'auth_exception'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred',
        errorType: 'internal_error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});