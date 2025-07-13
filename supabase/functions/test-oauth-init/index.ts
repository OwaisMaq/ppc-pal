import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Test OAuth Init Started ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Reading Request Body ===');
    const bodyText = await req.text();
    console.log('Body text:', bodyText);
    console.log('Body length:', bodyText.length);
    
    let body;
    try {
      body = JSON.parse(bodyText);
      console.log('Parsed body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid JSON',
        bodyReceived: bodyText,
        parseError: parseError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('=== Checking Environment ===');
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    console.log('Env check:', {
      hasClientId: !!amazonClientId,
      hasClientSecret: !!amazonClientSecret,
      clientIdLength: amazonClientId?.length || 0,
      clientSecretLength: amazonClientSecret?.length || 0
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Test function working',
      bodyReceived: body,
      hasCredentials: !!amazonClientId && !!amazonClientSecret,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('=== Test Function Error ===');
    console.error('Error:', error);
    
    return new Response(JSON.stringify({
      error: 'Test function failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});