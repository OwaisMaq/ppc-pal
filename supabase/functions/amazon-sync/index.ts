
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

    // Check if token needs refresh
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      console.log('Token expired, refreshing...');
      // Implement token refresh logic here
      throw new Error('Token expired - refresh needed');
    }

    // Sync campaigns
    const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Amazon-Advertising-API-ClientId': amazonClientId,
        'Amazon-Advertising-API-Scope': connection.profile_id,
      },
    });

    if (!campaignsResponse.ok) {
      throw new Error(`Failed to fetch campaigns: ${campaignsResponse.statusText}`);
    }

    const campaigns = await campaignsResponse.json();
    console.log(`Found ${campaigns.length} campaigns to sync`);

    // Process and store campaigns
    for (const campaign of campaigns) {
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
    }

    // Update connection sync timestamp
    await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaignsSynced: campaigns.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in amazon-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
