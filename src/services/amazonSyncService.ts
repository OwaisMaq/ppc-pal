import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateProfileConfiguration } from '@/utils/amazonConnectionValidation';
import { AmazonConnectionOperations } from './amazonConnectionOperations';
import { SyncResponseHandler } from './amazon/syncResponseHandler';
import { SyncErrorHandler } from './amazon/syncErrorHandler';
import { SyncResponse } from './amazon/types';
import { AmazonApiClient, AmazonApiConfig } from './amazon/amazonApiClient';

export class AmazonSyncService {
  private toast: typeof toast;
  private operations: AmazonConnectionOperations;
  private responseHandler: SyncResponseHandler;
  private errorHandler: SyncErrorHandler;

  constructor(toastFn: typeof toast, operations: AmazonConnectionOperations) {
    this.toast = toastFn;
    this.operations = operations;
    this.responseHandler = new SyncResponseHandler(toastFn, operations);
    this.errorHandler = new SyncErrorHandler(toastFn, operations);
  }

  async syncConnection(connectionId: string, refreshConnections: () => Promise<void>) {
    try {
      console.log('=== Enhanced Sync Connection Started ===');
      console.log('Connection ID:', connectionId);
      
      // Step 1: Get auth headers with session validation
      console.log('=== Getting Auth Headers ===');
      let headers;
      try {
        headers = await this.operations.getAuthHeaders();
        console.log('Auth headers prepared successfully');
      } catch (authError) {
        console.error('=== Auth Header Error ===');
        console.error('Auth error:', authError);
        
        this.toast.error("Authentication Required", {
          description: authError.message || "Please sign in again to sync your Amazon connection."
        });
        return;
      }
      
      // Step 2: Validate the connection exists and get its current state
      console.log('=== Validating Connection ===');
      const { data: connectionData, error: connectionError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connectionData) {
        console.error('Connection validation failed:', connectionError);
        throw new Error('Connection not found or access denied');
      }

      console.log('Connection data before sync:', {
        id: connectionData.id,
        status: connectionData.status,
        profile_id: connectionData.profile_id,
        profile_name: connectionData.profile_name,
        marketplace_id: connectionData.marketplace_id
      });

      // Step 3: Validate profile configuration
      if (!connectionData.profile_id || connectionData.profile_id === 'setup_required_no_profiles_found') {
        console.log('Connection requires profile setup');
        await this.operations.updateConnectionStatus(connectionId, 'setup_required', 'Profile configuration required');
        
        this.toast.error("Profile Setup Required", {
          description: "Please set up your Amazon Advertising profile first."
        });
        return;
      }

      // Step 4: Check token expiry and refresh if needed
      const tokenExpiry = new Date(connectionData.token_expires_at);
      const now = new Date();
      
      if (tokenExpiry <= now) {
        console.log('Token expired, sync via edge function required');
        this.toast.info("Token Refresh Required", {
          description: "Token has expired. Using edge function to refresh and sync..."
        });
        
        // Fall back to edge function for token refresh + sync
        await this.syncViaEdgeFunction(connectionId, headers, refreshConnections);
        return;
      }

      // Step 5: Try direct API sync first (new approach)
      console.log('=== Attempting Direct API Sync ===');
      try {
        await this.syncViaDirectApi(connectionData, refreshConnections);
      } catch (directApiError) {
        console.log('=== Direct API sync failed, falling back to edge function ===');
        console.log('Direct API error:', directApiError);
        
        // Fall back to edge function
        await this.syncViaEdgeFunction(connectionId, headers, refreshConnections);
      }
      
    } catch (err) {
      await this.errorHandler.handleGeneralError(err, connectionId);
    }
  }

  private async syncViaDirectApi(connectionData: any, refreshConnections: () => Promise<void>) {
    console.log('=== Direct API Sync Started ===');
    
    // Create API client configuration
    const apiConfig: AmazonApiConfig = {
      profileId: connectionData.profile_id,
      countryCode: connectionData.marketplace_id || 'US',
      accessToken: connectionData.access_token,
      clientId: process.env.AMAZON_CLIENT_ID
    };
    
    const apiClient = new AmazonApiClient(apiConfig);
    console.log('API Client created with config:', {
      profileId: apiConfig.profileId,
      countryCode: apiConfig.countryCode,
      hasToken: !!apiConfig.accessToken
    });

    // Test API access with profile validation
    console.log('=== Testing API Access ===');
    const profilesResponse = await apiClient.getProfiles();
    
    if (!profilesResponse.success) {
      console.error('Profile validation failed:', profilesResponse.error);
      
      if (profilesResponse.error?.requiresReauth) {
        await this.operations.updateConnectionStatus(
          connectionData.id, 
          'error', 
          'Token expired or invalid - reconnection required'
        );
        throw new Error('Token expired - please reconnect your Amazon account');
      }
      
      throw new Error(`API access failed: ${profilesResponse.error?.message}`);
    }

    console.log('API access validated successfully');

    // Fetch campaigns
    console.log('=== Fetching Campaigns via Direct API ===');
    const campaignsResponse = await apiClient.getCampaigns({ state: 'enabled,paused' });
    
    if (!campaignsResponse.success) {
      console.error('Campaign fetch failed:', campaignsResponse.error);
      throw new Error(`Failed to fetch campaigns: ${campaignsResponse.error?.message}`);
    }

    const campaigns = campaignsResponse.data || [];
    console.log(`Fetched ${campaigns.length} campaigns via direct API`);

    // Process and store campaigns
    let successCount = 0;
    for (const campaign of campaigns) {
      try {
        const campaignData = {
          connection_id: connectionData.id,
          amazon_campaign_id: campaign.campaignId?.toString(),
          name: campaign.name || 'Unnamed Campaign',
          campaign_type: campaign.campaignType || 'sponsoredProducts',
          targeting_type: campaign.targetingType,
          status: this.mapCampaignStatus(campaign.state),
          budget: campaign.budget ? parseFloat(campaign.budget) : null,
          daily_budget: campaign.dailyBudget ? parseFloat(campaign.dailyBudget) : null,
          start_date: campaign.startDate,
          end_date: campaign.endDate,
          data_source: 'amazon_api_direct',
          last_updated: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('campaigns')
          .upsert(campaignData, {
            onConflict: 'connection_id,amazon_campaign_id',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error(`Failed to store campaign ${campaignData.amazon_campaign_id}:`, insertError);
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Error processing campaign:', err);
      }
    }

    // Update connection status
    await supabase
      .from('amazon_connections')
      .update({
        status: 'active',
        campaign_count: successCount,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionData.id);

    console.log(`=== Direct API Sync Complete: ${successCount} campaigns synced ===`);
    
    this.toast.success("Sync Complete", {
      description: `Successfully synced ${successCount} campaigns via direct API connection`
    });

    await refreshConnections();
  }

  private async syncViaEdgeFunction(connectionId: string, headers: any, refreshConnections: () => Promise<void>) {
    console.log('=== Edge Function Sync Started ===');
    
    // Show sync started message
    this.toast.info("Sync Started", {
      description: "Fetching your campaign data from Amazon. Please wait..."
    });
    
    // Call Amazon Sync Function
    const { data, error } = await supabase.functions.invoke('amazon-sync', {
      body: { connectionId },
      headers
    });

    console.log('=== Edge Function Sync Response ===');
    console.log('Data present:', !!data);
    console.log('Error present:', !!error);

    // Handle response using the response handler
    await this.responseHandler.handleSyncResponse(data, error, connectionId, refreshConnections);
  }

  private mapCampaignStatus(amazonStatus: string): 'enabled' | 'paused' | 'archived' {
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
}
