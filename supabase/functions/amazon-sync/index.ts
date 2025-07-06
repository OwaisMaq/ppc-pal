
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

interface SyncResponse {
  success: boolean;
  message: string;
  campaignsSynced?: number;
  campaignCount?: number;
  syncStatus?: string;
  error?: string;
  errorType?: string;
  requiresReconnection?: boolean;
  requiresSetup?: boolean;
  details?: string;
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
        JSON.stringify({ error: 'Authentication required', errorType: 'auth_error' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', errorType: 'auth_error' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log('Authenticated user:', userId);

    // Parse request body to get connectionId
    const { connectionId } = await req.json().catch(() => ({}));
    console.log('Request connectionId:', connectionId);

    // Build connection query - either specific connection or all user connections
    let connectionsQuery = supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'setup_required', 'warning', 'pending']); // Include all relevant statuses

    if (connectionId) {
      connectionsQuery = connectionsQuery.eq('id', connectionId);
      console.log('Syncing specific connection:', connectionId);
    } else {
      console.log('Syncing all user connections');
    }

    const { data: connections, error: connectionsError } = await connectionsQuery;

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch connections', 
          errorType: 'database_error',
          details: connectionsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connections || connections.length === 0) {
      const message = connectionId 
        ? 'Connection not found or access denied' 
        : 'No active Amazon connections found';
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message,
          syncStatus: 'no_connections',
          campaignsSynced: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${connections.length} connection(s) to sync`);

    const syncResults = [];
    let totalCampaignsSynced = 0;

    for (const connection of connections) {
      console.log(`=== Syncing connection ${connection.id} ===`);
      console.log('Connection status:', connection.status);
      console.log('Profile ID:', connection.profile_id);
      
      try {
        // Validate connection configuration
        if (!connection.profile_id) {
          console.log('Connection missing profile_id, attempting to set up');
          await updateConnectionStatus(supabase, connection.id, 'setup_required', 'Profile configuration required');
          
          syncResults.push({
            connectionId: connection.id,
            success: false,
            error: 'Profile setup required',
            requiresSetup: true
          });
          continue;
        }

        // Check if token needs refresh
        const tokenExpiry = new Date(connection.token_expires_at);
        const now = new Date();
        
        if (tokenExpiry <= now) {
          console.log('Token expired, attempting refresh...');
          
          const refreshResult = await refreshAccessToken(connection.refresh_token);
          if (!refreshResult.success) {
            console.error('Token refresh failed:', refreshResult.error);
            await updateConnectionStatus(supabase, connection.id, 'error', 'Token expired - reconnection required');
            
            syncResults.push({
              connectionId: connection.id,
              success: false,
              error: 'Token expired',
              requiresReconnection: true
            });
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
        totalCampaignsSynced += campaignSyncResult.campaignsCount || 0;
        
        syncResults.push({
          connectionId: connection.id,
          profileId: connection.profile_id,
          success: campaignSyncResult.success,
          campaignsCount: campaignSyncResult.campaignsCount,
          error: campaignSyncResult.error
        });

        // Update connection status and last sync timestamp
        const newStatus = campaignSyncResult.success ? 'active' : 'warning';
        const statusMessage = campaignSyncResult.success 
          ? 'Sync successful' 
          : campaignSyncResult.error || 'Sync completed with issues';

        await supabase
          .from('amazon_connections')
          .update({ 
            last_sync_at: new Date().toISOString(),
            status: newStatus,
            updated_at: new Date().toISOString()
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
    console.log('Total campaigns synced:', totalCampaignsSynced);

    // Prepare standardized response
    const allSuccessful = syncResults.every(result => result.success);
    const hasSetupRequired = syncResults.some(result => result.requiresSetup);
    const hasReconnectionRequired = syncResults.some(result => result.requiresReconnection);

    const response: SyncResponse = {
      success: allSuccessful,
      campaignsSynced: totalCampaignsSynced,
      campaignCount: totalCampaignsSynced,
      syncStatus: totalCampaignsSynced > 0 ? 'success' : 'success_no_campaigns'
    };

    if (allSuccessful) {
      response.message = totalCampaignsSynced > 0 
        ? `Successfully synced ${totalCampaignsSynced} campaigns`
        : 'Sync completed successfully - no campaigns found in your Amazon account';
    } else if (hasReconnectionRequired) {
      response.error = 'Token expired or invalid';
      response.requiresReconnection = true;
      response.details = 'Please reconnect your Amazon account to continue syncing';
      response.message = 'Reconnection required';
    } else if (hasSetupRequired) {
      response.error = 'Profile setup required';
      response.requiresSetup = true;
      response.details = 'Please set up your Amazon Advertising account at advertising.amazon.com first';
      response.message = 'Amazon Advertising setup required';
    } else {
      response.error = 'Sync completed with errors';
      response.message = 'Some connections failed to sync';
      response.details = syncResults
        .filter(r => !r.success)
        .map(r => r.error)
        .join('; ');
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Amazon Sync Error ===', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Sync failed', 
        errorType: 'server_error',
        details: error.message,
        message: 'An unexpected error occurred during sync'
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
      console.error('Campaign API error:', errorText);
      
      if (campaignsResponse.status === 401) {
        throw new Error('Authentication failed - token may be expired');
      } else if (campaignsResponse.status === 403) {
        throw new Error('Access denied - check Amazon Advertising permissions');
      } else {
        throw new Error(`API request failed: ${campaignsResponse.status} ${errorText}`);
      }
    }

    const campaigns: AmazonCampaign[] = await campaignsResponse.json();
    console.log(`Found ${campaigns.length} campaigns`);

    if (campaigns.length === 0) {
      return {
        success: true,
        campaignsCount: 0,
        message: 'No campaigns found in Amazon account'
      };
    }

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
