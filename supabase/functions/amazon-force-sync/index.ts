
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
    console.log('=== Force Sync Started ===');
    console.log('Connection ID:', connectionId);
    
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
      console.error('Connection not found:', connError);
      throw new Error('Connection not found');
    }

    console.log('Connection found:', {
      id: connection.id,
      profile_id: connection.profile_id,
      marketplace_id: connection.marketplace_id,
      status: connection.status
    });

    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    if (!amazonClientId) {
      throw new Error('Amazon Client ID not configured');
    }

    // Check if token needs refresh
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      console.log('Token expired, needs refresh');
      throw new Error('Token expired - please reconnect your Amazon account');
    }

    let campaignsSynced = 0;
    let profilesFound = 0;

    // First, try to get profiles if we don't have any
    if (!connection.profile_id) {
      console.log('No profile_id found, attempting to fetch profiles...');
      
      try {
        const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': amazonClientId,
          },
        });

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          console.log('Profiles response:', profiles);
          
          if (profiles && profiles.length > 0) {
            profilesFound = profiles.length;
            const profile = profiles[0]; // Use first profile
            
            // Update connection with profile info
            await supabase
              .from('amazon_connections')
              .update({
                profile_id: profile.profileId.toString(),
                profile_name: profile.accountInfo?.name || `${profile.countryCode} Account`,
                marketplace_id: profile.countryCode,
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionId);
            
            console.log('Updated connection with profile:', profile.profileId);
            
            // Now proceed with campaign sync using this profile
            connection.profile_id = profile.profileId.toString();
          }
        } else {
          console.log('Profiles API call failed:', profilesResponse.status, profilesResponse.statusText);
        }
      } catch (profileError) {
        console.error('Error fetching profiles:', profileError);
      }
    }

    // Try to sync campaigns regardless of profile status
    try {
      console.log('Attempting to fetch campaigns...');
      
      const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': amazonClientId,
          ...(connection.profile_id && { 'Amazon-Advertising-API-Scope': connection.profile_id }),
        },
      });

      console.log('Campaigns API response status:', campaignsResponse.status);
      
      if (campaignsResponse.ok) {
        const campaigns = await campaignsResponse.json();
        console.log(`Found ${campaigns.length} campaigns to sync`);

        // Process and store campaigns
        for (const campaign of campaigns) {
          try {
            await supabase
              .from('campaigns')
              .upsert({
                connection_id: connectionId,
                amazon_campaign_id: campaign.campaignId.toString(),
                name: campaign.name,
                campaign_type: campaign.campaignType,
                targeting_type: campaign.targetingType,
                status: campaign.state?.toLowerCase() || 'paused',
                daily_budget: campaign.dailyBudget,
                start_date: campaign.startDate,
                end_date: campaign.endDate,
                data_source: 'api',
                last_updated: new Date().toISOString(),
              }, {
                onConflict: 'amazon_campaign_id,connection_id'
              });
          } catch (campaignError) {
            console.error('Error upserting campaign:', campaign.campaignId, campaignError);
          }
        }

        campaignsSynced = campaigns.length;
      } else {
        const errorText = await campaignsResponse.text();
        console.error('Campaigns API error:', campaignsResponse.status, errorText);
        throw new Error(`Failed to fetch campaigns: ${campaignsResponse.statusText}`);
      }
    } catch (campaignError) {
      console.error('Campaign sync error:', campaignError);
      throw campaignError;
    }

    // Update connection sync timestamp and status
    await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    console.log('=== Force Sync Complete ===');
    console.log('Profiles found:', profilesFound);
    console.log('Campaigns synced:', campaignsSynced);

    let message = `Successfully synced ${campaignsSynced} campaigns.`;
    if (profilesFound > 0) {
      message += ` Also found and configured ${profilesFound} advertising profile(s).`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaignCount: campaignsSynced,
        profileCount: profilesFound,
        message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in amazon-force-sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Force sync failed - please check your Amazon account setup and try again.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
