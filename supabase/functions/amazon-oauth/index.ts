
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Encryption is now handled by database functions using pgcrypto 'aes' cipher
// No client-side encryption helpers needed

// Helper function for generating URL-safe state parameters
function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Amazon OAuth function called with method:`, req.method);
    
    // Check environment variables
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    console.log(`[${timestamp}] Environment check:`, {
      hasEncryptionKey: !!encryptionKey,
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasAmazonClientId: !!Deno.env.get('AMAZON_CLIENT_ID'),
      hasAmazonClientSecret: !!Deno.env.get('AMAZON_CLIENT_SECRET'),
      timestamp
    });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header')
    }

    // Verify the user session
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    console.log('User verification result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.error('Invalid authorization:', authError?.message);
      throw new Error('Invalid authorization')
    }

    let requestBody;
    try {
      requestBody = await req.json();
      console.log(`[${timestamp}] Request body received:`, { 
        action: requestBody.action,
        hasCode: !!requestBody.code,
        hasState: !!requestBody.state,
        hasRedirectUri: !!requestBody.redirectUri,
        timestamp
      });
    } catch (jsonError) {
      console.error(`[${timestamp}] Failed to parse JSON body:`, jsonError.message);
      throw new Error('Invalid JSON body');
    }

    const { action, code, state } = requestBody;
    console.log(`[${timestamp}] Amazon OAuth action:`, action)

    if (action === 'initiate') {
      // Generate OAuth URL for Amazon Advertising API
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      const redirectUri = Deno.env.get('AMAZON_REDIRECT_URI')
      
      if (!clientId) {
        console.error('Amazon Client ID not configured');
        throw new Error('Amazon Client ID not configured')
      }
      
      if (!redirectUri) {
        console.error('Amazon Redirect URI not configured');
        throw new Error('Amazon Redirect URI not configured')
      }

      // Generate secure state with crypto random values (URL-safe)
      const stateBytes = crypto.getRandomValues(new Uint8Array(16));
      const rawB64 = toBase64(stateBytes);
      const b64url = rawB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
      const stateParam = `${user.id}_${Date.now()}_${b64url}`;
      const scope = 'advertising::campaign_management'
      
      // Store OAuth state server-side
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const { error: stateError } = await supabase
        .from('oauth_states')
        .insert({
          user_id: user.id,
          provider: 'amazon',
          state: stateParam,
          redirect_uri: redirectUri,
          expires_at: expiresAt.toISOString()
        });
      
      if (stateError) {
        console.error('Failed to store OAuth state:', stateError);
        throw new Error('Failed to store OAuth state');
      }
      
      const authUrl = `https://www.amazon.com/ap/oa?` +
        `client_id=${clientId}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${stateParam}&` +
        `prompt=consent`; // Ensure user sees all permissions being requested

      console.log('Generated auth URL and stored state for user:', user.id)
      
      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'callback') {
      // Handle OAuth callback - look up state server-side
      console.log('Processing OAuth callback, validating state (raw):', state);
      
      if (!state) {
        console.error('No state parameter provided in callback');
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Missing state parameter',
            stage: 'validation'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Normalize state: some clients decode '+' as space
      const normalizedState = String(state).replace(/\s/g, '+');
      if (normalizedState !== state) {
        console.log('Normalized state value:', normalizedState);
      }
      
      // Look up OAuth state
      const { data: oauthState, error: stateError } = await supabase
        .from('oauth_states')
        .select('*')
        .eq('state', normalizedState)
        .eq('provider', 'amazon')
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (stateError || !oauthState) {
        console.error('Invalid or expired OAuth state. Raw:', state, 'Normalized:', normalizedState, stateError?.message);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Invalid or expired OAuth state',
            stage: 'state_validation',
            details: stateError?.message || 'State not found or expired'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log(`[${timestamp}] OAuth state validated for user:`, oauthState.user_id);
      
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
      
      if (!clientId || !clientSecret) {
        console.error(`[${timestamp}] Amazon credentials not configured`);
        throw new Error('Amazon credentials not configured')
      }

      console.log(`[${timestamp}] Exchanging code for tokens using stored redirect URI:`, oauthState.redirect_uri);
      
      // Exchange code for tokens using the stored redirect URI
      const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: oauthState.redirect_uri, // Use the stored redirect URI
        }),
      })

      console.log(`[${timestamp}] Token response status:`, tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text()
        console.error('Token exchange failed:', tokenResponse.status, errorData)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Token exchange failed`,
            stage: 'token_exchange',
            tokenStatus: tokenResponse.status,
            tokenBodySnippet: errorData.substring(0, 200),
            details: errorData 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Delete the OAuth state (single use)
      await supabase
        .from('oauth_states')
        .delete()
        .eq('id', oauthState.id);
      
      // Clean up expired states (housekeeping)
      await supabase
        .from('oauth_states')
        .delete()
        .lt('expires_at', new Date().toISOString());

      const tokenData = await tokenResponse.json()
      console.log(`[${timestamp}] Token exchange successful, access token length:`, tokenData.access_token?.length || 0)
      console.log(`[${timestamp}] Token data summary:`, {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        timestamp
      });

      // Get profile information - try multiple regional endpoints with enhanced error handling and DNS fallbacks
      console.log(`[${timestamp}] Fetching Amazon profiles...`);
      
      const regionalEndpoints = [
        { 
          url: 'https://advertising-api.amazon.com',
          region: 'North America',
          priority: 1
        },
        { 
          url: 'https://advertising-api-eu.amazon.com',
          region: 'Europe',
          priority: 2
        },
        { 
          url: 'https://advertising-api-fe.amazon.com',
          region: 'Far East',
          priority: 3
        }
      ];
      
      let profiles = [];
      const endpointResults = [];
      let successfulEndpoints = 0;
      let dnsFailureCount = 0;
      let totalAttempts = 0;
      
      // Helper function to try endpoint with DNS fallback
      const tryEndpointWithFallback = async (endpoint, headers, retryCount = 0) => {
        const maxRetries = 2;
        const timeout = retryCount === 0 ? 10000 : 15000; // Longer timeout for retries
        
        try {
          totalAttempts++;
          const fetchOptions = {
            headers,
            signal: AbortSignal.timeout(timeout)
          };
          
          const profileResponse = await fetch(`${endpoint.url}/v2/profiles`, fetchOptions);
          
          if (profileResponse.ok) {
            const endpointProfiles = await profileResponse.json();
            return {
              success: true,
              profiles: endpointProfiles,
              status: profileResponse.status,
              method: retryCount === 0 ? 'direct' : 'retry'
            };
          } else {
            const errorText = await profileResponse.text();
            return {
              success: false,
              error: `HTTP ${profileResponse.status}: ${errorText}`,
              status: profileResponse.status,
              method: retryCount === 0 ? 'direct' : 'retry'
            };
          }
        } catch (error) {
          const errorMessage = error.message;
          const isDnsError = errorMessage.includes('dns error') || 
                            errorMessage.includes('failed to lookup address') ||
                            errorMessage.includes('Name or service not known');
          const isTimeoutError = errorMessage.includes('timeout') || 
                                errorMessage.includes('AbortError');
          
          if (isDnsError) {
            dnsFailureCount++;
          }
          
          if ((isDnsError || isTimeoutError) && retryCount < maxRetries) {
            const delay = Math.min(Math.pow(2, retryCount + 1) * 1000, 5000);
            console.log(`Retrying ${endpoint.url} in ${delay}ms... (attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return tryEndpointWithFallback(endpoint, headers, retryCount + 1);
          }
          
          return {
            success: false,
            error: errorMessage,
            isDnsError,
            isTimeoutError,
            retryCount,
            method: retryCount === 0 ? 'direct' : 'retry'
          };
        }
      };
      
      // Try each regional endpoint with enhanced retry logic and diagnostics
      for (const endpoint of regionalEndpoints) {
        console.log(`[${timestamp}] Trying endpoint: ${endpoint.url} (${endpoint.region})`);
        
        const headers = {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'User-Agent': 'PPC-Pal/1.0 Amazon-API-Client',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        };
        
        const startTime = Date.now();
        const result = await tryEndpointWithFallback(endpoint, headers);
        const endTime = Date.now();
        
        console.log(`[${timestamp}] Endpoint ${endpoint.url} result:`, JSON.stringify({
          success: result.success,
          profileCount: result.profiles?.length || 0,
          httpStatus: result.status,
          error: result.error,
          isDnsError: result.isDnsError,
          isTimeoutError: result.isTimeoutError,
          responseTime: endTime - startTime,
          method: result.method,
          retryCount: result.retryCount || 0,
          timestamp
        }, null, 2));
        
        if (result.success) {
          console.log(`[${timestamp}] ${endpoint.url} profiles found:`, result.profiles.length);
          
          endpointResults.push({
            endpoint: endpoint.url,
            region: endpoint.region,
            status: 'success',
            profileCount: result.profiles.length,
            profiles: result.profiles,
            method: result.method,
            httpStatus: result.status
          });
          
          if (result.profiles && result.profiles.length > 0) {
            // Add endpoint info to each profile for future API calls
            profiles.push(...result.profiles.map(profile => ({
              ...profile,
              advertisingApiEndpoint: endpoint.url,
              region: endpoint.region
            })));
          }
          
          successfulEndpoints++;
        } else {
          console.log(`${endpoint.url} failed:`, result.error);
          
          endpointResults.push({
            endpoint: endpoint.url,
            region: endpoint.region,
            status: 'failed',
            error: result.error,
            isDnsError: result.isDnsError,
            isTimeoutError: result.isTimeoutError,
            retryCount: result.retryCount,
            method: result.method,
            httpStatus: result.status
          });
        }
      }
      
      console.log(`[${timestamp}] Endpoint diagnostics:`, JSON.stringify({
        totalEndpoints: regionalEndpoints.length,
        successfulEndpoints,
        dnsFailureCount,
        totalProfiles: profiles.length,
        totalAttempts,
        endpointBreakdown: endpointResults.map(r => ({
          region: r.region,
          status: r.status,
          profileCount: r.profileCount || 0,
          error: r.error ? r.error.substring(0, 100) : null,
          isDnsError: r.isDnsError,
          isTimeoutError: r.isTimeoutError,
          httpStatus: r.httpStatus,
          method: r.method
        })),
        timestamp
      }, null, 2));

      console.log(`[${timestamp}] Total profiles found across all regions:`, profiles.length);

      // Handle case where no profiles are returned with detailed diagnostics
      if (!profiles || profiles.length === 0) {
        console.warn(`[${timestamp}] No Amazon Advertising profiles found for user:`, user.id);
        console.warn(`[${timestamp}] This usually means:`);
        console.warn(`[${timestamp}] 1. User does not have an active Amazon Advertising account`);
        console.warn(`[${timestamp}] 2. User has not granted sufficient permissions`);
        console.warn(`[${timestamp}] 3. User account is not eligible for Advertising API access`);
        console.warn(`[${timestamp}] 4. Temporary network/DNS issues connecting to Amazon endpoints`);
        
        // Analyze the actual failure patterns
        const dnsIssues = endpointResults.filter(r => r.status === 'failed' && r.isDnsError);
        const networkIssues = endpointResults.filter(r => r.status === 'failed' && r.isNetworkError);
        const successfulConnections = endpointResults.filter(r => r.status === 'success');
        const hasAnyDnsErrors = dnsIssues.length > 0;
        const hasMultipleDnsErrors = dnsIssues.length >= 2;
        const noSuccessfulConnections = successfulConnections.length === 0;
        
        let errorMessage: string;
        let diagnostics: any = {
          endpointResults,
          successfulEndpoints,
          dnsFailureCount,
          analysisTimestamp: new Date().toISOString()
        };
        
        if (hasMultipleDnsErrors && noSuccessfulConnections) {
          // Multiple DNS failures suggest infrastructure issue
          errorMessage = 'Network connectivity issues preventing connection to Amazon\'s advertising servers. This appears to be a temporary infrastructure problem affecting multiple regions. Please try again in 5-10 minutes.';
          diagnostics.issueType = 'infrastructure_dns';
          diagnostics.recommendation = 'retry_later';
          diagnostics.userAction = 'Wait 5-10 minutes and try connecting again. If the issue persists, contact support.';
        } else if (hasAnyDnsErrors && successfulConnections.length > 0) {
          // Mixed results - some endpoints work, others don't
          errorMessage = `Some Amazon advertising regions are temporarily unavailable (${dnsFailureCount} of ${regionalEndpoints.length} failed), but we successfully connected to ${successfulConnections.length} region(s). However, no advertising profiles were found in the available regions.`;
          diagnostics.issueType = 'partial_connectivity';
          diagnostics.recommendation = 'check_account_permissions';
          diagnostics.userAction = 'Verify your Amazon Advertising account is active and you have granted advertising permissions during sign-in.';
        } else if (successfulConnections.length > 0) {
          // Successful connections but no profiles - likely account/permission issue
          errorMessage = `Successfully connected to Amazon's servers (${successfulConnections.length} of ${regionalEndpoints.length} regions), but no advertising profiles were found. This usually means you don't have an active Amazon Advertising account or haven't granted sufficient permissions.`;
          diagnostics.issueType = 'no_advertising_account';
          diagnostics.recommendation = 'setup_advertising_account';
        } else {
          // Complete failure but not DNS-related
          errorMessage = 'Unable to connect to Amazon\'s advertising servers. This may be a temporary issue or a problem with your account permissions.';
          diagnostics.issueType = 'general_connectivity';
          diagnostics.recommendation = 'retry_and_check_permissions';
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'No Amazon Advertising profiles found',
            details: errorMessage,
            profileCount: 0,
            requiresSetup: true,
            isTemporary: hasAnyDnsErrors || noSuccessfulConnections,
            diagnostics
          }),
          { 
            status: 200, // Not a server error, but a setup issue
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Enhanced profile detection for major English-speaking markets
      function isSupportedProfile(profile: any) {
        const cc = (profile.countryCode || profile.country || '').toUpperCase();
        const currency = (profile.currencyCode || '').toUpperCase();
        const mk = (profile.marketplaceString || profile.marketplace || profile.accountInfo?.marketplaceString || '').toLowerCase();
        const name = (profile.accountInfo?.name || '').toLowerCase();
        
        // Support major English-speaking markets
        const supportedCountries = ['GB', 'UK', 'US', 'CA', 'AU'];
        const supportedCurrencies = ['GBP', 'USD', 'CAD', 'AUD'];
        
        // UK detection
        const hasUKDomain = mk.includes('.co.uk') || mk.includes('united kingdom');
        const hasUKToken = /\buk\b/.test(mk) || /\buk\b/.test(name);
        const isUK = cc === 'GB' || cc === 'UK' || currency === 'GBP' || hasUKDomain || hasUKToken;
        
        // US detection
        const hasUSDomain = mk.includes('.com') && !mk.includes('.co.uk') && !mk.includes('.ca') && !mk.includes('.au');
        const isUS = cc === 'US' || currency === 'USD' || hasUSDomain;
        
        // Canada detection  
        const hasCaDomain = mk.includes('.ca') || mk.includes('canada');
        const isCA = cc === 'CA' || currency === 'CAD' || hasCaDomain;
        
        // Australia detection
        const hasAuDomain = mk.includes('.au') || mk.includes('australia');
        const isAU = cc === 'AU' || currency === 'AUD' || hasAuDomain;
        
        return {
          isSupported: isUK || isUS || isCA || isAU,
          marketplace: isUK ? 'UK' : isUS ? 'US' : isCA ? 'CA' : isAU ? 'AU' : 'UNKNOWN',
          countryCode: cc,
          currency: currency
        };
      }

      // Log all found profiles for debugging
      console.log(`[${timestamp}] Analyzing ${profiles.length} total profiles:`);
      profiles.forEach((profile, index) => {
        const analysis = isSupportedProfile(profile);
        console.log(`[${timestamp}] Profile ${index + 1}:`, JSON.stringify({
          profileId: profile.profileId,
          countryCode: profile.countryCode || profile.country,
          currency: profile.currencyCode,
          marketplace: profile.marketplaceString || profile.marketplace,
          accountName: profile.accountInfo?.name,
          region: profile.region,
          analysis: analysis
        }, null, 2));
      });

      const validProfiles = profiles
        .map((p: any) => {
          const analysis = isSupportedProfile(p);
          return { ...p, _analysis: analysis };
        })
        .filter((p: any) => p._analysis.isSupported);

      console.log(`[${timestamp}] Supported profiles found:`, validProfiles.length);

      if (!validProfiles || validProfiles.length === 0) {
        const foundCountryCodes = Array.from(new Set(profiles.map((p: any) => (p.countryCode || p.country || '').toUpperCase()).filter(Boolean)));
        const foundCurrencies = Array.from(new Set(profiles.map((p: any) => (p.currencyCode || '').toUpperCase()).filter(Boolean)));
        const marketplaces = Array.from(new Set(profiles.map((p: any) => (p.marketplaceString || p.marketplace || '').toLowerCase()).filter(Boolean))).slice(0, 10);
        const rejectedProfiles = profiles.map(p => {
          const analysis = isSupportedProfile(p);
          return {
            profileId: p.profileId,
            countryCode: p.countryCode || p.country,
            currency: p.currencyCode,
            marketplace: p.marketplaceString || p.marketplace,
            reason: analysis.isSupported ? 'accepted' : 'unsupported marketplace'
          };
        });
        
        console.warn(`[${timestamp}] No supported profiles found. Supported markets: US, UK, CA, AU`);
        console.warn(`[${timestamp}] Found countries:`, foundCountryCodes, 'currencies:', foundCurrencies);
        console.warn(`[${timestamp}] Rejected profiles:`, JSON.stringify(rejectedProfiles, null, 2));
        
        return new Response(
          JSON.stringify({ 
            error: 'No supported advertising profiles found',
            details: `We found ${profiles.length} advertising profile(s) but none are from supported marketplaces (US, UK, Canada, Australia). Currently supported: USD, GBP, CAD, AUD currencies.`,
            profileCount: profiles.length,
            foundCountryCodes,
            foundCurrencies,
            marketplacesSample: marketplaces,
            rejectedProfiles: rejectedProfiles.slice(0, 5), // Show first 5 for debugging
            supportedMarkets: ['United States (USD)', 'United Kingdom (GBP)', 'Canada (CAD)', 'Australia (AUD)'],
            requiresSetup: true
          }),
          { 
            status: 200, // Setup issue, not a server error
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // First set the encryption key for this session (do this once before processing profiles)
      console.log('Setting encryption key for session...');
      const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
      if (!encryptionKey) {
        console.error('ENCRYPTION_KEY environment variable not set');
        throw new Error('ENCRYPTION_KEY not configured');
      }
      
      // Encryption key retrieved; will pass directly to DB function
      console.log('Encryption key retrieved; passing directly to DB function');

      // Store connection for each supported profile
      for (const profile of validProfiles) {
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
        
        // Get the marketplace from profile analysis
        const detectedMarketplace = profile._analysis?.marketplace || 'US';
        const marketplaceId = profile.countryCode || profile.country || detectedMarketplace;
        
        console.log(`[${timestamp}] Storing connection for profile:`, {
          profileId: profile.profileId,
          marketplace: detectedMarketplace,
          marketplaceId: marketplaceId,
          region: profile.region,
          countryCode: profile.countryCode,
          currency: profile.currencyCode,
          endpoint: profile.advertisingApiEndpoint
        });
        
        // Store connection data (without tokens)
        const connectionData = {
          user_id: user.id,
          profile_id: profile.profileId.toString(),
          profile_name: profile.accountInfo?.name || `Profile ${profile.profileId}`,
          marketplace_id: marketplaceId.toUpperCase(),
          token_expires_at: expiresAt.toISOString(),
          status: 'active' as const,
          advertising_api_endpoint: profile.advertisingApiEndpoint || 'https://advertising-api.amazon.com',
        };
        
        const { data: connection, error: insertError } = await supabase
          .from('amazon_connections')
          .upsert(connectionData, { onConflict: 'user_id, profile_id' })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error storing connection for profile:', profile.profileId, insertError.message)
          throw insertError
        }

        // Store tokens securely in private schema
        console.log('Storing tokens for profile:', profile.profileId);
        const { error: tokenError } = await supabase
          .rpc('store_tokens_with_key', {
            p_user_id: user.id,
            p_profile_id: profile.profileId.toString(),
            p_access_token: tokenData.access_token,
            p_refresh_token: tokenData.refresh_token,
            p_expires_at: expiresAt.toISOString(),
            p_encryption_key: encryptionKey
          });

        if (tokenError) {
          console.error('Error storing tokens for profile:', profile.profileId, tokenError);
          console.error('Full token error details:', {
            message: tokenError.message,
            details: tokenError.details,
            hint: tokenError.hint,
            code: tokenError.code
          });
          throw tokenError;
        }
        
        console.log('Successfully stored tokens for profile:', profile.profileId);
        
        // Clear any stale error flags after successful reconnection
        await supabase
          .from('amazon_connections')
          .update({ 
            setup_required_reason: null,
            health_status: 'healthy'
          })
          .eq('user_id', user.id)
          .eq('profile_id', profile.profileId.toString());
      }

      console.log(`Successfully stored connections for user: ${user.id} across ${validProfiles.length} marketplace(s)`)
      
      // Automatically trigger sync for the newly connected profiles
      console.log('🚀 Auto-triggering sync for newly connected profiles...')
      for (const profile of validProfiles) {
        try {
          // Find the connection ID for this profile
          const { data: connection } = await supabase
            .from('amazon_connections')
            .select('id')
            .eq('user_id', user.id)
            .eq('profile_id', profile.profileId.toString())
            .single()
          
          if (connection?.id) {
            // First trigger entity sync for campaign/ad group names
            const entitySyncUrl = `entities-sync-runner?connectionId=${connection.id}&entity=all&mode=incremental`
            console.log(`🏷️ [OAuth] Triggering entity sync for connection ${connection.id}`)
            console.log(`🏷️ [OAuth] Entity sync URL: ${entitySyncUrl}`)
            console.log(`🏷️ [OAuth] Profile ID: ${profile.profileId}, Marketplace: ${profile.countryCode}`)
            
            supabase.functions.invoke(entitySyncUrl, {
              headers: {
                Authorization: authHeader!
              }
            }).then(result => {
              console.log(`✅ [OAuth] Entity sync response for connection ${connection.id}:`, JSON.stringify(result, null, 2))
              if (result.error) {
                console.error(`❌ [OAuth] Entity sync error details:`, result.error)
              }
            }).catch(error => {
              console.error(`⚠️ [OAuth] Entity sync invocation failed for connection ${connection.id}:`)
              console.error(`⚠️ [OAuth] Error type: ${error?.constructor?.name}`)
              console.error(`⚠️ [OAuth] Error message: ${error?.message}`)
              console.error(`⚠️ [OAuth] Full error:`, JSON.stringify(error, null, 2))
            })
            
            // Then trigger data sync for 90-day backfill (initial connection gets full history)
            console.log(`📊 Triggering 90-day data sync for connection ${connection.id}...`)
            supabase.functions.invoke('sync-amazon-data', {
              body: { 
                connectionId: connection.id,
                dateRangeDays: 90,
                timeUnit: 'DAILY',
                diagnosticMode: false
              },
              headers: {
                Authorization: authHeader!
              }
            }).then(result => {
              console.log(`✅ 90-day sync triggered for connection ${connection.id}:`, result)
            }).catch(error => {
              console.log(`⚠️ 90-day sync failed for connection ${connection.id}:`, error)
            })

            // Note: Amazon Ads API only retains ~60-90 days of historical data
            // The 90-day sync above covers all available data
            console.log(`✅ 90-day historical sync initiated for profile ${profile.profileId} - this is the maximum data Amazon retains`)
          }
        } catch (error) {
          console.log('Failed to trigger auto-sync for profile:', profile.profileId, (error as Error).message)
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          profileCount: validProfiles.length,
          syncStarted: true,
          message: `Connected ${validProfiles.length} profile(s) and started data sync`,
          marketplaces: validProfiles.map(p => p._analysis.marketplace)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.error('Invalid action provided:', action);
    throw new Error('Invalid action')

  } catch (error) {
    console.error('Amazon OAuth error:', (error as Error)?.message);
    console.error('Full error:', error);
    const message = (error as Error)?.message || 'Unknown error'
    let code = 'OAUTH_ERROR'
    let userMessage = message;
    
    // Classify error types for better user messaging
    if (message.includes('No authorization header')) {
      code = 'NO_AUTH'
    } else if (message.includes('Invalid authorization')) {
      code = 'INVALID_AUTH'  
    } else if (message.includes('Amazon Client ID not configured')) {
      code = 'MISSING_AMAZON_CLIENT_ID'
    } else if (message.includes('Amazon credentials not configured')) {
      code = 'MISSING_AMAZON_CREDENTIALS'
    } else if (message.includes('Invalid JSON body')) {
      code = 'INVALID_JSON'
    } else if (message.includes('dns error') || message.includes('failed to lookup address')) {
      code = 'DNS_ERROR'
      userMessage = 'Temporary connection issue with Amazon\'s servers. Please try again in a few minutes.'
    } else if (message.includes('timeout') || message.includes('network')) {
      code = 'NETWORK_ERROR'
      userMessage = 'Network timeout connecting to Amazon. Please check your connection and try again.'
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        code,
        error: userMessage,
        originalError: message // Keep original for debugging
      }),
      { 
        status: code === 'DNS_ERROR' || code === 'NETWORK_ERROR' ? 503 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
