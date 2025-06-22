
import { CampaignData, Region, getBaseUrl } from './types.ts';

export async function fetchCampaignsFromRegion(
  accessToken: string,
  clientId: string,
  profileId: string,
  region: Region
): Promise<{ campaigns: CampaignData[], region: Region } | null> {
  const baseUrl = getBaseUrl(region);
  
  console.log(`Trying to fetch campaigns from ${region} region: ${baseUrl}`);
  console.log(`Profile ID: ${profileId}`);
  
  try {
    // Updated endpoints with proper Amazon API paths
    const endpoints = [
      '/v2/sp/campaigns',
      '/v2/campaigns' // Simplified endpoint as fallback
    ];
    
    for (const endpoint of endpoints) {
      console.log(`Trying endpoint: ${endpoint}`);
      
      const campaignsResponse = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      console.log(`${endpoint} response status for ${region}:`, campaignsResponse.status);

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        console.log(`Successfully retrieved ${campaignsData.length} campaigns from ${region} region using ${endpoint}`);
        
        if (campaignsData.length > 0) {
          console.log('Sample campaign data:', JSON.stringify(campaignsData[0], null, 2));
          return { campaigns: campaignsData, region };
        } else {
          console.log(`No campaigns found in ${region} using ${endpoint}, continuing to next endpoint...`);
        }
      } else {
        const errorText = await campaignsResponse.text();
        console.log(`Failed to fetch from ${region} using ${endpoint}:`, errorText);
        
        // Enhanced error analysis
        if (errorText.includes('UNAUTHORIZED') || errorText.includes('Invalid scope')) {
          console.log(`CRITICAL: Profile ${profileId} is not authorized for ${region} region`);
          console.log(`This suggests either: 1) Wrong region for this profile, 2) Profile lacks advertising permissions, 3) Token expired`);
          continue;
        }
        
        if (errorText.includes('NOT_FOUND') || errorText.includes('Method Not Found')) {
          console.log(`Endpoint ${endpoint} not available in ${region}, trying next...`);
          continue;
        }
        
        if (errorText.includes('Invalid key=value pair')) {
          console.log(`CRITICAL: Token format issue detected for ${region}`);
          continue;
        }
      }
    }
    
    console.log(`All endpoints failed for ${region} region - profile may not be active in this region`);
    return null;
  } catch (error) {
    console.log(`Network/connection error for ${region}:`, error.message);
    return null;
  }
}

export async function storeCampaigns(
  campaigns: CampaignData[],
  connectionId: string,
  supabase: any
): Promise<{ stored: number, campaignIds: string[] }> {
  console.log(`Storing ${campaigns.length} campaigns for connection ${connectionId}`);
  
  if (campaigns.length === 0) {
    console.warn('No campaigns to store - this indicates either no campaigns exist or API access issues');
    return { stored: 0, campaignIds: [] };
  }
  
  let campaignsStored = 0;
  const campaignIds = [];
  
  for (const campaign of campaigns) {
    try {
      console.log(`Processing campaign: ${campaign.name} (ID: ${campaign.campaignId})`);
      
      // Enhanced campaign data structure with proper defaults
      const campaignData = {
        connection_id: connectionId,
        amazon_campaign_id: campaign.campaignId.toString(),
        name: campaign.name,
        campaign_type: campaign.campaignType || 'sponsoredProducts',
        targeting_type: campaign.targetingType || 'manual',
        status: (campaign.state || 'enabled').toLowerCase(),
        daily_budget: campaign.dailyBudget || campaign.budget || 0,
        start_date: campaign.startDate,
        end_date: campaign.endDate,
        // Initialize with zero metrics - will be updated by performance sync
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
        data_source: 'api' // CRITICAL: Mark as API data from creation
      };

      const { error: campaignError } = await supabase
        .from('campaigns')
        .upsert(campaignData, {
          onConflict: 'connection_id, amazon_campaign_id'
        });

      if (!campaignError) {
        campaignsStored++;
        campaignIds.push(campaign.campaignId.toString());
        console.log(`✓ Stored campaign: ${campaign.name} with data_source=api`);
      } else {
        console.error(`Error storing campaign ${campaign.name}:`, campaignError);
      }
    } catch (error) {
      console.error(`Error processing campaign ${campaign.name}:`, error);
    }
  }

  console.log(`Successfully stored ${campaignsStored} out of ${campaigns.length} campaigns`);
  
  if (campaignsStored === 0) {
    throw new Error('Failed to store any campaigns. Check database permissions and campaign data structure.');
  }
  
  return { stored: campaignsStored, campaignIds };
}
