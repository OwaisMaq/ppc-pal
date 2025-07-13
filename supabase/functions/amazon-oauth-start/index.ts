import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Amazon OAuth Start function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Amazon credentials
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    if (!amazonClientId || !amazonClientSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Amazon credentials'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { redirectUri } = body;
    
    if (!redirectUri) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing redirectUri'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate OAuth URL
    const state = btoa(JSON.stringify({ 
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    }));

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
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});