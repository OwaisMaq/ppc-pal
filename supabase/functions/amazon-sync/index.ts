
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AmazonProfile {
  profileId: string;
  countryCode: string;
  currencyCode: string;
  dailyBudget?: number;
  timezone: string;
  accountInfo: {
    marketplaceStringId: string;
    id: string;
    type: string;
    name: string;
    validPaymentMethod: boolean;
  };
}

interface AmazonCampaign {
  campaignId: string;
  name: string;
  campaignType: string;
  targetingType: string;
  state: string;
  dailyBudget?: number;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

interface CampaignMetrics {
  campaignId: string;
  impressions: number;
  clicks: number;
  cost: number;
  sales14d?: number;
  orders14d?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Amazon Sync Started ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log('Authenticated user:', userId);

    // Get user's Amazon connections
    const { data: connections, error: connectionsError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch connections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active Amazon connections found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const syncResults = [];

    for (const connection of connections) {
      console.log(`=== Syncing connection ${connection.id} ===`);
      
      try {
        // Check if token needs refresh
        const tokenExpiry = new Date(connection.token_expires_at);
        const now = new Date();
        
        if (tokenExpiry <= now) {
          console.log('Token expired, attempting refresh...');
          
          const refreshResult = await refreshAccessToken(connection.refresh_token);
          if (!refreshResult.success) {
            console.error('Token refresh failed:', refreshResult.error);
            await updateConnectionStatus(supabase, connection.id, 'expired', refreshResult.error);
            continue;
          }

          // Update connection with new tokens
          const { error: updateError } = await supabase
            .from('amazon_connections')
            .update({
              access_token: refreshResult.access_token,
              token_expires_at: refreshResult.expires_at,
              updated_at: new Date().toISOString()
            })
            .eq('id', connection.id);

          if (updateError) {
            console.error('Failed to update tokens:', updateError);
            continue;
          }

          connection.access_token = refreshResult.access_token;
        }

        // Sync campaigns
        const campaignSyncResult = await syncCampaigns(supabase, connection);
        syncResults.push({
          connectionId: connection.id,
          profileId: connection.profile_id,
          success: campaignSyncResult.success,
          campaignsCount: campaignSyncResult.campaignsCount,
          error: campaignSyncResult.error
        });

        // Update last sync timestamp
        await supabase
          .from('amazon_connections')
          .update({ 
            last_sync_at: new Date().toISOString(),
            status: campaignSyncResult.success ? 'active' : 'warning'
          })
          .eq('id', connection.id);

      } catch (connectionError) {
        console.error(`Error syncing connection ${connection.id}:`, connectionError);
        await updateConnectionStatus(supabase, connection.id, 'error', connectionError.message);
        
        syncResults.push({
          connectionId: connection.id,
          profileId: connection.profile_id,
          success: false,
          error: connectionError.message
        });
      }
    }

    console.log('=== Sync Complete ===');
    console.log('Results:', syncResults);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed',
        results: syncResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Amazon Sync Error ===', error);
    return new Response(
      JSON.stringify({ 
        error: 'Sync failed', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function refreshAccessToken(refreshToken: string) {
  try {
    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('Missing Amazon credentials');
    }

    const response = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      access_token: data.access_token,
      expires_at: new Date(Date.now() + (data.expires_in * 1000)).toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function syncCampaigns(supabase: any, connection: any) {
  try {
    console.log(`Fetching campaigns for profile ${connection.profile_id}`);
    
    // Fetch campaigns from Amazon API
    const campaignsResponse = await fetch(
      `https://advertising-api.amazon.com/v2/sp/campaigns`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID')!,
          'Amazon-Advertising-API-Scope': connection.profile_id,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text();
      throw new Error(`API request failed: ${campaignsResponse.status} ${errorText}`);
    }

    const campaigns: AmazonCampaign[] = await campaignsResponse.json();
    console.log(`Found ${campaigns.length} campaigns`);

    let syncedCount = 0;

    // Fetch campaign metrics for the last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const campaignIds = campaigns.map(c => c.campaignId);
    let metricsMap = new Map<string, CampaignMetrics>();

    if (campaignIds.length > 0) {
      try {
        const metricsResponse = await fetch(
          `https://advertising-api.amazon.com/v2/sp/campaigns/report`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID')!,
              'Amazon-Advertising-API-Scope': connection.profile_id,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reportDate: endDate,
              metrics: 'campaignId,impressions,clicks,cost,sales14d,orders14d',
              campaignType: 'sponsoredProducts'
            }),
          }
        );

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          if (Array.isArray(metricsData)) {
            metricsData.forEach((metric: CampaignMetrics) => {
              metricsMap.set(metric.campaignId, metric);
            });
          }
        }
      } catch (metricsError) {
        console.warn('Failed to fetch metrics, continuing with campaign sync:', metricsError);
      }
    }

    // Sync each campaign
    for (const campaign of campaigns) {
      try {
        const metrics = metricsMap.get(campaign.campaignId);
        
        const campaignData = {
          connection_id: connection.id,
          amazon_campaign_id: campaign.campaignId,
          name: campaign.name,
          campaign_type: campaign.campaignType,
          targeting_type: campaign.targetingType,
          status: mapCampaignStatus(campaign.state),
          budget: campaign.budget || null,
          daily_budget: campaign.dailyBudget || null,
          start_date: campaign.startDate || null,
          end_date: campaign.endDate || null,
          impressions: metrics?.impressions || 0,
          clicks: metrics?.clicks || 0,
          spend: metrics?.cost || 0,
          sales: metrics?.sales14d || 0,
          orders: metrics?.orders14d || 0,
          acos: metrics && metrics.cost > 0 && metrics.sales14d > 0 
            ? Math.round((metrics.cost / metrics.sales14d) * 10000) / 100 
            : null,
          roas: metrics && metrics.cost > 0 && metrics.sales14d > 0 
            ? Math.round((metrics.sales14d / metrics.cost) * 100) / 100 
            : null,
          data_source: 'amazon_api',
          last_updated: new Date().toISOString()
        };

        const { error: upsertError } = await supabase
          .from('campaigns')
          .upsert(campaignData, {
            onConflict: 'connection_id,amazon_campaign_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`Failed to upsert campaign ${campaign.campaignId}:`, upsertError);
        } else {
          syncedCount++;
        }
      } catch (campaignError) {
        console.error(`Error processing campaign ${campaign.campaignId}:`, campaignError);
      }
    }

    return {
      success: true,
      campaignsCount: syncedCount
    };
  } catch (error) {
    console.error('Campaign sync failed:', error);
    return {
      success: false,
      error: error.message,
      campaignsCount: 0
    };
  }
}

function mapCampaignStatus(amazonStatus: string): 'enabled' | 'paused' | 'archived' {
  switch (amazonStatus?.toLowerCase()) {
    case 'enabled':
      return 'enabled';
    case 'paused':
      return 'paused';
    case 'archived':
      return 'archived';
    default:
      return 'paused';
  }
}

async function updateConnectionStatus(supabase: any, connectionId: string, status: string, errorMessage?: string) {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('amazon_connections')
      .update(updateData)
      .eq('id', connectionId);
  } catch (error) {
    console.error('Failed to update connection status:', error);
  }
}
