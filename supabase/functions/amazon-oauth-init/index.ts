
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
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid request body format');
    }

    const { redirectUri } = requestBody;
    console.log('Requested redirect URI:', redirectUri);
    
    // Validate redirect URI
    if (!redirectUri) {
      console.error('No redirect URI provided');
      throw new Error('Redirect URI is required');
    }

    if (!redirectUri.startsWith('https://')) {
      console.error('Invalid redirect URI scheme:', redirectUri);
      throw new Error('Redirect URI must use HTTPS');
    }
    
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    console.log('=== Environment Variables Check ===');
    console.log('Amazon Client ID present:', !!amazonClientId);
    console.log('Amazon Client Secret present:', !!amazonClientSecret);
    console.log('Amazon Client ID length:', amazonClientId?.length || 0);
    
    if (!amazonClientId) {
      console.error('AMAZON_CLIENT_ID environment variable not set');
      throw new Error('Amazon Client ID not configured');
    }

    if (!amazonClientSecret) {
      console.error('AMAZON_CLIENT_SECRET environment variable not set');
      throw new Error('Amazon Client Secret not configured');
    }

    // Generate state parameter for security
    console.log('=== Generating Security State ===');
    const state = crypto.randomUUID();
    console.log('Generated state parameter:', state);
    console.log('State parameter length:', state.length);
    
    // Initialize Supabase client
    console.log('=== Supabase Client Setup ===');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase URL present:', !!supabaseUrl);
    console.log('Supabase Service Role Key present:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      throw new Error('Supabase configuration incomplete');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');

    // Get user from auth header
    console.log('=== User Authentication Check ===');
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('Authentication required');
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error('Invalid authorization header format');
      throw new Error('Invalid authorization format');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      
      console.log('=== User Authentication Result ===');
      console.log('User data present:', !!userData);
      console.log('User error:', userError);
      console.log('User ID:', userData?.user?.id);
      console.log('User email:', userData?.user?.email);
      
      if (userError) {
        console.error('User authentication failed:', userError);
        throw new Error(`Authentication failed: ${userError.message}`);
      }

      if (!userData?.user) {
        console.error('No user data returned from authentication');
        throw new Error('Invalid user session');
      }

      console.log('User authenticated successfully:', userData.user.id);
    } catch (authError) {
      console.error('Authentication process failed:', authError);
      throw new Error(`Authentication error: ${authError.message}`);
    }

    // Use the correct redirect URI - should be the deployed URL
    const finalRedirectUri = 'https://ppcpal.online/amazon-callback';
    console.log('=== OAuth URL Construction ===');
    console.log('Using final redirect URI:', finalRedirectUri);

    // Amazon OAuth URL parameters
    const scope = 'advertising::campaign_management';
    const responseType = 'code';
    
    console.log('OAuth parameters:');
    console.log('- Client ID:', amazonClientId.substring(0, 8) + '...');
    console.log('- Scope:', scope);
    console.log('- Response Type:', responseType);
    console.log('- Redirect URI:', finalRedirectUri);
    console.log('- State:', state);
    
    try {
      const authUrl = new URL('https://www.amazon.com/ap/oa');
      authUrl.searchParams.set('client_id', amazonClientId);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('response_type', responseType);
      authUrl.searchParams.set('redirect_uri', finalRedirectUri);
      authUrl.searchParams.set('state', state);

      const finalAuthUrl = authUrl.toString();
      console.log('=== Generated Amazon OAuth URL ===');
      console.log('Auth URL length:', finalAuthUrl.length);
      console.log('Auth URL:', finalAuthUrl);
      
      // Validate the constructed URL
      try {
        new URL(finalAuthUrl);
        console.log('Auth URL validation: PASSED');
      } catch (urlError) {
        console.error('Auth URL validation: FAILED', urlError);
        throw new Error('Generated auth URL is invalid');
      }

      console.log('=== Successful Response Preparation ===');
      const responseData = { 
        authUrl: finalAuthUrl, 
        state: state,
        timestamp: new Date().toISOString(),
        clientId: amazonClientId.substring(0, 8) + '...'
      };
      
      console.log('Response data:', responseData);

      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (urlError) {
      console.error('URL construction failed:', urlError);
      throw new Error(`Failed to construct OAuth URL: ${urlError.message}`);
    }
  } catch (error) {
    console.error('=== Amazon OAuth Init Error ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    
    const errorResponse = {
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      details: error.stack?.split('\n').slice(0, 3).join('\n')
    };
    
    console.log('Error response:', errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
