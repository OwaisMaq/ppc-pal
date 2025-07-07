
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

interface SyncResponse {
  success: boolean;
  message: string;
  campaignsSynced?: number;
  campaignCount?: number;
  profilesFound?: number;
  syncStatus?: string;
  error?: string;
  errorType?: string;
  requiresReconnection?: boolean;
  requiresSetup?: boolean;
  details?: string;
}

// Regional endpoint mapping for Amazon Advertising API
const getRegionalEndpoint = (countryCode: string): string => {
  switch (countryCode.toUpperCase()) {
    case 'US':
    case 'CA':
    case 'MX':
      return 'https://advertising-api.amazon.com';
    case 'UK':
    case 'GB':
    case 'DE':
    case 'FR':
    case 'IT':
    case 'ES':
    case 'NL':
    case 'PL':
    case 'SE':
    case 'TR':
    case 'BE':
      return 'https://advertising-api-eu.amazon.com';
    case 'JP':
    case 'AU':
    case 'SG':
    case 'AE':
    case 'IN':
      return 'https://advertising-api-fe.amazon.com';
    default:
      console.log(`Unknown country code: ${countryCode}, defaulting to NA endpoint`);
      return 'https://advertising-api.amazon.com';
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Amazon Sync Started ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error', 
          errorType: 'config_error',
          message: 'Missing Supabase configuration'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentication required', 
          errorType: 'auth_error',
          message: 'Please log in to sync your Amazon connection'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid authentication', 
          errorType: 'auth_error',
          message: 'Please log in again to continue'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log('Authenticated user:', userId);

    // Parse request body to get connectionId
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request format', 
          errorType: 'request_error',
          message: 'Request body must be valid JSON'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { connectionId } = requestBody;
    console.log('Request connectionId:', connectionId);

    // Build connection query - either specific connection or all user connections
    let connectionsQuery = supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'setup_required', 'warning', 'pending', 'error']); // Include error status for retry attempts

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
          success: false,
          error: 'Failed to fetch connections', 
          errorType: 'database_error',
          details: connectionsError.message,
          message: 'Unable to access your Amazon connections'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connections || connections.length === 0) {
      const message = connectionId 
        ? 'Connection not found or access denied' 
        : 'No Amazon connections found';
      
      console.log('No connections found for sync');
      return new Response(
        JSON.stringify({ 
          success: false,
          message,
          syncStatus: 'no_connections',
          campaignsSynced: 0,
          error: 'No connections available'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${connections.length} connection(s) to sync`);

    const syncResults = [];
    let totalCampaignsSynced = 0;
    let totalProfilesFound = 0;

    for (const connection of connections) {
      console.log(`=== Syncing connection ${connection.id} ===`);
      console.log('Connection status:', connection.status);
      console.log('Profile ID:', connection.profile_id);
      console.log('Profile Name:', connection.profile_name);
      console.log('Marketplace ID:', connection.marketplace_id);
      
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
        const hoursUntilExpiry = (tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        console.log(`Token expires in ${hoursUntilExpiry.toFixed(2)} hours`);
        
        if (tokenExpiry <= now) {
          console.log('Token expired, attempting refresh...');
          
          const refreshResult = await refreshAccessToken(connection.refresh_token);
          if (!refreshResult.success) {
            console.error('Token refresh failed:', refreshResult.error);
            await updateConnectionStatus(supabase, connection.id, 'error', `Token refresh failed: ${refreshResult.error}`);
            
            syncResults.push({
              connectionId: connection.id,
              success: false,
              error: 'Token expired - refresh failed',
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
            await updateConnectionStatus(supabase, connection.id, 'error', 'Failed to update authentication tokens');
            continue;
          }

          connection.access_token = refreshResult.access_token;
          connection.token_expires_at = refreshResult.expires_at;
          console.log('Token refreshed successfully');
        }

        // Sync campaigns with enhanced logging
        const campaignSyncResult = await syncCampaignsWithDetailedLogging(supabase, connection);
        totalCampaignsSynced += campaignSyncResult.campaignsCount || 0;
        
        // Track profiles found
        if (campaignSyncResult.profilesFound) {
          totalProfilesFound += campaignSyncResult.profilesFound;
        }
        
        syncResults.push({
          connectionId: connection.id,
          profileId: connection.profile_id,
          success: campaignSyncResult.success,
          campaignsCount: campaignSyncResult.campaignsCount,
          profilesFound: campaignSyncResult.profilesFound,
          error: campaignSyncResult.error
        });

        // Update connection status and last sync timestamp
        const newStatus = campaignSyncResult.success ? 'active' : 'warning';
        const statusMessage = campaignSyncResult.success 
          ? null 
          : campaignSyncResult.error || 'Sync completed with issues';

        await supabase
          .from('amazon_connections')
          .update({ 
            last_sync_at: new Date().toISOString(),
            status: newStatus,
            campaign_count: campaignSyncResult.campaignsCount || 0,
            setup_required_reason: statusMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);

      } catch (connectionError) {
        console.error(`Error syncing connection ${connection.id}:`, connectionError);
        await updateConnectionStatus(supabase, connection.id, 'error', `Sync error: ${connectionError.message}`);
        
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
    console.log('Total profiles found:', totalProfilesFound);

    // Prepare standardized response
    const allSuccessful = syncResults.every(result => result.success);
    const hasSetupRequired = syncResults.some(result => result.requiresSetup);
    const hasReconnectionRequired = syncResults.some(result => result.requiresReconnection);

    const response: SyncResponse = {
      success: allSuccessful,
      campaignsSynced: totalCampaignsSynced,
      campaignCount: totalCampaignsSynced,
      profilesFound: totalProfilesFound,
      syncStatus: allSuccessful ? 'success' : 'partial_success'
    };

    if (allSuccessful) {
      response.message = totalCampaignsSynced > 0 
        ? `Successfully synced ${totalCampaignsSynced} campaigns from ${totalProfilesFound} profiles`
        : 'Sync completed successfully - no campaigns found in your Amazon account';
    } else if (hasReconnectionRequired) {
      response.success = false;
      response.error = 'Token expired or invalid';
      response.requiresReconnection = true;
      response.details = 'Please reconnect your Amazon account to continue syncing';
      response.message = 'Reconnection required';
    } else if (hasSetupRequired) {
      response.success = false;
      response.error = 'Profile setup required';
      response.requiresSetup = true;
      response.details = 'Please set up your Amazon Advertising account at advertising.amazon.com first';
      response.message = 'Amazon Advertising setup required';
    } else {
      response.success = false;
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

    console.log('Attempting to refresh Amazon access token...');
    
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
      console.error('Token refresh failed:', response.status, errorText);
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Token refresh successful');
    
    return {
      success: true,
      access_token: data.access_token,
      expires_at: new Date(Date.now() + (data.expires_in * 1000)).toISOString()
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function syncCampaignsWithDetailedLogging(supabase: any, connection: any) {
  try {
    console.log(`=== DETAILED CAMPAIGN SYNC DEBUG ===`);
    console.log(`Profile ID: ${connection.profile_id}`);
    console.log(`Profile Name: ${connection.profile_name}`);
    console.log(`Marketplace ID: ${connection.marketplace_id}`);
    
    // Determine the correct regional endpoint
    const countryCode = connection.marketplace_id || 'US'; // Default to US if not set
    const baseEndpoint = getRegionalEndpoint(countryCode);
    console.log(`Country Code: ${countryCode}`);
    console.log(`Using endpoint: ${baseEndpoint}`);
    
    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    if (!clientId) {
      throw new Error('Missing Amazon client ID configuration');
    }
    
    // Prepare headers for Amazon API call
    const headers = {
      'Authorization': `Bearer ${connection.access_token}`,
      'Amazon-Advertising-API-ClientId': clientId,
      'Amazon-Advertising-API-Scope': connection.profile_id,
      'Content-Type': 'application/json',
    };

    console.log('=== HEADERS SENT TO AMAZON ===');
    console.log('Authorization:', headers.Authorization ? `Bearer ${connection.access_token.substring(0, 20)}...` : 'Missing');
    console.log('Amazon-Advertising-API-ClientId:', headers['Amazon-Advertising-API-ClientId']);
    console.log('Amazon-Advertising-API-Scope:', headers['Amazon-Advertising-API-Scope']);
    console.log('Content-Type:', headers['Content-Type']);

    // Make the API call to fetch campaigns
    const campaignUrl = `${baseEndpoint}/v2/sp/campaigns`;
    console.log(`=== MAKING REQUEST TO: ${campaignUrl} ===`);
    
    const campaignsResponse = await fetch(campaignUrl, {
      headers,
    });

    console.log('=== AMAZON API RESPONSE STATUS ===');
    console.log('Status:', campaignsResponse.status);
    console.log('Status Text:', campaignsResponse.statusText);
    console.log('OK:', campaignsResponse.ok);

    // Log response headers for debugging
    console.log('=== AMAZON API RESPONSE HEADERS ===');
    for (const [key, value] of campaignsResponse.headers.entries()) {
      console.log(`${key}: ${value}`);
    }

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text();
      console.error('=== AMAZON API ERROR RESPONSE ===');
      console.error('Error Text:', errorText);
      
      // Enhanced error handling
      if (campaignsResponse.status === 401) {
        throw new Error('Authentication failed - token may be expired or invalid');
      } else if (campaignsResponse.status === 403) {
        throw new Error('Access forbidden - profile may require setup or permissions');
      } else if (campaignsResponse.status === 404) {
        throw new Error('API endpoint not found - check region configuration');
      } else if (campaignsResponse.status === 429) {
        throw new Error('Rate limit exceeded - please try again later');
      } else {
        throw new Error(`Amazon API error: ${campaignsResponse.status} ${errorText}`);
      }
    }

    // Parse the response
    const responseText = await campaignsResponse.text();
    console.log('=== RAW AMAZON API RESPONSE ===');
    console.log('Response length:', responseText.length);
    console.log('Response preview (first 1000 chars):', responseText.substring(0, 1000));

    let campaigns;
    try {
      campaigns = JSON.parse(responseText);
      console.log('=== PARSED CAMPAIGN DATA ===');
      console.log('Campaigns type:', typeof campaigns);
      console.log('Is array:', Array.isArray(campaigns));
      console.log('Campaign count:', Array.isArray(campaigns) ? campaigns.length : 'Not an array');
      
      if (Array.isArray(campaigns) && campaigns.length > 0) {
        console.log('First campaign sample:', JSON.stringify(campaigns[0], null, 2));
        console.log('All campaign IDs:', campaigns.map(c => c.campaignId || c.id));
        console.log('All campaign names:', campaigns.map(c => c.name));
        console.log('All campaign states:', campaigns.map(c => c.state || c.status));
      } else if (!Array.isArray(campaigns)) {
        console.log('Non-array response:', JSON.stringify(campaigns, null, 2));
      }
    } catch (parseError) {
      console.error('Failed to parse campaign response as JSON:', parseError);
      throw new Error(`Failed to parse Amazon API response: ${parseError.message}`);
    }

    if (!Array.isArray(campaigns)) {
      console.log('Converting non-array response to array');
      campaigns = [campaigns];
    }

    if (campaigns.length === 0) {
      console.log('=== NO CAMPAIGNS FOUND ===');
      console.log('This could indicate:');
      console.log('1. No campaigns exist in this profile');
      console.log('2. Wrong profile ID or region');
      console.log('3. Profile has no advertising campaigns');
      console.log('4. API permissions issue');
      
      return {
        success: true,
        campaignsCount: 0,
        profilesFound: 1,
        message: 'No campaigns found in Amazon account'
      };
    }

    console.log(`=== PROCESSING ${campaigns.length} CAMPAIGNS ===`);
    let successCount = 0;
    let errorCount = 0;

    for (const campaign of campaigns) {
      try {
        console.log(`Processing campaign: ${campaign.name || 'Unnamed'} (ID: ${campaign.campaignId || campaign.id})`);
        
        const campaignData = {
          connection_id: connection.id,
          amazon_campaign_id: (campaign.campaignId || campaign.id)?.toString(),
          name: campaign.name || 'Unnamed Campaign',
          campaign_type: campaign.campaignType || campaign.type,
          targeting_type: campaign.targetingType,
          status: mapCampaignStatus(campaign.state || campaign.status),
          budget: campaign.budget ? parseFloat(campaign.budget) : null,
          daily_budget: campaign.dailyBudget ? parseFloat(campaign.dailyBudget) : null,
          start_date: campaign.startDate,
          end_date: campaign.endDate,
          data_source: 'amazon_api',
          last_updated: new Date().toISOString()
        };

        console.log('Campaign data to insert:', JSON.stringify(campaignData, null, 2));

        const { error: insertError } = await supabase
          .from('campaigns')
          .upsert(campaignData, {
            onConflict: 'connection_id,amazon_campaign_id',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error(`Failed to insert campaign ${campaignData.amazon_campaign_id}:`, insertError);
          errorCount++;
        } else {
          console.log(`Successfully inserted/updated campaign ${campaignData.amazon_campaign_id}`);
          successCount++;
        }

      } catch (campaignError) {
        console.error(`Error processing individual campaign:`, campaignError);
        errorCount++;
      }
    }

    console.log(`=== CAMPAIGN SYNC SUMMARY ===`);
    console.log(`Total campaigns processed: ${campaigns.length}`);
    console.log(`Successfully synced: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    return {
      success: successCount > 0,
      campaignsCount: successCount,
      profilesFound: 1,
      message: errorCount > 0 
        ? `Synced ${successCount} campaigns with ${errorCount} errors`
        : `Successfully synced ${successCount} campaigns`
    };

  } catch (error) {
    console.error('=== CAMPAIGN SYNC ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      success: false,
      campaignsCount: 0,
      profilesFound: 0,
      error: error.message
    };
  }
}

function mapCampaignStatus(amazonStatus: string): 'enabled' | 'paused' | 'archived' {
  switch (amazonStatus?.toLowerCase()) {
    case 'enabled':
    case 'active':
      return 'enabled';
    case 'paused':
      return 'paused';
    case 'archived':
      return 'archived';
    default:
      return 'paused';
  }
}

async function updateConnectionStatus(supabase: any, connectionId: string, status: string, message?: string) {
  try {
    console.log(`Updating connection ${connectionId} status to: ${status}`);
    if (message) {
      console.log(`Status message: ${message}`);
    }
    
    const { error } = await supabase
      .from('amazon_connections')
      .update({
        status,
        setup_required_reason: message,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Failed to update connection status:', error);
    } else {
      console.log('Connection status updated successfully');
    }
  } catch (error) {
    console.error('Error updating connection status:', error);
  }
}
