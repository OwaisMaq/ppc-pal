import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Profiles Debug Edge Function
 * 
 * A safe, read-only diagnostic endpoint that tests Amazon Advertising API
 * connectivity across all regions using existing stored tokens.
 * 
 * Returns per-region status codes and profile counts without exposing sensitive data.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] profiles-debug: Starting diagnostic check`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${timestamp}] profiles-debug: User authenticated: ${user.id}`);

    // Get user's Amazon connections
    const { data: connections, error: connError } = await supabase
      .from('amazon_connections')
      .select('id, profile_id, profile_name, advertising_api_endpoint, status, token_expires_at')
      .eq('user_id', user.id);

    if (connError) {
      console.error(`[${timestamp}] profiles-debug: Error fetching connections:`, connError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch connections', details: connError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has any connections
    const hasExistingConnections = connections && connections.length > 0;
    
    // Get client ID for API calls
    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Amazon client ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regional endpoints to test
    const regionalEndpoints = [
      { url: 'https://advertising-api.amazon.com', region: 'North America', code: 'NA' },
      { url: 'https://advertising-api-eu.amazon.com', region: 'Europe', code: 'EU' },
      { url: 'https://advertising-api-fe.amazon.com', region: 'Far East', code: 'FE' }
    ];

    const results: any[] = [];

    // If user has connections with valid tokens, test each region
    if (hasExistingConnections) {
      // Get the first connection with a valid token for testing
      const now = new Date();
      const validConnection = connections.find(c => 
        c.status === 'active' && 
        new Date(c.token_expires_at) > now
      );

      if (validConnection) {
        // Decrypt access token
        const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
        if (!encryptionKey) {
          return new Response(
            JSON.stringify({ error: 'Encryption key not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: decrypted, error: decryptError } = await supabase
          .rpc('decrypt_token', { 
            encrypted_value: validConnection.id,
            key: encryptionKey
          });

        // Actually get the token from the connection
        const { data: connWithToken, error: tokenError } = await supabase
          .from('amazon_connections')
          .select('access_token_encrypted')
          .eq('id', validConnection.id)
          .single();

        if (tokenError || !connWithToken?.access_token_encrypted) {
          console.error(`[${timestamp}] profiles-debug: Could not get token:`, tokenError);
          results.push({
            testType: 'token_retrieval',
            status: 'error',
            error: 'Could not retrieve stored token'
          });
        } else {
          // Decrypt the token
          const { data: accessToken, error: decryptErr } = await supabase
            .rpc('decrypt_token', { 
              encrypted_value: connWithToken.access_token_encrypted,
              key: encryptionKey
            });

          if (decryptErr || !accessToken) {
            console.error(`[${timestamp}] profiles-debug: Could not decrypt token:`, decryptErr);
            results.push({
              testType: 'token_decryption',
              status: 'error',
              error: 'Could not decrypt stored token'
            });
          } else {
            // Test each regional endpoint
            for (const endpoint of regionalEndpoints) {
              console.log(`[${timestamp}] profiles-debug: Testing ${endpoint.region}...`);
              const startTime = Date.now();

              try {
                const response = await fetch(`${endpoint.url}/v2/profiles`, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Amazon-Advertising-API-ClientId': clientId,
                    'Accept': 'application/json'
                  },
                  signal: AbortSignal.timeout(10000)
                });

                const endTime = Date.now();
                const responseTime = endTime - startTime;

                if (response.ok) {
                  const profiles = await response.json();
                  results.push({
                    region: endpoint.region,
                    regionCode: endpoint.code,
                    status: 'success',
                    httpStatus: response.status,
                    profileCount: profiles.length,
                    responseTime,
                    profiles: profiles.map((p: any) => ({
                      profileId: p.profileId,
                      countryCode: p.countryCode,
                      currencyCode: p.currencyCode,
                      accountName: p.accountInfo?.name
                    }))
                  });
                } else {
                  const errorText = await response.text();
                  results.push({
                    region: endpoint.region,
                    regionCode: endpoint.code,
                    status: 'failed',
                    httpStatus: response.status,
                    error: errorText.substring(0, 200),
                    responseTime
                  });
                }
              } catch (err) {
                const endTime = Date.now();
                const errorMessage = (err as Error).message;
                const isDnsError = errorMessage.includes('dns error') || 
                                  errorMessage.includes('failed to lookup address');
                const isTimeout = errorMessage.includes('timeout') || 
                                 errorMessage.includes('AbortError');

                results.push({
                  region: endpoint.region,
                  regionCode: endpoint.code,
                  status: 'error',
                  error: errorMessage.substring(0, 200),
                  isDnsError,
                  isTimeout,
                  responseTime: endTime - startTime
                });
              }
            }
          }
        }
      } else {
        results.push({
          testType: 'no_valid_token',
          status: 'warning',
          message: 'No connections with valid tokens found. User may need to reconnect.'
        });
      }
    } else {
      results.push({
        testType: 'no_connections',
        status: 'info',
        message: 'No Amazon connections found for this user.'
      });
    }

    // Summary analysis
    const successfulRegions = results.filter(r => r.status === 'success');
    const failedRegions = results.filter(r => r.status === 'failed' || r.status === 'error');
    const totalProfiles = successfulRegions.reduce((sum, r) => sum + (r.profileCount || 0), 0);

    const summary = {
      timestamp,
      userId: user.id,
      existingConnectionCount: connections?.length || 0,
      testedRegions: results.filter(r => r.region).length,
      successfulRegions: successfulRegions.length,
      failedRegions: failedRegions.length,
      totalProfilesFound: totalProfiles,
      hasDnsIssues: results.some(r => r.isDnsError),
      hasTimeouts: results.some(r => r.isTimeout),
      hasNAAccess: successfulRegions.some(r => r.regionCode === 'NA'),
      hasEUAccess: successfulRegions.some(r => r.regionCode === 'EU'),
      hasFEAccess: successfulRegions.some(r => r.regionCode === 'FE'),
      recommendation: ''
    };

    // Generate recommendation
    if (totalProfiles === 0 && successfulRegions.length > 0) {
      summary.recommendation = 'API connectivity is working but no advertising profiles found. Check if your Amazon account has active advertising accounts.';
    } else if (failedRegions.length === 3) {
      if (results.every(r => r.isDnsError)) {
        summary.recommendation = 'All regions failed with DNS errors. This is likely a temporary infrastructure issue.';
      } else {
        summary.recommendation = 'All regions failed. Check your Amazon API access permissions.';
      }
    } else if (!summary.hasNAAccess && (summary.hasEUAccess || summary.hasFEAccess)) {
      summary.recommendation = 'North America region is not accessible but other regions work. Your app may not be approved for NA, or the advertiser account is only registered in other regions.';
    } else if (totalProfiles > 0) {
      summary.recommendation = 'Everything looks good! Profiles found.';
    }

    console.log(`[${timestamp}] profiles-debug: Complete. Summary:`, JSON.stringify(summary, null, 2));

    return new Response(
      JSON.stringify({ summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${timestamp}] profiles-debug: Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
