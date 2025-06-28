
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
  console.log('=== ENHANCED CAMPAIGN STORAGE WITH GUARANTEED ID EXTRACTION ===')
  console.log(`Processing ${campaigns.length} campaigns for connection ${connectionId}`)
  
  let stored = 0
  let errors = 0
  const campaignIds: string[] = []
  const processingErrors: string[] = []

  // First, let's test if we can access the campaigns table
  try {
    const { count, error: countError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connectionId)

    if (countError) {
      console.error('❌ CRITICAL: Cannot access campaigns table:', countError)
      throw new Error(`Database access error: ${countError.message}`)
    }

    console.log(`✓ Database access confirmed. Existing campaigns for this connection: ${count}`)
  } catch (error) {
    console.error('❌ CRITICAL: Database connection failed:', error)
    throw error
  }

  for (const campaign of campaigns) {
    try {
      console.log(`Processing campaign: ${campaign.name} (Amazon ID: ${campaign.campaignId})`)
      
      // Validate required fields
      if (!campaign.campaignId) {
        console.error(`❌ Campaign missing campaignId:`, campaign)
        errors++
        processingErrors.push(`Campaign "${campaign.name}" missing campaignId`)
        continue
      }

      if (!campaign.name) {
        console.error(`❌ Campaign missing name:`, campaign)
        errors++
        processingErrors.push(`Campaign with ID "${campaign.campaignId}" missing name`)
        continue
      }

      // Prepare campaign data with enhanced validation and defaults
      const campaignData = {
        amazon_campaign_id: campaign.campaignId.toString(),
        name: campaign.name || 'Unnamed Campaign',
        campaign_type: campaign.campaignType || 'unknown',
        targeting_type: campaign.targetingType || 'unknown',
        status: mapCampaignStatus(campaign.state),
        daily_budget: campaign.dailyBudget ? parseFloat(campaign.dailyBudget) : null,
        start_date: campaign.startDate ? formatAmazonDate(campaign.startDate) : null,
        end_date: campaign.endDate ? formatAmazonDate(campaign.endDate) : null,
        connection_id: connectionId,
        data_source: 'api', // CRITICAL: Mark as real API data
        // Initialize metrics to 0 - will be updated later with real data
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
        last_updated: new Date().toISOString()
      }

      console.log('Prepared campaign data:', {
        amazon_campaign_id: campaignData.amazon_campaign_id,
        name: campaignData.name,
        connection_id: campaignData.connection_id,
        data_source: campaignData.data_source,
        status: campaignData.status
      })

      // ENHANCED FIX: Use upsert with explicit select to guarantee ID extraction
      const { data: upsertedCampaign, error: upsertError } = await supabase
        .from('campaigns')
        .upsert(
          campaignData,
          {
            onConflict: 'amazon_campaign_id,connection_id',
            ignoreDuplicates: false
          }
        )
        .select('id')
        .single()

      if (upsertError) {
        console.error(`❌ Database error upserting campaign ${campaign.name}:`, upsertError)
        errors++
        processingErrors.push(`Campaign "${campaign.name}": ${upsertError.message}`)
        continue
      }

      if (!upsertedCampaign?.id) {
        console.error(`❌ No ID returned for campaign ${campaign.name} after upsert`)
        errors++
        processingErrors.push(`Campaign "${campaign.name}": No ID returned after upsert`)
        continue
      }

      // GUARANTEED: We now have a campaign UUID
      campaignIds.push(upsertedCampaign.id)
      stored++
      console.log(`✅ Successfully processed campaign: ${campaign.name} with UUID: ${upsertedCampaign.id}`)

    } catch (error) {
      console.error(`❌ Exception processing campaign ${campaign.name}:`, error)
      errors++
      processingErrors.push(`Campaign "${campaign.name}": ${error.message}`)
    }
  }

  // Final verification: Check what was actually stored
  try {
    const { data: storedCampaigns, error: verifyError } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id, name, data_source, status, created_at')
      .eq('connection_id', connectionId)
      .eq('data_source', 'api')
      .order('created_at', { ascending: false })

    if (verifyError) {
      console.error('❌ Error verifying stored campaigns:', verifyError)
    } else {
      console.log('=== STORAGE VERIFICATION ===')
      console.log(`✅ Total API campaigns in database for this connection: ${storedCampaigns?.length || 0}`)
      
      if (storedCampaigns && storedCampaigns.length > 0) {
        console.log('Recently stored campaigns:')
        storedCampaigns.slice(0, 5).forEach(campaign => {
          console.log(`  - ${campaign.name} (${campaign.amazon_campaign_id}) - ${campaign.status}`)
        })
      }
    }
  } catch (verificationError) {
    console.error('❌ Failed to verify stored campaigns:', verificationError)
  }

  console.log('=== CAMPAIGN STORAGE SUMMARY ===')
  console.log(`✅ Successfully stored: ${stored} campaigns`)
  console.log(`❌ Errors encountered: ${errors} campaigns`)
  console.log(`🔍 Campaign IDs generated: ${campaignIds.length}`)
  console.log(`📊 Campaign IDs for metrics:`, campaignIds.slice(0, 5))
  
  if (processingErrors.length > 0) {
    console.log('❌ Processing errors:')
    processingErrors.forEach(error => console.log(`   - ${error}`))
  }

  if (stored === 0 && campaigns.length > 0) {
    console.error('🚨 CRITICAL: NO CAMPAIGNS STORED despite having campaign data!')
    console.error('This indicates a serious database storage issue.')
    throw new Error(`Failed to store any of ${campaigns.length} campaigns. Check database constraints and permissions.`)
  }

  if (campaignIds.length === 0 && stored > 0) {
    console.error('🚨 CRITICAL: CAMPAIGNS STORED BUT NO IDs EXTRACTED!')
    console.error('This will prevent metrics fetching from working.')
    throw new Error(`Campaign storage succeeded but ID extraction failed for ${stored} campaigns.`)
  }

  console.log(`🎉 SUCCESS: Stored ${stored} campaigns with data_source=api`)
  console.log(`🎯 GUARANTEED CAMPAIGN IDS COUNT: ${campaignIds.length}`)
  
  return {
    stored,
    campaignIds,
    errors,
    processingErrors
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
