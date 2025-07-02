
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('=== Amazon OAuth Callback Started ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { code, state } = requestBody;
    console.log('Received callback with code:', !!code, 'state:', !!state);
    
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    console.log('Amazon credentials configured:', {
      clientId: !!amazonClientId,
      clientSecret: !!amazonClientSecret
    });
    
    if (!amazonClientId || !amazonClientSecret) {
      console.error('Missing Amazon credentials');
      throw new Error('Amazon credentials not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Supabase client created with URL:', supabaseUrl);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    console.log('User authentication result:', {
      success: !userError,
      userId: userData?.user?.id,
      userEmail: userData?.user?.email,
      error: userError?.message
    });
    
    if (userError || !userData.user) {
      console.error('Authentication failed:', userError);
      throw new Error('Invalid authentication');
    }

    console.log('=== Starting token exchange ===');
    // Exchange authorization code for access token - use the deployed URL consistently
    const redirectUri = 'https://ppcpal.online/amazon-callback';
    console.log('Using redirect URI for token exchange:', redirectUri);
    
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: amazonClientId,
        client_secret: amazonClientSecret,
      }),
    });

    console.log('Token exchange response status:', tokenResponse.status);
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful, expires in:', tokenData.expires_in);

    console.log('=== Fetching advertising profiles ===');
    // Get advertising profiles
    const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Amazon-Advertising-API-ClientId': amazonClientId,
      },
    });

    console.log('Profiles API response status:', profilesResponse.status);
    let profiles = [];
    let profileId = 'setup_required_no_profiles_found';
    let profileName = 'Setup Required';
    let marketplaceId = 'US';

    if (profilesResponse.ok) {
      profiles = await profilesResponse.json();
      console.log('Found advertising profiles:', profiles.length);
      console.log('Profile details:', profiles.map(p => ({ id: p.profileId, name: p.accountInfo?.name })));
      
      if (profiles.length > 0) {
        const activeProfile = profiles[0];
        profileId = activeProfile.profileId.toString();
        profileName = activeProfile.accountInfo?.name || `Profile ${activeProfile.profileId}`;
        marketplaceId = activeProfile.countryCode || 'US';
        console.log('Using profile:', { profileId, profileName, marketplaceId });
      }
    } else {
      const errorText = await profilesResponse.text();
      console.log('Profiles API failed:', profilesResponse.status, errorText);
    }

    console.log('=== Saving connection to database ===');
    const connectionData = {
      user_id: userData.user.id,
      profile_id: profileId,
      profile_name: profileName,
      marketplace_id: marketplaceId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      status: profiles.length > 0 ? 'active' : 'error',
      last_sync_at: new Date().toISOString(),
    };

    console.log('Connection data to save:', {
      user_id: connectionData.user_id,
      profile_id: connectionData.profile_id,
      profile_name: connectionData.profile_name,
      marketplace_id: connectionData.marketplace_id,
      status: connectionData.status,
      token_expires_at: connectionData.token_expires_at
    });

    // Check if connection already exists for this user and profile
    console.log('Checking for existing connections...');
    const { data: existingConnections, error: checkError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('profile_id', profileId);

    console.log('Existing connections check result:', {
      success: !checkError,
      existingCount: existingConnections?.length || 0,
      error: checkError?.message
    });

    if (checkError) {
      console.error('Error checking existing connections:', checkError);
    }

    // Store connection in database
    let connection;
    let dbError;

    if (existingConnections && existingConnections.length > 0) {
      console.log('Updating existing connection...');
      const { data: updatedConnection, error: updateError } = await supabase
        .from('amazon_connections')
        .update(connectionData)
        .eq('id', existingConnections[0].id)
        .select()
        .single();
      
      connection = updatedConnection;
      dbError = updateError;
    } else {
      console.log('Creating new connection...');
      const { data: newConnection, error: insertError } = await supabase
        .from('amazon_connections')
        .insert(connectionData)
        .select()
        .single();
      
      connection = newConnection;
      dbError = insertError;
    }

    console.log('Database operation result:', {
      success: !dbError,
      connectionId: connection?.id,
      error: dbError?.message,
      details: dbError?.details,
      hint: dbError?.hint,
      code: dbError?.code
    });

    if (dbError) {
      console.error('Database error details:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('=== Amazon connection saved successfully ===');
    console.log('Final connection ID:', connection.id);

    // Verify the connection was saved by querying it back
    console.log('=== Verifying saved connection ===');
    const { data: verificationData, error: verificationError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', userData.user.id);

    console.log('Verification query result:', {
      success: !verificationError,
      connectionsFound: verificationData?.length || 0,
      connections: verificationData?.map(c => ({ id: c.id, profile_id: c.profile_id, status: c.status })),
      error: verificationError?.message
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        profileCount: profiles.length,
        connection: connection 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('=== Error in amazon-oauth-callback ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
