
import { AdGroupData, Region, getBaseUrl } from './types.ts';

export async function syncAdGroups(
  accessToken: string,
  clientId: string,
  profileId: string,
  region: Region,
  connectionId: string,
  supabase: any
): Promise<number> {
  const baseUrl = getBaseUrl(region);
  
  // Get stored campaigns for this connection
  const { data: storedCampaigns } = await supabase
    .from('campaigns')
    .select('id, amazon_campaign_id')
    .eq('connection_id', connectionId);

  let adGroupsStored = 0;

  for (const campaign of storedCampaigns || []) {
    try {
      console.log('Fetching ad groups for campaign:', campaign.amazon_campaign_id);
      
      const adGroupsResponse = await fetch(`${baseUrl}/v2/adGroups?campaignIdFilter=${campaign.amazon_campaign_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
      });

      if (adGroupsResponse.ok) {
        const adGroupsData: AdGroupData[] = await adGroupsResponse.json();
        
        for (const adGroup of adGroupsData) {
          const { error: adGroupError } = await supabase
            .from('ad_groups')
            .upsert({
              campaign_id: campaign.id,
              amazon_adgroup_id: adGroup.adGroupId.toString(),
              name: adGroup.name,
              status: adGroup.state.toLowerCase(),
              default_bid: adGroup.defaultBid,
              impressions: 0,
              clicks: 0,
              spend: 0,
              sales: 0,
              orders: 0,
            }, {
              onConflict: 'campaign_id, amazon_adgroup_id'
            });

          if (!adGroupError) {
            adGroupsStored++;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching ad groups for campaign:', campaign.amazon_campaign_id, error);
    }
  }

  console.log(`Stored ${adGroupsStored} ad groups successfully`);
  return adGroupsStored;
}
