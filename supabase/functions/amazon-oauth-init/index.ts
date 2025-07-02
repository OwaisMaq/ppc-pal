
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
    const { redirectUri } = await req.json();
    console.log('Requested redirect URI:', redirectUri);
    
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    if (!amazonClientId) {
      console.error('Amazon Client ID not configured');
      throw new Error('Amazon Client ID not configured');
    }

    console.log('Amazon Client ID configured:', !!amazonClientId);

    // Generate state parameter for security
    const state = crypto.randomUUID();
    console.log('Generated state parameter:', state);
    
    // Store state in user session or database for validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    console.log('User authentication result:', {
      success: !userError,
      userId: userData?.user?.id
    });
    
    if (userError || !userData.user) {
      console.error('Authentication failed:', userError);
      throw new Error('Invalid authentication');
    }

    // Use the correct redirect URI - should be the deployed URL
    const finalRedirectUri = 'https://ppcpal.online/amazon-callback';
    console.log('Using redirect URI:', finalRedirectUri);

    // Amazon OAuth URL
    const scope = 'advertising::campaign_management';
    const responseType = 'code';
    
    const authUrl = new URL('https://www.amazon.com/ap/oa');
    authUrl.searchParams.set('client_id', amazonClientId);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', responseType);
    authUrl.searchParams.set('redirect_uri', finalRedirectUri);
    authUrl.searchParams.set('state', state);

    console.log('Generated Amazon OAuth URL:', authUrl.toString());

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString(), state }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in amazon-oauth-init:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
