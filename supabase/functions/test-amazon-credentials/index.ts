import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Testing Amazon Credentials ===');
    
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    console.log('Environment check:', {
      amazonClientId: amazonClientId ? `Found (${amazonClientId.length} chars)` : 'MISSING',
      amazonClientSecret: amazonClientSecret ? `Found (${amazonClientSecret.length} chars)` : 'MISSING',
      allEnvVars: Object.keys(Deno.env.toObject()).filter(key => key.includes('AMAZON'))
    });

    const result = {
      amazonClientId: !!amazonClientId,
      amazonClientSecret: !!amazonClientSecret,
      clientIdLength: amazonClientId?.length || 0,
      clientSecretLength: amazonClientSecret?.length || 0,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});