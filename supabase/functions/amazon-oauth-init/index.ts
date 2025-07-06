
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
    // Get environment variables
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:');
    console.log('- Amazon Client ID present:', !!amazonClientId);
    console.log('- Amazon Client Secret present:', !!amazonClientSecret);
    console.log('- Supabase URL present:', !!supabaseUrl);
    console.log('- Supabase Key present:', !!supabaseKey);
    
    if (!amazonClientId || !amazonClientSecret) {
      console.error('Missing Amazon credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Amazon credentials not configured',
          details: 'Amazon API credentials missing'
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
          error: 'Supabase configuration missing',
          details: 'Supabase URL or service key not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Request body received, length:', bodyText?.length || 0);
      console.log('Raw request body:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Empty request body');
        return new Response(
          JSON.stringify({ 
            error: 'Empty request body',
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
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message || 'Request body must be valid JSON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { redirectUri } = requestBody;
    console.log('Redirect URI:', redirectUri);
    
    if (!redirectUri) {
      console.error('No redirect URI provided');
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
      console.error('Invalid redirect URI format:', urlError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid redirect URI format',
          details: 'Redirect URI must be a valid HTTPS URL'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Invalid authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          details: 'Valid Bearer token required'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    // Get user with token
    const { data: userResponse, error: userError } = await supabase.auth.getUser(token);
    
    console.log('User authentication result:');
    console.log('- User present:', !!userResponse?.user);
    console.log('- User ID:', userResponse?.user?.id);
    console.log('- Error:', userError?.message);
    
    if (userError || !userResponse?.user) {
      console.error('User authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: userError?.message || 'Invalid authentication token'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate state parameter
    const stateData = {
      user_id: userResponse.user.id,
      redirect_uri: redirectUri,
      timestamp: Date.now()
    };
    
    console.log('Generating state for user:', userResponse.user.id);
    
    // Encode state as base64 JSON
    const state = btoa(JSON.stringify(stateData));
    console.log('State generated, length:', state.length);

    // Amazon OAuth parameters
    const scope = 'advertising::campaign_management';
    const responseType = 'code';
    
    console.log('OAuth parameters:');
    console.log('- Client ID (first 10 chars):', amazonClientId.substring(0, 10));
    console.log('- Scope:', scope);
    console.log('- Response Type:', responseType);
    
    // Build Amazon OAuth URL
    const authUrl = new URL('https://www.amazon.com/ap/oa');
    authUrl.searchParams.set('client_id', amazonClientId);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', responseType);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    const finalAuthUrl = authUrl.toString();
    console.log('Amazon OAuth URL generated successfully');
    console.log('URL length:', finalAuthUrl.length);

    const responseData = { 
      authUrl: finalAuthUrl, 
      state: state,
      scope: scope,
      timestamp: new Date().toISOString()
    };
    
    console.log('=== OAuth Init Successful ===');

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('=== Amazon OAuth Init Error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
