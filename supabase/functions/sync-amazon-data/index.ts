
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportRequest {
  reportId: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE'
  url?: string
  fileSize?: number
  statusDetails?: string
}

interface PerformanceData {
  campaignId?: string
  adGroupId?: string  
  keywordId?: string
  keywordText?: string
  matchType?: string
  impressions?: string
  clicks?: string
  cost?: string
  sales7d?: string
  sales14d?: string
  purchases7d?: string
  purchases14d?: string
  clickThroughRate?: string
  costPerClick?: string
}

async function waitWithExponentialBackoff(attempt: number, baseDelayMs = 1000, maxDelayMs = 30000) {
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
  await new Promise(resolve => setTimeout(resolve, delay))
}

async function createReportRequest(
  apiEndpoint: string,
  accessToken: string, 
  clientId: string,
  profileId: string,
  reportType: string,
  columns: string[],
  entityIds?: string[]
): Promise<string> {
  const groupBy = reportType === 'campaigns' ? ['campaign'] : reportType === 'adGroups' ? ['adGroup'] : ['targeting']
  const reportTypeId = reportType === 'campaigns' ? 'spCampaigns' : reportType === 'adGroups' ? 'spAdGroups' : 'spTargets'

  const payload: any = {
    name: `${reportType}_${Date.now()}`,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    configuration: {
      adProduct: 'SPONSORED_PRODUCTS',
      groupBy,
      columns,
      reportTypeId,
      timeUnit: 'SUMMARY',
      format: 'GZIP_JSON'
    }
  }

  // v3 filtering uses top-level filters with field names
  if (entityIds && entityIds.length > 0) {
    const field = reportType === 'campaigns' ? 'campaignId' : reportType === 'adGroups' ? 'adGroupId' : 'keywordId'
    payload.filters = [{ field, values: entityIds }]
  }

  // Log minimal payload details for debugging without dumping all IDs
  try {
    const debugPayload = {
      ...payload,
      configuration: { ...payload.configuration, columnsCount: columns.length },
      filtersCount: payload.filters ? payload.filters[0]?.values?.length : 0,
    }
    console.log('Creating report with payload:', JSON.stringify(debugPayload))
  } catch (_) {}


  const response = await fetch(`${apiEndpoint}/reporting/reports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId': clientId,
      'Amazon-Advertising-API-Scope': profileId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create report: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  return result.reportId
}

async function pollReportStatus(
  apiEndpoint: string,
  accessToken: string,
  clientId: string, 
  profileId: string,
  reportId: string
): Promise<ReportRequest> {
  let attempt = 0
  const maxAttempts = 20
  
  while (attempt < maxAttempts) {
    const response = await fetch(`${apiEndpoint}/reporting/reports/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get report status: ${response.status}`)
    }

    const report: ReportRequest = await response.json()
    
    if (report.status === 'SUCCESS' && report.url) {
      return report
    } else if (report.status === 'FAILURE') {
      throw new Error(`Report failed: ${report.statusDetails}`)
    }
    
    console.log(`Report ${reportId} status: ${report.status}, attempt ${attempt + 1}/${maxAttempts}`)
    
    await waitWithExponentialBackoff(attempt)
    attempt++
  }
  
  throw new Error(`Report polling timeout after ${maxAttempts} attempts`)
}

async function downloadAndParseReport(url: string): Promise<PerformanceData[]> {
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to download report: ${response.status}`)
  }

  // Use Deno's built-in compression streams to decompress gzip data
  const compressedStream = response.body
  if (!compressedStream) {
    throw new Error('No response body received')
  }

  const decompressedStream = compressedStream.pipeThrough(new DecompressionStream('gzip'))
  const decompressedResponse = new Response(decompressedStream)
  const jsonText = await decompressedResponse.text()
  
  return JSON.parse(jsonText)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    const { connectionId } = await req.json()
    console.log('Syncing data for connection:', connectionId)

    // Get the connection details
    const { data: connection, error: connectionError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      throw new Error('Connection not found')
    }

    if (connection.status !== 'active') {
      throw new Error('Connection is not active')
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Amazon Client ID not configured')
    }

    // Check if token needs refresh
    const now = new Date()
    const expiresAt = new Date(connection.token_expires_at)
    
    let accessToken = connection.access_token
    
    // If token expires within 5 minutes, try to refresh it
    const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds
    if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
      console.log('Token expired or expiring soon, attempting refresh...')
      
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
      
      if (!clientSecret) {
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'error',
            setup_required_reason: 'Missing Amazon client secret'
          })
          .eq('id', connectionId)
        
        throw new Error('Amazon client secret not configured')
      }

      try {
        console.log('Attempting token refresh...')
        
        const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: connection.refresh_token,
            client_id: clientId!,
            client_secret: clientSecret,
          }),
        })

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json()
          const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
          
          // Update connection with new tokens
          await supabase
            .from('amazon_connections')
            .update({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token || connection.refresh_token,
              token_expires_at: newExpiresAt.toISOString(),
              status: 'active',
              setup_required_reason: null
            })
            .eq('id', connectionId)
          
          accessToken = tokenData.access_token
          console.log('Token refreshed successfully')
        } else {
          throw new Error('Token refresh failed')
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        
        // Mark as expired if refresh fails
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'expired',
            setup_required_reason: 'Token refresh failed - please reconnect'
          })
          .eq('id', connectionId)
        
        throw new Error('Token expired and refresh failed, please reconnect your account')
      }
    }

    // Use region-specific API endpoint
    const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api.amazon.com'
    console.log('Using API endpoint:', apiEndpoint)

    // PHASE 1: Sync entity structure (campaigns, ad groups, keywords)
    console.log('🚀 Starting comprehensive Amazon Ads data sync...')
    
    // Fetch campaigns first
    console.log('📊 Fetching campaigns...')
    const campaignsResponse = await fetch(`${apiEndpoint}/v2/campaigns`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': connection.profile_id,
      },
    })

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text()
      console.error('Campaigns API error:', campaignsResponse.status, errorText)
      throw new Error(`Failed to fetch campaigns: ${campaignsResponse.status} ${errorText}`)
    }

    const campaignsData = await campaignsResponse.json()
    console.log(`✅ Retrieved ${campaignsData.length} campaigns`)

    // If no campaigns, treat as benign outcome
    if (!Array.isArray(campaignsData) || campaignsData.length === 0) {
      await supabase
        .from('amazon_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connectionId)

      console.log('ℹ️ No campaigns found for this profile')
      return new Response(
        JSON.stringify({
          success: false,
          code: 'NO_CAMPAIGNS',
          message: 'No campaigns found for this profile.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Store campaigns with basic data
    const campaignMap = new Map()
    const campaignIds: string[] = []
    
    for (const campaign of campaignsData) {
      if (!campaign.campaignId || !campaign.name) {
        console.warn('⚠️ Skipping invalid campaign:', campaign)
        continue
      }

      campaignIds.push(campaign.campaignId.toString())
      
      const { data: storedCampaign } = await supabase
        .from('campaigns')
        .upsert({
          connection_id: connectionId,
          amazon_campaign_id: campaign.campaignId.toString(),
          name: campaign.name,
          campaign_type: campaign.campaignType,
          targeting_type: campaign.targetingType,
          status: campaign.state ? campaign.state.toLowerCase() : 'unknown',
          daily_budget: campaign.dailyBudget || null,
          start_date: campaign.startDate || null,
          end_date: campaign.endDate || null,
        }, {
          onConflict: 'connection_id, amazon_campaign_id'
        })
        .select('id, amazon_campaign_id')
        .single()

      if (storedCampaign) {
        campaignMap.set(campaign.campaignId.toString(), storedCampaign)
      }
    }

    // Sync ad groups for each campaign
    console.log('📝 Syncing ad groups...')
    const adGroupMap = new Map()
    const adGroupIds: string[] = []
    
    for (const [campaignId, storedCampaign] of campaignMap.entries()) {
      const adGroupsResponse = await fetch(`${apiEndpoint}/v2/adGroups?campaignIdFilter=${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
        },
      })

      if (adGroupsResponse.ok) {
        const adGroupsData = await adGroupsResponse.json()
        console.log(`  📁 Campaign ${campaignId}: ${adGroupsData.length} ad groups`)
        
        for (const adGroup of adGroupsData) {
          if (!adGroup.adGroupId || !adGroup.name) continue
          
          adGroupIds.push(adGroup.adGroupId.toString())
          
          const { data: storedAdGroup } = await supabase
            .from('ad_groups')
            .upsert({
              campaign_id: storedCampaign.id,
              amazon_adgroup_id: adGroup.adGroupId.toString(),
              name: adGroup.name,
              status: adGroup.state ? adGroup.state.toLowerCase() : 'enabled',
              default_bid: adGroup.defaultBid,
            }, {
              onConflict: 'campaign_id, amazon_adgroup_id'
            })
            .select('id, amazon_adgroup_id')
            .single()

          if (storedAdGroup) {
            adGroupMap.set(adGroup.adGroupId.toString(), storedAdGroup)
          }
        }
      }
    }

    // Sync keywords for each ad group
    console.log('🔑 Syncing keywords...')
    const keywordIds: string[] = []
    
    for (const [adGroupId, storedAdGroup] of adGroupMap.entries()) {
      const keywordsResponse = await fetch(`${apiEndpoint}/v2/keywords?adGroupIdFilter=${adGroupId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
        },
      })

      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json()
        console.log(`  🔤 Ad Group ${adGroupId}: ${keywordsData.length} keywords`)
        
        for (const keyword of keywordsData) {
          if (!keyword.keywordId || !keyword.keywordText) continue
          
          keywordIds.push(keyword.keywordId.toString())
          
          await supabase
            .from('keywords')
            .upsert({
              adgroup_id: storedAdGroup.id,
              amazon_keyword_id: keyword.keywordId.toString(),
              keyword_text: keyword.keywordText,
              match_type: keyword.matchType || 'exact',
              bid: keyword.bid || null,
              status: keyword.state ? keyword.state.toLowerCase() : 'enabled',
            }, {
              onConflict: 'adgroup_id, amazon_keyword_id'
            })
        }
      }
    }

    console.log(`📊 Entity sync complete: ${campaignIds.length} campaigns, ${adGroupIds.length} ad groups, ${keywordIds.length} keywords`)

    // PHASE 2: Fetch performance data via proper Reporting API
    console.log('⚡ Starting performance data sync...')
    let totalMetricsUpdated = 0

    // Define columns using correct Amazon API v3 column names
    const campaignColumns = [
      'campaignId', 'impressions', 'clicks', 'cost',
      'attributedSales7d', 'attributedConversions7d', 'attributedSales14d', 'attributedConversions14d'
    ]
    
    const adGroupColumns = [
      'adGroupId', 'impressions', 'clicks', 'cost',
      'attributedSales7d', 'attributedConversions7d', 'attributedSales14d', 'attributedConversions14d'
    ]
    
    const keywordColumns = [
      'keywordId', 'targetId', 'impressions', 'clicks', 'cost',
      'attributedSales7d', 'attributedConversions7d', 'attributedSales14d', 'attributedConversions14d',
      'keywordText', 'matchType'
    ]

    // Campaign Performance
    if (campaignIds.length > 0) {
      console.log('📈 Fetching campaign performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'campaigns', campaignColumns, campaignIds
        )
        
        const report = await pollReportStatus(
          apiEndpoint, accessToken, clientId, connection.profile_id, reportId
        )
        
        const performanceData = await downloadAndParseReport(report.url!)
        console.log(`💾 Processing ${performanceData.length} campaign performance records`)
        console.log('Campaign report sample keys:', Object.keys(performanceData[0] || {}))
        
        // Update campaigns with performance data
        for (const perf of performanceData) {
          if (!perf.campaignId) continue
          
          const anyPerf = perf as any
          // Calculate metrics with robust fallbacks for v3 field names
          const impressions = Number(anyPerf.impressions ?? 0)
          const clicks = Number(anyPerf.clicks ?? 0)
          const spend = Number(anyPerf.cost ?? 0)
          const sales7d = Number(anyPerf.attributedSales7d ?? anyPerf.sales7d ?? 0)
          const sales14d = Number(anyPerf.attributedSales14d ?? anyPerf.sales14d ?? 0)
          const orders7d = Number(anyPerf.attributedConversions7d ?? anyPerf.purchases7d ?? anyPerf.unitsOrdered7d ?? 0)
          const orders14d = Number(anyPerf.attributedConversions14d ?? anyPerf.purchases14d ?? anyPerf.unitsOrdered14d ?? 0)
          
          // Derived metrics
          const ctr7d = impressions > 0 ? (clicks / impressions) * 100 : 0
          const ctr14d = ctr7d
          const cpc7d = clicks > 0 ? spend / clicks : 0
          const cpc14d = cpc7d
          const acos7d = sales7d > 0 ? (spend / sales7d) * 100 : 0
          const acos14d = sales14d > 0 ? (spend / sales14d) * 100 : 0
          const roas7d = spend > 0 ? sales7d / spend : 0
          const roas14d = spend > 0 ? sales14d / spend : 0
          const convRate7d = clicks > 0 ? (orders7d / clicks) * 100 : 0
          const convRate14d = clicks > 0 ? (orders14d / clicks) * 100 : 0

          await supabase
            .from('campaigns')
            .update({
              impressions,
              clicks,
              spend,
              sales: sales14d, // Use 14d as primary
              orders: orders14d,
              acos: acos14d,
              roas: roas14d,
              // 7d metrics
              sales_7d: sales7d,
              orders_7d: orders7d,
              acos_7d: acos7d,
              roas_7d: roas7d,
              ctr_7d: ctr7d,
              cpc_7d: cpc7d,
              conversion_rate_7d: convRate7d,
              clicks_7d: clicks,
              impressions_7d: impressions,
              spend_7d: spend,
              // 14d metrics
              sales_14d: sales14d,
              orders_14d: orders14d,
              acos_14d: acos14d,
              roas_14d: roas14d,
              ctr_14d: ctr14d,
              cpc_14d: cpc14d,
              conversion_rate_14d: convRate14d,
              clicks_14d: clicks,
              impressions_14d: impressions,
              spend_14d: spend,
              last_updated: new Date().toISOString()
            })
            .eq('connection_id', connectionId)
            .eq('amazon_campaign_id', perf.campaignId.toString())
          
          totalMetricsUpdated++
        }
      } catch (error) {
        console.error('❌ Campaign performance sync failed:', error)
      }
    }

    // Ad Group Performance  
    if (adGroupIds.length > 0) {
      console.log('📊 Fetching ad group performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'adGroups', adGroupColumns, adGroupIds
        )
        
        const report = await pollReportStatus(
          apiEndpoint, accessToken, clientId, connection.profile_id, reportId
        )
        
        const performanceData = await downloadAndParseReport(report.url!)
        console.log(`💾 Processing ${performanceData.length} ad group performance records`)
        console.log('AdGroup report sample keys:', Object.keys(performanceData[0] || {}))
        
        for (const perf of performanceData) {
          if (!perf.adGroupId) continue
          
          const anyPerf = perf as any
          const impressions = Number(anyPerf.impressions ?? 0)
          const clicks = Number(anyPerf.clicks ?? 0)
          const spend = Number(anyPerf.cost ?? 0)
          const sales7d = Number(anyPerf.attributedSales7d ?? anyPerf.sales7d ?? 0)
          const sales14d = Number(anyPerf.attributedSales14d ?? anyPerf.sales14d ?? 0)
          const orders7d = Number(anyPerf.attributedConversions7d ?? anyPerf.purchases7d ?? anyPerf.unitsOrdered7d ?? 0)
          const orders14d = Number(anyPerf.attributedConversions14d ?? anyPerf.purchases14d ?? anyPerf.unitsOrdered14d ?? 0)
          
          const ctr7d = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc7d = clicks > 0 ? spend / clicks : 0
          const acos7d = sales7d > 0 ? (spend / sales7d) * 100 : 0
          const acos14d = sales14d > 0 ? (spend / sales14d) * 100 : 0
          const roas7d = spend > 0 ? sales7d / spend : 0
          const roas14d = spend > 0 ? sales14d / spend : 0
          const convRate7d = clicks > 0 ? (orders7d / clicks) * 100 : 0
          const convRate14d = clicks > 0 ? (orders14d / clicks) * 100 : 0

          // Find the ad group by amazon ID through campaigns
          const { data: adGroupRecord } = await supabase
            .from('ad_groups')
            .select('id')
            .eq('amazon_adgroup_id', perf.adGroupId.toString())
            .single()
          
          if (adGroupRecord) {
            await supabase
              .from('ad_groups')
              .update({
                impressions,
                clicks,
                spend,
                sales: sales14d,
                orders: orders14d,
                acos: acos14d,
                roas: roas14d,
                // 7d metrics
                sales_7d: sales7d,
                orders_7d: orders7d,
                acos_7d: acos7d,
                roas_7d: roas7d,
                ctr_7d: ctr7d,
                cpc_7d: cpc7d,
                conversion_rate_7d: convRate7d,
                clicks_7d: clicks,
                impressions_7d: impressions,
                spend_7d: spend,
                // 14d metrics
                sales_14d: sales14d,
                orders_14d: orders14d,
                acos_14d: acos14d,
                roas_14d: roas14d,
                ctr_14d: ctr7d,
                cpc_14d: cpc7d,
                conversion_rate_14d: convRate14d,
                clicks_14d: clicks,
                impressions_14d: impressions,
                spend_14d: spend,
                last_updated: new Date().toISOString()
              })
              .eq('id', adGroupRecord.id)
            
            totalMetricsUpdated++
          }
        }
      } catch (error) {
        console.error('❌ Ad group performance sync failed:', error)
      }
    }

    // Keyword Performance
    if (keywordIds.length > 0) {
      console.log('🔑 Fetching keyword performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'keywords', keywordColumns, keywordIds
        )
        
        const report = await pollReportStatus(
          apiEndpoint, accessToken, clientId, connection.profile_id, reportId
        )
        
        const performanceData = await downloadAndParseReport(report.url!)
        console.log(`💾 Processing ${performanceData.length} keyword performance records`)
        console.log('Keyword report sample keys:', Object.keys(performanceData[0] || {}))
        
        for (const perf of performanceData) {
          const anyPerf = perf as any
          
          const impressions = Number(anyPerf.impressions ?? 0)
          const clicks = Number(anyPerf.clicks ?? 0)
          const spend = Number(anyPerf.cost ?? 0)
          const sales7d = Number(anyPerf.attributedSales7d ?? anyPerf.sales7d ?? 0)
          const sales14d = Number(anyPerf.attributedSales14d ?? anyPerf.sales14d ?? 0)
          const orders7d = Number(anyPerf.attributedConversions7d ?? anyPerf.purchases7d ?? anyPerf.unitsOrdered7d ?? 0)
          const orders14d = Number(anyPerf.attributedConversions14d ?? anyPerf.purchases14d ?? anyPerf.unitsOrdered14d ?? 0)
          
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc = clicks > 0 ? spend / clicks : 0
          const acos7d = sales7d > 0 ? (spend / sales7d) * 100 : 0
          const acos14d = sales14d > 0 ? (spend / sales14d) * 100 : 0
          const roas7d = spend > 0 ? sales7d / spend : 0
          const roas14d = spend > 0 ? sales14d / spend : 0
          const convRate7d = clicks > 0 ? (orders7d / clicks) * 100 : 0
          const convRate14d = clicks > 0 ? (orders14d / clicks) * 100 : 0

          const idToMatch = (anyPerf.keywordId ?? anyPerf.targetId)
          if (!idToMatch) continue

          const { data: keywordRecord } = await supabase
            .from('keywords')
            .select('id')
            .eq('amazon_keyword_id', idToMatch.toString())
            .single()
          
          if (keywordRecord) {
            await supabase
              .from('keywords')
              .update({
                impressions,
                clicks,
                spend,
                sales: sales14d,
                orders: orders14d,
                acos: acos14d,
                roas: roas14d,
                ctr,
                cpc,
                conversion_rate: convRate14d,
                // 7d metrics
                sales_7d: sales7d,
                orders_7d: orders7d,
                acos_7d: acos7d,
                roas_7d: roas7d,
                ctr_7d: ctr,
                cpc_7d: cpc,
                conversion_rate_7d: convRate7d,
                clicks_7d: clicks,
                impressions_7d: impressions,
                spend_7d: spend,
                // 14d metrics
                sales_14d: sales14d,
                orders_14d: orders14d,
                acos_14d: acos14d,
                roas_14d: roas14d,
                ctr_14d: ctr,
                cpc_14d: cpc,
                conversion_rate_14d: convRate14d,
                clicks_14d: clicks,
                impressions_14d: impressions,
                spend_14d: spend,
                last_updated: new Date().toISOString()
              })
              .eq('id', keywordRecord.id)
            
            totalMetricsUpdated++
          }
        }
      } catch (error) {
        console.error('❌ Keyword performance sync failed:', error)
      }
    }

    // Update connection sync status
    await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        reporting_api_version: 'v3'
      })
      .eq('id', connectionId)

    console.log(`🎉 Complete sync finished: ${totalMetricsUpdated} metrics updated`)

    if (totalMetricsUpdated === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'NO_METRICS_UPDATED',
          message: 'Synced entities, but no performance metrics were updated.',
          entitiesSynced: {
            campaigns: campaignIds.length,
            adGroups: adGroupIds.length, 
            keywords: keywordIds.length
          },
          metricsUpdated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        code: 'SYNC_COMPLETE',
        message: `Comprehensive sync completed with full performance data`,
        entitiesSynced: {
          campaigns: campaignIds.length,
          adGroups: adGroupIds.length,
          keywords: keywordIds.length
        },
        metricsUpdated: totalMetricsUpdated,
        apiVersion: 'v3'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
