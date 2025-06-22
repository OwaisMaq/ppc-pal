
import { CampaignData, Region, getBaseUrl } from './types.ts';

export async function fetchCampaignsFromRegion(
  accessToken: string,
  clientId: string,
  profileId: string,
  region: Region
): Promise<{ campaigns: CampaignData[], region: Region } | null> {
  const baseUrl = getBaseUrl(region);
  
  console.log(`Trying to fetch campaigns from ${region} region: ${baseUrl}`);
  
  try {
    // Try multiple endpoints to get campaign data
    const endpoints = [
      '/v2/sp/campaigns',
      '/v3/sp/campaigns', 
      '/v2/campaigns'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`Trying endpoint: ${endpoint}`);
      
      const campaignsResponse = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
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
          console.log(`No campaigns found in ${region} using ${endpoint}, trying next endpoint...`);
        }
      } else {
        const errorText = await campaignsResponse.text();
        console.log(`Failed to fetch from ${region} using ${endpoint}:`, errorText);
        
        // Check for invalid scope error specifically
        if (errorText.includes('Invalid scope') || errorText.includes('UNAUTHORIZED')) {
          console.log(`Authorization error for ${region} - profile may not have access to this region`);
          continue; // Try next endpoint before giving up on this region
        }
      }
    }
    
    console.log(`All endpoints failed for ${region} region`);
    return null;
  } catch (error) {
    console.log(`Error fetching from ${region}:`, error.message);
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
    console.warn('No campaigns to store - this may indicate an issue with the Amazon API response or account permissions');
    return { stored: 0, campaignIds: [] };
  }
  
  let campaignsStored = 0;
  const campaignIds = [];
  
  for (const campaign of campaigns) {
    try {
      console.log(`Processing campaign: ${campaign.name} (ID: ${campaign.campaignId})`);
      
      const { error: campaignError } = await supabase
        .from('campaigns')
        .upsert({
          connection_id: connectionId,
          amazon_campaign_id: campaign.campaignId.toString(),
          name: campaign.name,
          campaign_type: campaign.campaignType,
          targeting_type: campaign.targetingType,
          status: campaign.state.toLowerCase(),
          daily_budget: campaign.dailyBudget,
          start_date: campaign.startDate,
          end_date: campaign.endDate,
          impressions: 0,
          clicks: 0,
          spend: 0,
          sales: 0,
          orders: 0,
          data_source: 'api', // Mark as API data from the start
        }, {
          onConflict: 'connection_id, amazon_campaign_id'
        });

      if (!campaignError) {
        campaignsStored++;
        campaignIds.push(campaign.campaignId.toString());
        console.log(`✓ Stored campaign: ${campaign.name}`);
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
