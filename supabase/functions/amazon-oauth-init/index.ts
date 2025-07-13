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
    console.log('=== Amazon OAuth Init ===');
    
    // Get environment variables
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    if (!amazonClientId || !amazonClientSecret) {
      return new Response(JSON.stringify({
        error: 'Missing Amazon credentials',
        details: 'AMAZON_CLIENT_ID or AMAZON_CLIENT_SECRET not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await req.json();
    const { redirectUri } = body;
    
    if (!redirectUri) {
      return new Response(JSON.stringify({
        error: 'Missing redirectUri',
        details: 'redirectUri is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate state parameter
    const stateData = {
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    };
    const state = btoa(JSON.stringify(stateData));

    // Build Amazon OAuth URL
    const amazonOAuthUrl = new URL('https://www.amazon.com/ap/oa');
    amazonOAuthUrl.searchParams.set('client_id', amazonClientId);
    amazonOAuthUrl.searchParams.set('scope', 'advertising::campaign_management profile');
    amazonOAuthUrl.searchParams.set('response_type', 'code');
    amazonOAuthUrl.searchParams.set('redirect_uri', redirectUri);
    amazonOAuthUrl.searchParams.set('state', state);

    return new Response(JSON.stringify({
      success: true,
      authUrl: amazonOAuthUrl.toString(),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('OAuth init error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});