import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AmazonCampaign {
  campaignId: string | number;
  name: string;
  campaignType?: string;
  targetingType?: string;
  state: string;
  dailyBudget?: number;
  startDate?: string;
  endDate?: string;
}

interface AmazonAdGroup {
  adGroupId: string | number;
  name: string;
  state: string;
  defaultBid?: number;
}

interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<TokenRefreshResponse> {
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
    console.error('Token refresh failed:', errorText);
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

async function fetchAmazonDataWithPagination(url: string, headers: Record<string, string>): Promise<any[]> {
  let allData: any[] = [];
  let nextToken: string | undefined = undefined;
  
  do {
    const paginatedUrl = nextToken ? `${url}&nextToken=${encodeURIComponent(nextToken)}` : url;
    console.log('Fetching data from:', paginatedUrl);
    
    const response = await fetch(paginatedUrl, { headers });
    
    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle different response formats from Amazon API
    if (Array.isArray(data)) {
      allData = allData.concat(data);
      nextToken = undefined; // No pagination for this endpoint
    } else if (data.campaigns) {
      allData = allData.concat(data.campaigns);
      nextToken = data.nextToken;
    } else if (data.adGroups) {
      allData = allData.concat(data.adGroups);
      nextToken = data.nextToken;
    } else {
      // Fallback for unknown format
      allData = allData.concat(Array.isArray(data) ? data : [data]);
      nextToken = undefined;
    }
  } while (nextToken);
  
  return allData;
}

function validateCampaignData(campaign: any): campaign is AmazonCampaign {
  return campaign && 
         (campaign.campaignId !== undefined) && 
         (typeof campaign.name === 'string') &&
         (typeof campaign.state === 'string');
}

function validateAdGroupData(adGroup: any): adGroup is AmazonAdGroup {
  return adGroup && 
         (adGroup.adGroupId !== undefined) && 
         (typeof adGroup.name === 'string') &&
         (typeof adGroup.state === 'string');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    // Parse request body once and store it
    const requestBody = await req.json();
    const { connectionId } = requestBody;
    
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }
    
    console.log('Syncing data for connection:', connectionId);

    // Get the connection details
    const { data: connection, error: connectionError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      console.error('Connection error:', connectionError);
      throw new Error('Connection not found');
    }

    if (connection.status !== 'active') {
      throw new Error('Connection is not active');
    }

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = new Date(connection.token_expires_at);
    
    let accessToken = connection.access_token;
    
    if (now >= expiresAt) {
      console.log('Token expired, attempting refresh...');
      
      try {
        const tokenData = await refreshAccessToken(
          connection.refresh_token,
          clientId,
          clientSecret
        );
        
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        // Update connection with new token
        const { error: updateError } = await supabase
          .from('amazon_connections')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: newExpiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', connectionId);
          
        if (updateError) {
          console.error('Error updating token:', updateError);
          throw new Error('Failed to update token');
        }
        
        accessToken = tokenData.access_token;
        console.log('Token refreshed successfully');
        
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Mark connection as expired
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'expired',
            updated_at: now.toISOString(),
          })
          .eq('id', connectionId);
        
        throw new Error('Token expired and refresh failed. Please reconnect your account.');
      }
    }

    const apiHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId': clientId,
      'Amazon-Advertising-API-Scope': connection.profile_id,
      'Content-Type': 'application/json',
    };

    // Sync campaigns with pagination
    console.log('Fetching campaigns...');
    
    let campaignsData: AmazonCampaign[] = [];
    try {
      campaignsData = await fetchAmazonDataWithPagination(
        'https://advertising-api.amazon.com/v2/campaigns',
        apiHeaders
      );
      console.log('Retrieved campaigns:', campaignsData.length);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw new Error('Failed to fetch campaigns from Amazon API');
    }

    // Store campaigns with validation and error handling
    let successfulCampaigns = 0;
    let failedCampaigns = 0;
    
    for (const campaign of campaignsData) {
      try {
        if (!validateCampaignData(campaign)) {
          console.warn('Invalid campaign data:', campaign);
          failedCampaigns++;
          continue;
        }

        const { error: campaignError } = await supabase
          .from('campaigns')
          .upsert({
            connection_id: connectionId,
            amazon_campaign_id: campaign.campaignId.toString(),
            name: campaign.name,
            campaign_type: campaign.campaignType || null,
            targeting_type: campaign.targetingType || null,
            status: campaign.state.toLowerCase(),
            daily_budget: campaign.dailyBudget || null,
            start_date: campaign.startDate || null,
            end_date: campaign.endDate || null,
            impressions: 0,
            clicks: 0,
            spend: 0,
            sales: 0,
            orders: 0,
            last_updated: now.toISOString(),
          }, {
            onConflict: 'connection_id, amazon_campaign_id'
          });

        if (campaignError) {
          console.error('Error storing campaign:', campaign.campaignId, campaignError);
          failedCampaigns++;
        } else {
          successfulCampaigns++;
        }
      } catch (error) {
        console.error('Unexpected error processing campaign:', campaign.campaignId, error);
        failedCampaigns++;
      }
    }

    console.log(`Campaign sync: ${successfulCampaigns} successful, ${failedCampaigns} failed`);

    // Sync ad groups for each campaign with error handling
    const { data: storedCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id')
      .eq('connection_id', connectionId);

    if (campaignsError) {
      console.error('Error fetching stored campaigns:', campaignsError);
      throw new Error('Failed to fetch stored campaigns');
    }

    let successfulAdGroups = 0;
    let failedAdGroups = 0;

    for (const campaign of storedCampaigns || []) {
      try {
        console.log('Fetching ad groups for campaign:', campaign.amazon_campaign_id);
        
        const adGroupsData = await fetchAmazonDataWithPagination(
          `https://advertising-api.amazon.com/v2/adGroups?campaignIdFilter=${campaign.amazon_campaign_id}`,
          apiHeaders
        );
        
        for (const adGroup of adGroupsData) {
          try {
            if (!validateAdGroupData(adGroup)) {
              console.warn('Invalid ad group data:', adGroup);
              failedAdGroups++;
              continue;
            }

            const { error: adGroupError } = await supabase
              .from('ad_groups')
              .upsert({
                campaign_id: campaign.id,
                amazon_adgroup_id: adGroup.adGroupId.toString(),
                name: adGroup.name,
                status: adGroup.state.toLowerCase(),
                default_bid: adGroup.defaultBid || null,
                impressions: 0,
                clicks: 0,
                spend: 0,
                sales: 0,
                orders: 0,
                last_updated: now.toISOString(),
              }, {
                onConflict: 'campaign_id, amazon_adgroup_id'
              });

            if (adGroupError) {
              console.error('Error storing ad group:', adGroup.adGroupId, adGroupError);
              failedAdGroups++;
            } else {
              successfulAdGroups++;
            }
          } catch (error) {
            console.error('Unexpected error processing ad group:', adGroup.adGroupId, error);
            failedAdGroups++;
          }
        }
      } catch (error) {
        console.error('Error fetching ad groups for campaign:', campaign.amazon_campaign_id, error);
        // Continue with next campaign instead of failing completely
      }
    }

    console.log(`Ad group sync: ${successfulAdGroups} successful, ${failedAdGroups} failed`);

    // Update last sync time
    const { error: syncUpdateError } = await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', connectionId);

    if (syncUpdateError) {
      console.error('Error updating sync time:', syncUpdateError);
    }

    console.log('Data sync completed successfully');

    const summary = {
      success: true,
      message: 'Data sync completed',
      statistics: {
        campaigns: {
          successful: successfulCampaigns,
          failed: failedCampaigns,
          total: campaignsData.length,
        },
        adGroups: {
          successful: successfulAdGroups,
          failed: failedAdGroups,
        },
      },
    };

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})