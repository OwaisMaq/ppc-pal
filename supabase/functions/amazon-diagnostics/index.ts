import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Amazon diagnostics function called');
    
    const regionalEndpoints = [
      { 
        url: 'https://advertising-api.amazon.com',
        region: 'North America',
        priority: 1
      },
      { 
        url: 'https://advertising-api.eu.amazon.com',
        region: 'Europe',
        priority: 2
      },
      { 
        url: 'https://advertising-api.fe.amazon.com',
        region: 'Far East',
        priority: 3
      }
    ];
    
    const diagnostics = [];
    
    // Test connectivity to each endpoint
    for (const endpoint of regionalEndpoints) {
      console.log(`Testing connectivity to ${endpoint.url}`);
      
      try {
        const startTime = Date.now();
        
        // Just test basic connectivity without auth
        const response = await fetch(`${endpoint.url}/v2/profiles`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'PPC-Pal-Diagnostic/1.0'
          },
          signal: AbortSignal.timeout(10000)
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        diagnostics.push({
          endpoint: endpoint.url,
          region: endpoint.region,
          status: 'reachable',
          httpStatus: response.status,
          responseTime: responseTime,
          reachable: true,
          expectedAuth: response.status === 401 // 401 means endpoint is working but needs auth
        });
        
        console.log(`${endpoint.url} - Status: ${response.status}, Time: ${responseTime}ms`);
        
      } catch (error) {
        const errorMessage = error.message;
        const isDnsError = errorMessage.includes('dns error') || 
                          errorMessage.includes('failed to lookup address') ||
                          errorMessage.includes('Name or service not known');
        const isTimeoutError = errorMessage.includes('timeout') || 
                              errorMessage.includes('AbortError');
        
        diagnostics.push({
          endpoint: endpoint.url,
          region: endpoint.region,
          status: 'unreachable',
          error: errorMessage,
          isDnsError,
          isTimeoutError,
          reachable: false
        });
        
        console.log(`${endpoint.url} - Error: ${errorMessage}`);
      }
    }
    
    // Analyze results
    const reachableEndpoints = diagnostics.filter(d => d.reachable);
    const unreachableEndpoints = diagnostics.filter(d => !d.reachable);
    const dnsErrors = unreachableEndpoints.filter(d => d.isDnsError);
    
    const analysis = {
      timestamp: new Date().toISOString(),
      totalEndpoints: regionalEndpoints.length,
      reachableEndpoints: reachableEndpoints.length,
      unreachableEndpoints: unreachableEndpoints.length,
      dnsErrors: dnsErrors.length,
      overallStatus: reachableEndpoints.length > 0 ? 'partial_success' : 'failed',
      recommendation: reachableEndpoints.length === 0 
        ? 'All endpoints unreachable - try again later'
        : reachableEndpoints.length < regionalEndpoints.length
        ? 'Some regions unavailable - connection may still work'
        : 'All regions reachable - connection should work normally'
    };
    
    console.log('Diagnostic analysis:', analysis);
    
    return new Response(
      JSON.stringify({
        success: true,
        diagnostics,
        analysis
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});