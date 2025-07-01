
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
    const { connectionId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    if (!amazonClientId) {
      throw new Error('Amazon Client ID not configured');
    }

    // Retry fetching advertising profiles
    const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Amazon-Advertising-API-ClientId': amazonClientId,
      },
    });

    let profiles = [];
    let profileId = 'setup_required_no_profiles_found';
    let profileName = 'Setup Required';
    let marketplaceId = 'US';

    if (profilesResponse.ok) {
      profiles = await profilesResponse.json();
      console.log('Retry found advertising profiles:', profiles.length);
      
      if (profiles.length > 0) {
        const activeProfile = profiles[0];
        profileId = activeProfile.profileId.toString();
        profileName = activeProfile.accountInfo?.name || `Profile ${activeProfile.profileId}`;
        marketplaceId = activeProfile.countryCode || 'US';
      }
    } else {
      console.log('Still no advertising profiles found on retry');
    }

    // Update connection with new profile information
    const { error: updateError } = await supabase
      .from('amazon_connections')
      .update({
        profile_id: profileId,
        profile_name: profileName,
        marketplace_id: marketplaceId,
        status: profiles.length > 0 ? 'active' : 'error',
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (updateError) {
      throw new Error(`Failed to update connection: ${updateError.message}`);
    }

    console.log('Amazon connection profile retry completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        profiles: profiles,
        profileCount: profiles.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in amazon-retry-profiles:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
