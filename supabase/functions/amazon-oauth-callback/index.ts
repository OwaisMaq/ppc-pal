
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache to prevent duplicate processing
const processedCallbacks = new Map<string, Promise<any>>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Amazon OAuth Callback Started ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request body format',
          details: 'Request body must be valid JSON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const { code, state } = requestBody;
    console.log('=== OAuth Callback Parameters ===');
    console.log('Authorization code present:', !!code);
    console.log('State parameter present:', !!state);
    console.log('Authorization code length:', code?.length || 0);
    console.log('State parameter:', state);
    
    if (!code) {
      console.error('No authorization code provided');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authorization code is required',
          details: 'No authorization code received from Amazon'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!state) {
      console.error('No state parameter provided');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'State parameter is required for security',
          details: 'Security validation failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Check for duplicate processing
    const cacheKey = `${code}-${state}`;
    console.log('Cache key:', cacheKey);
    
    if (processedCallbacks.has(cacheKey)) {
      console.log('=== Duplicate Callback Detected ===');
      console.log('Callback already being processed, waiting for result...');
      try {
        const result = await processedCallbacks.get(cacheKey);
        console.log('Duplicate callback resolved with cached result');
        return new Response(
          JSON.stringify(result),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      } catch (cachedError) {
        console.error('Cached callback failed:', cachedError);
        processedCallbacks.delete(cacheKey);
        // Continue with fresh processing
      }
    }
    
    // Create promise for this callback and cache it
    const callbackPromise = processOAuthCallback(code, state, req);
    processedCallbacks.set(cacheKey, callbackPromise);
    
    try {
      const result = await callbackPromise;
      console.log('=== Callback Processing Completed ===');
      console.log('Final result:', result);
      
      // Clean up cache after successful processing
      processedCallbacks.delete(cacheKey);
      
      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (error) {
      console.error('=== Callback Processing Failed ===');
      console.error('Error:', error);
      
      // Clean up cache on error
      processedCallbacks.delete(cacheKey);
      
      const errorResponse = {
        success: false,
        error: 'OAuth callback processing failed',
        details: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      };
      
      return new Response(
        JSON.stringify(errorResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('=== Amazon OAuth Callback Error ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    
    const errorResponse = {
      success: false,
      error: 'Server error',
      details: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };
    
    console.log('Error response:', errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processOAuthCallback(code: string, state: string, req: Request) {
  console.log('=== Starting OAuth Callback Processing ===');
  
  // Environment variables check
  console.log('=== Environment Variables Check ===');
  const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
  const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
  
  console.log('Amazon credentials configured:', {
    clientId: !!amazonClientId,
    clientSecret: !!amazonClientSecret,
    clientIdLength: amazonClientId?.length || 0,
    clientSecretLength: amazonClientSecret?.length || 0
  });
  
  if (!amazonClientId || !amazonClientSecret) {
    console.error('Missing Amazon credentials');
    throw new Error('Amazon credentials not configured on server');
  }

  // Supabase setup
  console.log('=== Supabase Setup ===');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  console.log('Supabase configuration:', {
    url: !!supabaseUrl,
    serviceKey: !!supabaseKey
  });

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    throw new Error('Server configuration incomplete');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client created successfully');

  // User authentication
  console.log('=== User Authentication ===');
  const authHeader = req.headers.get('authorization');
  console.log('Auth header present:', !!authHeader);
  
  if (!authHeader) {
    console.error('No authorization header provided');
    throw new Error('Authentication required - please log in');
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('Token extracted, length:', token.length);
  
  let userData;
  try {
    const { data: userAuthData, error: userError } = await supabase.auth.getUser(token);
    
    console.log('User authentication result:', {
      success: !userError,
      userId: userAuthData?.user?.id,
      userEmail: userAuthData?.user?.email,
      error: userError?.message
    });
    
    if (userError || !userAuthData.user) {
      console.error('Authentication failed:', userError);
      throw new Error(`Authentication failed: ${userError?.message || 'Invalid session'}`);
    }

    userData = userAuthData;
    console.log('User authenticated successfully:', userData.user.id);
  } catch (authError) {
    console.error('Authentication process failed:', authError);
    throw new Error(`Authentication error: ${authError.message}`);
  }

  // Token exchange
  console.log('=== Starting Token Exchange ===');
  const redirectUri = 'https://ppcpal.online/amazon-callback';
  console.log('Using redirect URI for token exchange:', redirectUri);
  
  const tokenRequestBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: amazonClientId,
    client_secret: amazonClientSecret,
  });

  console.log('Token request parameters:', {
    grant_type: 'authorization_code',
    code: code.substring(0, 10) + '...',
    redirect_uri: redirectUri,
    client_id: amazonClientId.substring(0, 8) + '...',
    client_secret: '[REDACTED]'
  });

  let tokenResponse;
  try {
    console.log('Making token exchange request...');
    tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PPCPal/1.0'
      },
      body: tokenRequestBody,
    });

    console.log('Token exchange response status:', tokenResponse.status);
    console.log('Token exchange response headers:', Object.fromEntries(tokenResponse.headers.entries()));
  } catch (fetchError) {
    console.error('Token exchange network error:', fetchError);
    throw new Error(`Network error during token exchange: ${fetchError.message}`);
  }

  let tokenData;
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange failed:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      errorBody: errorText
    });
    throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorText}`);
  }

  try {
    tokenData = await tokenResponse.json();
    console.log('Token exchange successful:', {
      access_token_present: !!tokenData.access_token,
      refresh_token_present: !!tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type
    });
  } catch (jsonError) {
    console.error('Failed to parse token response:', jsonError);
    throw new Error('Invalid token response format from Amazon');
  }

  if (!tokenData.access_token) {
    console.error('No access token in response:', tokenData);
    throw new Error('No access token received from Amazon');
  }

  // Fetch advertising profiles
  console.log('=== Fetching Advertising Profiles ===');
  let profilesResponse;
  try {
    profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Amazon-Advertising-API-ClientId': amazonClientId,
        'User-Agent': 'PPCPal/1.0'
      },
    });

    console.log('Profiles API response status:', profilesResponse.status);
    console.log('Profiles API response headers:', Object.fromEntries(profilesResponse.headers.entries()));
  } catch (profilesFetchError) {
    console.error('Network error fetching profiles:', profilesFetchError);
    console.log('Continuing without profiles - user may need to set up Amazon Advertising');
  }

  let profiles = [];
  let profileId = 'setup_required_no_profiles_found';
  let profileName = 'Setup Required - No Advertising Profiles';
  let marketplaceId = 'US';

  if (profilesResponse && profilesResponse.ok) {
    try {
      profiles = await profilesResponse.json();
      console.log('Found advertising profiles:', {
        count: profiles.length,
        profiles: profiles.map(p => ({ 
          id: p.profileId, 
          name: p.accountInfo?.name,
          countryCode: p.countryCode,
          type: p.accountInfo?.type
        }))
      });
      
      if (profiles.length > 0) {
        const activeProfile = profiles[0];
        profileId = activeProfile.profileId.toString();
        profileName = activeProfile.accountInfo?.name || `Profile ${activeProfile.profileId}`;
        marketplaceId = activeProfile.countryCode || 'US';
        console.log('Using profile:', { profileId, profileName, marketplaceId });
      } else {
        console.log('No advertising profiles found - user needs to set up Amazon Advertising');
      }
    } catch (profilesJsonError) {
      console.error('Failed to parse profiles response:', profilesJsonError);
      console.log('Continuing with setup-required profile');
    }
  } else if (profilesResponse) {
    const errorText = await profilesResponse.text();
    console.log('Profiles API failed:', {
      status: profilesResponse.status,
      statusText: profilesResponse.statusText,
      errorBody: errorText
    });
    console.log('Continuing with setup-required profile');
  }

  // Save connection to database
  console.log('=== Saving Connection to Database ===');
  const connectionData = {
    user_id: userData.user.id,
    profile_id: profileId,
    profile_name: profileName,
    marketplace_id: marketplaceId,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
    status: 'active', // Always mark as active, let the UI handle setup requirements
    last_sync_at: null, // Will be set when first sync happens
  };

  console.log('Connection data to save:', {
    user_id: connectionData.user_id,
    profile_id: connectionData.profile_id,
    profile_name: connectionData.profile_name,
    marketplace_id: connectionData.marketplace_id,
    status: connectionData.status,
    token_expires_at: connectionData.token_expires_at,
    has_access_token: !!connectionData.access_token,
    has_refresh_token: !!connectionData.refresh_token
  });

  // Check for existing connections
  console.log('=== Checking for Existing Connections ===');
  let existingConnections;
  try {
    const { data: existingData, error: checkError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('profile_id', profileId);

    console.log('Existing connections check result:', {
      success: !checkError,
      existingCount: existingData?.length || 0,
      error: checkError?.message
    });

    if (checkError) {
      console.error('Error checking existing connections:', checkError);
      throw new Error(`Database query failed: ${checkError.message}`);
    }

    existingConnections = existingData;
  } catch (dbError) {
    console.error('Database connection check failed:', dbError);
    throw new Error(`Failed to check existing connections: ${dbError.message}`);
  }

  // Insert or update connection
  console.log('=== Database Operation ===');
  let connection;
  let dbError;

  try {
    if (existingConnections && existingConnections.length > 0) {
      console.log('Updating existing connection:', existingConnections[0].id);
      const { data: updatedConnection, error: updateError } = await supabase
        .from('amazon_connections')
        .update(connectionData)
        .eq('id', existingConnections[0].id)
        .select()
        .single();
      
      connection = updatedConnection;
      dbError = updateError;
      console.log('Update operation result:', { success: !updateError, connectionId: connection?.id });
    } else {
      console.log('Creating new connection...');
      const { data: newConnection, error: insertError } = await supabase
        .from('amazon_connections')
        .insert(connectionData)
        .select()
        .single();
      
      connection = newConnection;
      dbError = insertError;
      console.log('Insert operation result:', { success: !insertError, connectionId: connection?.id });
    }

    if (dbError) {
      console.error('Database operation error:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      });
      throw new Error(`Database operation failed: ${dbError.message}`);
    }

    if (!connection) {
      console.error('No connection data returned from database operation');
      throw new Error('Failed to save connection - no data returned');
    }

    console.log('=== Connection Saved Successfully ===');
    console.log('Final connection ID:', connection.id);
  } catch (saveError) {
    console.error('Failed to save connection:', saveError);
    throw new Error(`Connection save failed: ${saveError.message}`);
  }

  // Verification query
  console.log('=== Verifying Saved Connection ===');
  try {
    const { data: verificationData, error: verificationError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', userData.user.id);

    console.log('Verification query result:', {
      success: !verificationError,
      connectionsFound: verificationData?.length || 0,
      connections: verificationData?.map(c => ({ 
        id: c.id, 
        profile_id: c.profile_id, 
        status: c.status,
        profile_name: c.profile_name
      })),
      error: verificationError?.message
    });
  } catch (verificationError) {
    console.error('Verification query failed:', verificationError);
    // Don't throw here, just log the warning
  }

  console.log('=== OAuth Callback Completed Successfully ===');
  const successResponse = { 
    success: true, 
    profileCount: profiles.length,
    connection: {
      id: connection.id,
      profile_name: connection.profile_name,
      marketplace_id: connection.marketplace_id,
      status: connection.status,
      needs_setup: profiles.length === 0
    },
    message: profiles.length > 0 
      ? `Successfully connected with ${profiles.length} advertising profile(s)`
      : 'Connected to Amazon - please set up advertising profiles to sync campaigns',
    timestamp: new Date().toISOString()
  };

  console.log('Success response:', successResponse);
  return successResponse;
}
