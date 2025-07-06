
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
    // Check environment variables
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment variables check:');
    console.log('- Amazon Client ID:', !!amazonClientId);
    console.log('- Amazon Client Secret:', !!amazonClientSecret);
    console.log('- Supabase URL:', !!supabaseUrl);
    console.log('- Supabase Key:', !!supabaseKey);
    
    if (!amazonClientId || !amazonClientSecret) {
      console.error('Missing Amazon credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Amazon credentials not configured',
          details: 'Amazon API credentials are missing from server configuration'
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
          details: 'Database configuration missing'
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
      console.log('Raw request body received:', bodyText || 'EMPTY');
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Request body is empty');
        return new Response(
          JSON.stringify({ 
            error: 'Missing request data',
            details: 'Request body cannot be empty'
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
          details: 'Request body must be valid JSON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate redirect URI
    const { redirectUri } = requestBody;
    console.log('Redirect URI from request:', redirectUri);
    
    if (!redirectUri) {
      console.error('Missing redirectUri in request body');
      return new Response(
        JSON.stringify({ 
          error: 'Missing redirect URI',
          details: 'redirectUri field is required'
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
      if (!url.protocol.startsWith('https')) {
        throw new Error('Must use HTTPS protocol');
      }
    } catch (urlError) {
      console.error('Invalid redirect URI:', urlError);
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

    // Get authentication token
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
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
    console.log('Extracted token length:', token.length);
    
    // Initialize Supabase client and verify user
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: userResponse, error: userError } = await supabase.auth.getUser(token);
    
    console.log('User verification result:');
    console.log('- User found:', !!userResponse?.user);
    console.log('- User ID:', userResponse?.user?.id);
    console.log('- Auth error:', userError?.message);
    
    if (userError || !userResponse?.user) {
      console.error('User authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Invalid or expired authentication token'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate state parameter with user info
    const stateData = {
      user_id: userResponse.user.id,
      redirect_uri: redirectUri,
      timestamp: Date.now()
    };
    
    const state = btoa(JSON.stringify(stateData));
    console.log('Generated state parameter, length:', state.length);

    // Build Amazon OAuth URL
    const scope = 'advertising::campaign_management';
    const authUrl = new URL('https://www.amazon.com/ap/oa');
    authUrl.searchParams.set('client_id', amazonClientId);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    const finalAuthUrl = authUrl.toString();
    console.log('Amazon OAuth URL generated, length:', finalAuthUrl.length);

    const responseData = { 
      authUrl: finalAuthUrl, 
      state: state,
      scope: scope,
      timestamp: new Date().toISOString()
    };
    
    console.log('=== OAuth Init Success ===');

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
