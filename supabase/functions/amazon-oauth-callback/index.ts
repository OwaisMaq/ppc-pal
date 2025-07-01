
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
    const { code, state } = await req.json();
    
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    if (!amazonClientId || !amazonClientSecret) {
      throw new Error('Amazon credentials not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error('Invalid authentication');
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${req.headers.get('origin')}/auth/amazon/callback`,
        client_id: amazonClientId,
        client_secret: amazonClientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get advertising profiles
    const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Amazon-Advertising-API-ClientId': amazonClientId,
      },
    });

    let profiles = [];
    let profileId = 'setup_required_no_profiles_found';
    let profileName = 'Setup Required';
    let marketplaceId = 'US';

    if (profilesResponse.ok) {
      profiles = await profilesResponse.json();
      console.log('Found advertising profiles:', profiles.length);
      
      if (profiles.length > 0) {
        const activeProfile = profiles[0];
        profileId = activeProfile.profileId.toString();
        profileName = activeProfile.accountInfo?.name || `Profile ${activeProfile.profileId}`;
        marketplaceId = activeProfile.countryCode || 'US';
      }
    } else {
      console.log('No advertising profiles found or API call failed');
    }

    // Store connection in database
    const { data: connection, error: dbError } = await supabase
      .from('amazon_connections')
      .insert({
        user_id: userData.user.id,
        profile_id: profileId,
        profile_name: profileName,
        marketplace_id: marketplaceId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        status: profiles.length > 0 ? 'active' : 'error',
        last_sync_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Amazon connection saved successfully');

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
    console.error('Error in amazon-oauth-callback:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
