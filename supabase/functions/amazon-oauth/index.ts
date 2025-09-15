
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple AES-GCM helpers for token encryption at rest
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function getKey() {
  const secret = Deno.env.get('ENCRYPTION_KEY');
  if (!secret) {
    throw new Error('ENCRYPTION_KEY not set');
  }
  const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptText(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plain));
  return `${toBase64(iv)}:${toBase64(new Uint8Array(buf))}`;
}
export async function decryptText(enc: string): Promise<string> {
  if (!enc || !enc.includes(':')) throw new Error('Invalid ciphertext format');
  const [ivB64, dataB64] = enc.split(':');
  const iv = fromBase64(ivB64);
  const key = await getKey();
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(dataB64));
  return textDecoder.decode(buf);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Amazon OAuth function called with method:', req.method);
    
    // Check environment variables
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    console.log('Environment check:', {
      hasEncryptionKey: !!encryptionKey,
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasAmazonClientId: !!Deno.env.get('AMAZON_CLIENT_ID'),
      hasAmazonClientSecret: !!Deno.env.get('AMAZON_CLIENT_SECRET')
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
      console.log('Request body received:', { 
        action: requestBody.action,
        hasCode: !!requestBody.code,
        hasState: !!requestBody.state,
        hasRedirectUri: !!requestBody.redirectUri
      });
    } catch (jsonError) {
      console.error('Failed to parse JSON body:', jsonError.message);
      throw new Error('Invalid JSON body');
    }

    const { action, code, state } = requestBody;
    console.log('Amazon OAuth action:', action)

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
      
      console.log('OAuth state validated for user:', oauthState.user_id);
      
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
      
      if (!clientId || !clientSecret) {
        console.error('Amazon credentials not configured');
        throw new Error('Amazon credentials not configured')
      }

      console.log('Exchanging code for tokens using stored redirect URI...');
      
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

      console.log('Token response status:', tokenResponse.status);

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
      console.log('Token exchange successful, access token length:', tokenData.access_token?.length || 0)

      // Get profile information - try multiple regional endpoints
      console.log('Fetching Amazon profiles...');
      
      const regionalEndpoints = [
        'https://advertising-api.amazon.com',     // North America
        'https://advertising-api.eu.amazon.com', // Europe (FIXED - was advertising-api-eu)
        'https://advertising-api.fe.amazon.com'  // Far East (FIXED - was advertising-api-fe)
      ];
      
      let profileResponse;
      let profiles = [];
      
      // Try each regional endpoint until we find profiles
      for (const endpoint of regionalEndpoints) {
        console.log(`Trying endpoint: ${endpoint}`);
        
        try {
          profileResponse = await fetch(`${endpoint}/v2/profiles`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Amazon-Advertising-API-ClientId': clientId,
            },
          });
          
          console.log(`${endpoint} response status:`, profileResponse.status);
          
          if (profileResponse.ok) {
            const endpointProfiles = await profileResponse.json();
            console.log(`${endpoint} profiles found:`, endpointProfiles.length);
            
            if (endpointProfiles && endpointProfiles.length > 0) {
              // Add endpoint info to each profile for future API calls
              profiles.push(...endpointProfiles.map(profile => ({
                ...profile,
                advertisingApiEndpoint: endpoint
              })));
            }
          } else {
            const errorText = await profileResponse.text();
            console.log(`${endpoint} error:`, profileResponse.status, errorText);
          }
        } catch (error) {
          console.log(`${endpoint} request failed:`, error.message);
        }
      }

      console.log('Total profiles found across all regions:', profiles.length);

      // Handle case where no profiles are returned
      if (!profiles || profiles.length === 0) {
        console.warn('No Amazon Advertising profiles found for user:', user.id);
        console.warn('This usually means:');
        console.warn('1. User does not have an active Amazon Advertising account');
        console.warn('2. User has not granted sufficient permissions');
        console.warn('3. User account is not eligible for Advertising API access');
        
        return new Response(
          JSON.stringify({ 
            error: 'No Amazon Advertising profiles found',
            details: 'This account may not have access to Amazon Advertising, or insufficient permissions were granted. Please ensure you have an active Amazon Advertising account and grant all requested permissions.',
            profileCount: 0,
            requiresSetup: true
          }),
          { 
            status: 200, // Not a server error, but a setup issue
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Robust UK profile detection across EU endpoint results
      function isUKProfile(profile: any) {
        const cc = (profile.countryCode || profile.country || '').toUpperCase();
        const currency = (profile.currencyCode || '').toUpperCase();
        const mk = (profile.marketplaceString || profile.marketplace || profile.accountInfo?.marketplaceString || '').toLowerCase();
        const name = (profile.accountInfo?.name || '').toLowerCase();
        const hasUKDomain = mk.includes('.co.uk') || mk.includes('united kingdom');
        const hasUKToken = /\buk\b/.test(mk) || /\buk\b/.test(name);
        return cc === 'GB' || cc === 'UK' || currency === 'GBP' || hasUKDomain || hasUKToken;
      }

      const ukProfiles = profiles
        .map((p: any) => ({ ...p, _isUK: isUKProfile(p) }))
        .filter((p: any) => p._isUK);

      console.log('UK profiles found (robust match):', ukProfiles.length)

      if (!ukProfiles || ukProfiles.length === 0) {
        const foundCountryCodes = Array.from(new Set(profiles.map((p: any) => (p.countryCode || p.country || '').toUpperCase()).filter(Boolean)));
        const foundCurrencies = Array.from(new Set(profiles.map((p: any) => (p.currencyCode || '').toUpperCase()).filter(Boolean)));
        const marketplaces = Array.from(new Set(profiles.map((p: any) => (p.marketplaceString || p.marketplace || '').toLowerCase()).filter(Boolean))).slice(0, 10);
        console.warn('No UK profile matched. Found countries:', foundCountryCodes, 'currencies:', foundCurrencies, 'marketplaces sample:', marketplaces);
        return new Response(
          JSON.stringify({ 
            error: 'No UK profile found',
            details: 'We could not confidently detect a UK profile. We look for GB/UK country, GBP currency, or .co.uk/United Kingdom in marketplace.',
            profileCount: profiles.length,
            foundCountryCodes,
            foundCurrencies,
            marketplacesSample: marketplaces,
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

      // Store connection for each UK profile only
      for (const profile of ukProfiles) {
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
        
        console.log('Storing UK connection for profile:', profile.profileId)
        
        // Store connection data (without tokens)
        const connectionData = {
          user_id: user.id,
          profile_id: profile.profileId.toString(),
          profile_name: profile.accountInfo?.name || `Profile ${profile.profileId}`,
          marketplace_id: 'GB',
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
      }

      console.log('Successfully stored UK connections for user:', user.id)
      
      // Automatically trigger sync for the newly connected profiles
      console.log('🚀 Auto-triggering sync for newly connected profiles...')
      for (const profile of ukProfiles) {
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
            console.log(`🏷️ Triggering entity sync for profile ${profile.profileId}...`)
            supabase.functions.invoke('entities-sync-runner', {
              body: { 
                profileId: profile.profileId.toString(),
                entity: 'all',
                mode: 'incremental'
              },
              headers: {
                Authorization: authHeader!
              }
            }).then(result => {
              console.log(`✅ Entity sync triggered for profile ${profile.profileId}:`, result)
            }).catch(error => {
              console.log(`⚠️ Entity sync failed for profile ${profile.profileId}:`, error)
            })
            
            // Then trigger data sync for 30-day backfill - don't await to avoid timeout
            console.log(`📊 Triggering data sync for connection ${connection.id}...`)
            supabase.functions.invoke('sync-amazon-data', {
              body: { 
                connectionId: connection.id,
                dateRangeDays: 30,
                timeUnit: 'DAILY',
                diagnosticMode: false
              },
              headers: {
                // Forward the user's auth so the sync function can authorize
                Authorization: authHeader!
              }
            }).then(result => {
              console.log(`✅ Auto-sync triggered for connection ${connection.id}:`, result)
            }).catch(error => {
              console.log(`⚠️ Auto-sync failed for connection ${connection.id}:`, error)
            })
          }
        } catch (error) {
          console.log('Failed to trigger auto-sync for profile:', profile.profileId, (error as Error).message)
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          profileCount: ukProfiles.length,
          syncStarted: true,
          message: `Connected ${ukProfiles.length} profile(s) and started data sync`
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
    if (message.includes('No authorization header')) code = 'NO_AUTH'
    else if (message.includes('Invalid authorization')) code = 'INVALID_AUTH'
    else if (message.includes('Amazon Client ID not configured')) code = 'MISSING_AMAZON_CLIENT_ID'
    else if (message.includes('Amazon credentials not configured')) code = 'MISSING_AMAZON_CREDENTIALS'
    else if (message.includes('Invalid JSON body')) code = 'INVALID_JSON'

    return new Response(
      JSON.stringify({ 
        success: false,
        code,
        error: message,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
