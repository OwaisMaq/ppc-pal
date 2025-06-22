
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
    const campaignsResponse = await fetch(`${baseUrl}/v2/campaigns`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Campaigns response status for ${region}:`, campaignsResponse.status);

    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      console.log(`Successfully retrieved ${campaignsData.length} campaigns from ${region} region`);
      return { campaigns: campaignsData, region };
    } else {
      const errorText = await campaignsResponse.text();
      console.log(`Failed to fetch from ${region}:`, errorText);
      
      // Check for invalid scope error specifically
      if (errorText.includes('Invalid scope')) {
        throw new Error('Invalid Amazon profile scope. This connection needs to be reconnected with a valid Amazon Advertising profile.');
      }
      
      return null;
    }
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
  let campaignsStored = 0;
  const campaignIds = [];
  
  for (const campaign of campaigns) {
    try {
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
        }, {
          onConflict: 'connection_id, amazon_campaign_id'
        });

      if (!campaignError) {
        campaignsStored++;
        campaignIds.push(campaign.campaignId.toString());
      } else {
        console.error('Error storing campaign:', campaignError);
      }
    } catch (error) {
      console.error('Error processing campaign:', error);
    }
  }

  console.log(`Stored ${campaignsStored} campaigns successfully`);
  return { stored: campaignsStored, campaignIds };
}
