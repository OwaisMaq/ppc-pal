
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
  console.log('=== FIXED CAMPAIGN STORAGE WITH GUARANTEED UUID EXTRACTION ===')
  console.log(`Processing ${campaigns.length} campaigns for connection ${connectionId}`)
  
  let stored = 0
  let errors = 0
  const campaignIds: string[] = []
  const processingErrors: string[] = []

  // Enhanced database connectivity test
  try {
    const { count, error: countError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connectionId)

    if (countError) {
      console.error('❌ CRITICAL: Cannot access campaigns table:', countError)
      throw new Error(`Database access error: ${countError.message}`)
    }

    console.log(`✅ Database access confirmed. Existing campaigns for this connection: ${count}`)
  } catch (error) {
    console.error('❌ CRITICAL: Database connection failed:', error)
    throw error
  }

  // Process each campaign with enhanced UUID extraction
  for (const campaign of campaigns) {
    try {
      console.log(`🔄 Processing campaign: ${campaign.name} (Amazon ID: ${campaign.campaignId})`)
      
      // Enhanced validation for required fields
      if (!campaign.campaignId) {
        console.error(`❌ Campaign missing campaignId:`, campaign)
        errors++
        processingErrors.push(`Campaign "${campaign.name || 'unknown'}" missing campaignId`)
        continue
      }

      if (!campaign.name) {
        console.error(`❌ Campaign missing name:`, campaign)
        errors++
        processingErrors.push(`Campaign with ID "${campaign.campaignId}" missing name`)
        continue
      }

      // Prepare campaign data with EXPLICIT API source marking
      const campaignData = {
        amazon_campaign_id: campaign.campaignId.toString(),
        name: campaign.name,
        campaign_type: campaign.campaignType || 'sponsored-products',
        targeting_type: campaign.targetingType || 'manual',
        status: mapCampaignStatus(campaign.state),
        daily_budget: campaign.dailyBudget ? parseFloat(campaign.dailyBudget) : null,
        start_date: campaign.startDate ? formatAmazonDate(campaign.startDate) : null,
        end_date: campaign.endDate ? formatAmazonDate(campaign.endDate) : null,
        connection_id: connectionId,
        data_source: 'api', // CRITICAL: Mark as real API data
        // Initialize metrics to 0 - will be updated with real metrics
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
        last_updated: new Date().toISOString()
      }

      console.log(`📝 Upserting campaign data:`, {
        amazon_campaign_id: campaignData.amazon_campaign_id,
        name: campaignData.name,
        data_source: campaignData.data_source,
        status: campaignData.status
      })

      // CRITICAL FIX: Use proper upsert with guaranteed UUID return
      const { data: upsertResult, error: upsertError } = await supabase
        .from('campaigns')
        .upsert(
          campaignData,
          {
            onConflict: 'amazon_campaign_id,connection_id',
            ignoreDuplicates: false
          }
        )
        .select('id, amazon_campaign_id, name')
        .single()

      if (upsertError) {
        console.error(`❌ Database error upserting campaign ${campaign.name}:`, upsertError)
        errors++
        processingErrors.push(`Campaign "${campaign.name}": ${upsertError.message}`)
        continue
      }

      if (!upsertResult?.id) {
        console.error(`❌ CRITICAL: No UUID returned for campaign ${campaign.name}`)
        
        // FALLBACK: Try to fetch the campaign by Amazon ID
        const { data: existingCampaign, error: fetchError } = await supabase
          .from('campaigns')
          .select('id, amazon_campaign_id, name')
          .eq('amazon_campaign_id', campaign.campaignId.toString())
          .eq('connection_id', connectionId)
          .single()

        if (fetchError || !existingCampaign) {
          console.error(`❌ FALLBACK FAILED: Cannot retrieve UUID for campaign ${campaign.name}`)
          errors++
          processingErrors.push(`Campaign UUID extraction failed for "${campaign.name}"`)
          continue
        }

        console.log(`✅ FALLBACK SUCCESS: Retrieved UUID ${existingCampaign.id} for campaign ${campaign.name}`)
        campaignIds.push(existingCampaign.id)
        stored++
        continue
      }

      // SUCCESS: We have the UUID
      campaignIds.push(upsertResult.id)
      stored++
      console.log(`✅ SUCCESS: Campaign "${campaign.name}" stored with UUID: ${upsertResult.id}`)

    } catch (error) {
      console.error(`❌ Exception processing campaign ${campaign.name}:`, error)
      errors++
      processingErrors.push(`Campaign "${campaign.name}": ${error.message}`)
    }
  }

  // CRITICAL VERIFICATION: Ensure we have UUIDs for metrics
  if (stored > 0 && campaignIds.length === 0) {
    console.error('🚨 CRITICAL ERROR: Campaigns stored but NO UUIDs extracted!')
    console.error('This will prevent metrics fetching. Attempting recovery...')
    
    // Emergency UUID recovery
    try {
      const { data: allCampaigns, error: recoveryError } = await supabase
        .from('campaigns')
        .select('id, amazon_campaign_id, name, data_source')
        .eq('connection_id', connectionId)
        .eq('data_source', 'api')
        .order('created_at', { ascending: false })
        .limit(stored)

      if (!recoveryError && allCampaigns && allCampaigns.length > 0) {
        const recoveredIds = allCampaigns.map(c => c.id)
        campaignIds.push(...recoveredIds)
        console.log(`🔄 RECOVERY SUCCESS: Retrieved ${recoveredIds.length} UUIDs`)
        allCampaigns.forEach(c => {
          console.log(`   - ${c.name} (${c.amazon_campaign_id}): ${c.id}`)
        })
      }
    } catch (recoveryError) {
      console.error('❌ UUID recovery failed:', recoveryError)
    }
  }

  // Final storage verification
  try {
    const { data: verificationData, error: verifyError } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id, name, data_source, status, created_at')
      .eq('connection_id', connectionId)
      .eq('data_source', 'api')
      .order('created_at', { ascending: false })

    if (verifyError) {
      console.error('❌ Verification query failed:', verifyError)
    } else {
      console.log(`✅ VERIFICATION: ${verificationData?.length || 0} API campaigns in database`)
      if (verificationData && verificationData.length > 0) {
        verificationData.slice(0, 3).forEach(c => {
          console.log(`   ✓ ${c.name} (${c.amazon_campaign_id}) - Status: ${c.status}`)
        })
      }
    }
  } catch (verificationError) {
    console.error('❌ Verification failed:', verificationError)
  }

  console.log('=== ENHANCED CAMPAIGN STORAGE SUMMARY ===')
  console.log(`✅ Campaigns stored: ${stored}`)
  console.log(`❌ Storage errors: ${errors}`)
  console.log(`🎯 UUIDs extracted: ${campaignIds.length}`)
  console.log(`📊 Success rate: ${campaigns.length > 0 ? ((stored / campaigns.length) * 100).toFixed(1) : 'N/A'}%`)
  
  if (campaignIds.length > 0) {
    console.log(`🔑 Campaign UUIDs for metrics:`, campaignIds.slice(0, 5))
  }
  
  if (processingErrors.length > 0) {
    console.log('❌ Processing errors:')
    processingErrors.slice(0, 5).forEach(error => console.log(`   - ${error}`))
  }

  // Enhanced error handling
  if (stored === 0 && campaigns.length > 0) {
    console.error('🚨 CRITICAL: NO CAMPAIGNS STORED despite having campaign data!')
    throw new Error(`Failed to store any of ${campaigns.length} campaigns. Check database permissions and constraints.`)
  }

  if (campaignIds.length === 0 && stored > 0) {
    console.error('🚨 CRITICAL: CAMPAIGNS STORED BUT NO UUIDs EXTRACTED!')
    throw new Error(`Campaign storage succeeded but UUID extraction failed for ${stored} campaigns. Metrics fetching will not work.`)
  }

  console.log(`🎉 PIPELINE SUCCESS: ${stored} campaigns stored with ${campaignIds.length} UUIDs ready for metrics`)
  
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
