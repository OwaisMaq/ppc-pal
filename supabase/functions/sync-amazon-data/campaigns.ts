
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const fetchCampaignsFromRegion = async (
  accessToken: string,
  clientId: string,
  profileId: string,
  region: string
) => {
  const baseUrls: { [key: string]: string } = {
    'NA': 'https://advertising-api.amazon.com',
    'EU': 'https://advertising-api-EU.amazon.com',
    'FE': 'https://advertising-api-FE.amazon.com'
  }

  const baseUrl = baseUrls[region]
  if (!baseUrl) {
    throw new Error(`Invalid region: ${region}`)
  }

  console.log(`Trying to fetch campaigns from ${region} region: ${baseUrl}`)
  console.log('Profile ID:', profileId)

  // Try multiple endpoints to fetch campaigns
  const endpoints = ['/v2/sp/campaigns', '/v2/campaigns']
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`)
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json'
        }
      })

      console.log(`${endpoint} response status for ${region}:`, response.status)

      if (response.ok) {
        const campaigns = await response.json()
        console.log(`Successfully retrieved ${campaigns.length} campaigns from ${region} region using ${endpoint}`)
        
        if (campaigns.length > 0) {
          console.log('Sample campaign data:', JSON.stringify(campaigns[0], null, 2))
        }
        
        return {
          campaigns,
          region
        }
      } else {
        const errorText = await response.text()
        console.log(`Failed to fetch from ${region} using ${endpoint}:`, errorText)
        
        if (endpoint === endpoints[endpoints.length - 1]) {
          throw new Error(`All endpoints failed for ${region}: ${errorText}`)
        } else {
          console.log(`Endpoint ${endpoint} not available in ${region}, trying next...`)
        }
      }
    } catch (error) {
      console.error(`Error with endpoint ${endpoint} in ${region}:`, error)
      if (endpoint === endpoints[endpoints.length - 1]) {
        throw error
      }
    }
  }

  throw new Error(`No working endpoints found for region ${region}`)
}

export const storeCampaigns = async (
  campaigns: any[],
  connectionId: string,
  supabase: SupabaseClient
) => {
  console.log(`Storing ${campaigns.length} campaigns for connection ${connectionId}`)
  
  let stored = 0
  const campaignIds: string[] = []

  for (const campaign of campaigns) {
    try {
      console.log(`Processing campaign: ${campaign.name} (ID: ${campaign.campaignId})`)
      
      // Prepare campaign data for storage - removed updated_at field
      const campaignData = {
        amazon_campaign_id: campaign.campaignId?.toString(),
        name: campaign.name,
        campaign_type: campaign.campaignType,
        targeting_type: campaign.targetingType,
        status: mapCampaignStatus(campaign.state),
        daily_budget: campaign.dailyBudget,
        start_date: campaign.startDate ? formatAmazonDate(campaign.startDate) : null,
        end_date: campaign.endDate ? formatAmazonDate(campaign.endDate) : null,
        connection_id: connectionId,
        data_source: 'api', // Mark as real API data
        // Initialize metrics to 0 - will be updated later with real data
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
        last_updated: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('campaigns')
        .upsert(campaignData, {
          onConflict: 'amazon_campaign_id,connection_id',
          ignoreDuplicates: false
        })
        .select('id')

      if (error) {
        console.error(`Error storing campaign ${campaign.name}:`, error)
      } else {
        stored++
        if (data && data[0]) {
          campaignIds.push(data[0].id)
        }
      }
    } catch (error) {
      console.error(`Exception storing campaign ${campaign.name}:`, error)
    }
  }

  console.log(`Successfully stored ${stored} out of ${campaigns.length} campaigns with data_source=api`)
  
  return {
    stored,
    campaignIds
  }
}

const mapCampaignStatus = (amazonStatus: string) => {
  switch (amazonStatus?.toLowerCase()) {
    case 'enabled':
      return 'enabled'
    case 'paused':
      return 'paused'
    case 'archived':
      return 'archived'
    default:
      return 'paused'
  }
}

const formatAmazonDate = (dateString: string) => {
  if (!dateString) return null
  
  // Amazon date format is YYYYMMDD
  if (dateString.length === 8) {
    const year = dateString.substring(0, 4)
    const month = dateString.substring(4, 6)
    const day = dateString.substring(6, 8)
    return `${year}-${month}-${day}`
  }
  
  return dateString
}
