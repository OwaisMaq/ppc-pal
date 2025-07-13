import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Amazon OAuth Init function called');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Amazon credentials
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    console.log('Credentials check:', {
      hasClientId: !!amazonClientId,
      hasClientSecret: !!amazonClientSecret
    });

    if (!amazonClientId || !amazonClientSecret) {
      console.log('Missing credentials');
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Amazon credentials'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get request body
    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (e) {
      console.log('Failed to parse JSON:', e);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { redirectUri } = body;
    if (!redirectUri) {
      console.log('Missing redirectUri');
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing redirectUri'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate state and build OAuth URL
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

    const authUrl = amazonOAuthUrl.toString();
    console.log('Generated auth URL successfully');

    return new Response(JSON.stringify({
      success: true,
      authUrl: authUrl,
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