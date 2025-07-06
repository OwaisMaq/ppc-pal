
import { AmazonApiClient, AmazonApiConfig } from './apiClient';
import { AmazonRegionManager, ProfileRegionMapping } from './regionManager';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignSyncOptions {
  profileId: string;
  connectionId: string;
  syncType: 'full' | 'incremental' | 'metrics-only';
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface CampaignSyncResult {
  success: boolean;
  campaignsSynced: number;
  adGroupsSynced: number;
  keywordsSynced: number;
  errors: string[];
  warnings: string[];
  syncDuration: number;
  nextSyncRecommendation?: string;
}

export class CampaignSyncService {
  private apiClient: AmazonApiClient;
  private connectionId: string;

  constructor(apiClient: AmazonApiClient, connectionId: string) {
    this.apiClient = apiClient;
    this.connectionId = connectionId;
  }

  async syncCampaigns(options: CampaignSyncOptions): Promise<CampaignSyncResult> {
    const startTime = Date.now();
    console.log('=== Starting Campaign Sync ===');
    console.log('Options:', options);

    const result: CampaignSyncResult = {
      success: false,
      campaignsSynced: 0,
      adGroupsSynced: 0,
      keywordsSynced: 0,
      errors: [],
      warnings: [],
      syncDuration: 0
    };

    try {
      // Step 1: Fetch campaigns
      console.log('Fetching campaigns...');
      const campaignsResponse = await this.apiClient.getCampaigns();
      
      if (!campaignsResponse.success) {
        result.errors.push(`Failed to fetch campaigns: ${campaignsResponse.error}`);
        return result;
      }

      const campaigns = Array.isArray(campaignsResponse.data) 
        ? campaignsResponse.data 
        : [campaignsResponse.data];

      console.log(`Found ${campaigns.length} campaigns`);

      // Step 2: Process each campaign
      for (const campaign of campaigns) {
        try {
          await this.processCampaign(campaign, options, result);
          result.campaignsSynced++;
        } catch (campaignError) {
          console.error(`Error processing campaign ${campaign.campaignId}:`, campaignError);
          result.errors.push(`Campaign ${campaign.campaignId}: ${campaignError.message}`);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Step 3: Fetch campaign metrics if needed
      if (options.syncType !== 'incremental') {
        await this.syncCampaignMetrics(campaigns, options, result);
      }

      result.success = result.campaignsSynced > 0;
      result.syncDuration = Date.now() - startTime;

      // Generate recommendations
      result.nextSyncRecommendation = this.generateSyncRecommendation(result);

      console.log('=== Campaign Sync Complete ===');
      console.log(`Synced ${result.campaignsSynced} campaigns in ${result.syncDuration}ms`);

    } catch (error) {
      console.error('Campaign sync failed:', error);
      result.errors.push(`Sync failed: ${error.message}`);
      result.syncDuration = Date.now() - startTime;
    }

    return result;
  }

  private async processCampaign(
    campaign: any, 
    options: CampaignSyncOptions, 
    result: CampaignSyncResult
  ): Promise<void> {
    
    // Upsert campaign to database
    const campaignData = {
      connection_id: this.connectionId,
      amazon_campaign_id: campaign.campaignId?.toString() || campaign.id?.toString(),
      name: campaign.name,
      campaign_type: campaign.campaignType || campaign.type,
      targeting_type: campaign.targetingType,
      status: this.mapCampaignStatus(campaign.state || campaign.status),
      budget: campaign.budget ? parseFloat(campaign.budget) : null,
      daily_budget: campaign.dailyBudget ? parseFloat(campaign.dailyBudget) : null,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      data_source: 'amazon_api',
      last_updated: new Date().toISOString()
    };

    const { error: campaignError } = await supabase
      .from('campaigns')
      .upsert(campaignData, {
        onConflict: 'connection_id,amazon_campaign_id',
        ignoreDuplicates: false
      });

    if (campaignError) {
      throw new Error(`Database error: ${campaignError.message}`);
    }

    // Sync ad groups if this is a full sync
    if (options.syncType === 'full') {
      try {
        const adGroupCount = await this.syncAdGroups(campaign.campaignId, result);
        result.adGroupsSynced += adGroupCount;
      } catch (adGroupError) {
        result.warnings.push(`Ad group sync failed for campaign ${campaign.campaignId}: ${adGroupError.message}`);
      }
    }
  }

  private async syncAdGroups(campaignId: string, result: CampaignSyncResult): Promise<number> {
    const adGroupsResponse = await this.apiClient.getAdGroups(campaignId);
    
    if (!adGroupsResponse.success) {
      throw new Error(`Failed to fetch ad groups: ${adGroupsResponse.error}`);
    }

    const adGroups = Array.isArray(adGroupsResponse.data) 
      ? adGroupsResponse.data 
      : [adGroupsResponse.data];

    let syncedCount = 0;

    for (const adGroup of adGroups) {
      try {
        // Get campaign database ID
        const { data: campaignData } = await supabase
          .from('campaigns')
          .select('id')
          .eq('connection_id', this.connectionId)
          .eq('amazon_campaign_id', campaignId)
          .single();

        if (!campaignData) {
          throw new Error('Campaign not found in database');
        }

        const adGroupData = {
          campaign_id: campaignData.id,
          amazon_adgroup_id: adGroup.adGroupId?.toString() || adGroup.id?.toString(),
          name: adGroup.name,
          status: this.mapCampaignStatus(adGroup.state || adGroup.status),
          default_bid: adGroup.defaultBid ? parseFloat(adGroup.defaultBid) : null,
          last_updated: new Date().toISOString()
        };

        const { error: adGroupError } = await supabase
          .from('ad_groups')
          .upsert(adGroupData, {
            onConflict: 'campaign_id,amazon_adgroup_id',
            ignoreDuplicates: false
          });

        if (adGroupError) {
          throw new Error(`Ad group database error: ${adGroupError.message}`);
        }

        syncedCount++;

        // Sync keywords for this ad group
        try {
          const keywordCount = await this.syncKeywords(adGroup.adGroupId, campaignData.id, result);
          result.keywordsSynced += keywordCount;
        } catch (keywordError) {
          result.warnings.push(`Keyword sync failed for ad group ${adGroup.adGroupId}: ${keywordError.message}`);
        }

      } catch (error) {
        result.warnings.push(`Failed to process ad group ${adGroup.adGroupId}: ${error.message}`);
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 25));
    }

    return syncedCount;
  }

  private async syncKeywords(adGroupId: string, campaignDbId: string, result: CampaignSyncResult): Promise<number> {
    const keywordsResponse = await this.apiClient.getKeywords(adGroupId);
    
    if (!keywordsResponse.success) {
      throw new Error(`Failed to fetch keywords: ${keywordsResponse.error}`);
    }

    const keywords = Array.isArray(keywordsResponse.data) 
      ? keywordsResponse.data 
      : [keywordsResponse.data];

    let syncedCount = 0;

    for (const keyword of keywords) {
      try {
        // Get ad group database ID
        const { data: adGroupData } = await supabase
          .from('ad_groups')
          .select('id')
          .eq('campaign_id', campaignDbId)
          .eq('amazon_adgroup_id', adGroupId)
          .single();

        if (!adGroupData) {
          throw new Error('Ad group not found in database');
        }

        const keywordData = {
          adgroup_id: adGroupData.id,
          amazon_keyword_id: keyword.keywordId?.toString() || keyword.id?.toString(),
          keyword_text: keyword.keywordText,
          match_type: keyword.matchType,
          status: this.mapCampaignStatus(keyword.state || keyword.status),
          bid: keyword.bid ? parseFloat(keyword.bid) : null,
          last_updated: new Date().toISOString()
        };

        const { error: keywordError } = await supabase
          .from('keywords')
          .upsert(keywordData, {
            onConflict: 'adgroup_id,amazon_keyword_id',
            ignoreDuplicates: false
          });

        if (keywordError) {
          throw new Error(`Keyword database error: ${keywordError.message}`);
        }

        syncedCount++;

      } catch (error) {
        result.warnings.push(`Failed to process keyword ${keyword.keywordId}: ${error.message}`);
      }
    }

    return syncedCount;
  }

  private async syncCampaignMetrics(
    campaigns: any[], 
    options: CampaignSyncOptions, 
    result: CampaignSyncResult
  ): Promise<void> {
    
    console.log('Syncing campaign metrics...');
    
    // Use yesterday as default report date
    const reportDate = options.dateRange?.endDate || 
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const campaignIds = campaigns.map(c => c.campaignId?.toString() || c.id?.toString());
    
    try {
      const metricsResponse = await this.apiClient.getCampaignMetrics(campaignIds, reportDate);
      
      if (!metricsResponse.success) {
        result.warnings.push(`Failed to fetch campaign metrics: ${metricsResponse.error}`);
        return;
      }

      const metrics = Array.isArray(metricsResponse.data) 
        ? metricsResponse.data 
        : [metricsResponse.data];

      for (const metric of metrics) {
        try {
          const updateData = {
            impressions: parseInt(metric.impressions) || 0,
            clicks: parseInt(metric.clicks) || 0,
            spend: parseFloat(metric.cost) || 0,
            sales: parseFloat(metric.sales) || 0,
            orders: parseInt(metric.orders) || 0,
            acos: metric.cost && metric.sales ? 
              (parseFloat(metric.cost) / parseFloat(metric.sales)) * 100 : null,
            roas: metric.cost && metric.sales ? 
              parseFloat(metric.sales) / parseFloat(metric.cost) : null,
            last_updated: new Date().toISOString()
          };

          const { error: updateError } = await supabase
            .from('campaigns')
            .update(updateData)
            .eq('connection_id', this.connectionId)
            .eq('amazon_campaign_id', metric.campaignId);

          if (updateError) {
            result.warnings.push(`Failed to update metrics for campaign ${metric.campaignId}: ${updateError.message}`);
          }

        } catch (error) {
          result.warnings.push(`Error processing metrics for campaign ${metric.campaignId}: ${error.message}`);
        }
      }

    } catch (error) {
      result.warnings.push(`Metrics sync error: ${error.message}`);
    }
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

  private generateSyncRecommendation(result: CampaignSyncResult): string {
    if (result.errors.length > 0) {
      return 'Retry sync after addressing errors';
    }
    
    if (result.campaignsSynced > 100) {
      return 'Consider incremental sync for future updates';
    }
    
    if (result.syncDuration > 60000) { // > 1 minute
      return 'Consider batch processing for improved performance';
    }
    
    return 'Regular incremental sync recommended';
  }
}
