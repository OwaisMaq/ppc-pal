
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// AES-GCM helpers for token encryption at rest
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function getKey() {
  const secret = Deno.env.get('ENCRYPTION_KEY') || '';
  const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt','decrypt']);
}
async function encryptText(plain: string): Promise<string> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await getKey();
    const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plain));
    return `${toBase64(iv)}:${toBase64(new Uint8Array(buf))}`;
  } catch { return plain; }
}
async function decryptText(enc: string): Promise<string> {
  try {
    if (!enc || !enc.includes(':')) return enc;
    const [ivB64, dataB64] = enc.split(':');
    const iv = fromBase64(ivB64);
    const key = await getKey();
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(dataB64));
    return textDecoder.decode(buf);
  } catch { return enc; }
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

async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 4): Promise<Response> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res
      const status = res.status
      if (status === 408 || status === 429 || (status >= 500 && status <= 599)) {
        console.warn(`Transient ${status} for ${url}, attempt ${attempt + 1}/${maxAttempts}`)
        await waitWithExponentialBackoff(attempt)
        continue
      }
      return res
    } catch (err) {
      console.warn(`Network error for ${url} attempt ${attempt + 1}/${maxAttempts}:`, err)
      await waitWithExponentialBackoff(attempt)
    }
  }
  return await fetch(url, options)
}

async function createReportRequest(
  apiEndpoint: string,
  accessToken: string, 
  clientId: string,
  profileId: string,
  reportType: string,
  columns: string[],
  entityIds?: string[],
   opts?: { dateRangeDays?: number; timeUnit?: 'SUMMARY' | 'DAILY'; skipEntityFilter?: boolean; startDate?: string; endDate?: string }
 ): Promise<string> {
  const groupBy = reportType === 'campaigns' 
    ? ['campaign'] 
    : reportType === 'adGroups' 
    ? ['adGroup'] 
    : reportType === 'keywords'
    ? ['keyword']
    : ['targeting']
  const reportTypeId = reportType === 'campaigns' 
    ? 'spCampaigns' 
    : reportType === 'adGroups' 
    ? 'spAdGroups' 
    : 'spTargeting'

   const requestedRange = opts?.dateRangeDays ?? 90
   const dateRangeDays = Math.min(requestedRange, 90)
   // Allow explicit window override for chunking
   const endDateStr = opts?.endDate || new Date().toISOString().split('T')[0]
   const startDateStr = opts?.startDate || new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
 
   const payload: any = {
     name: `${reportType}_${Date.now()}`,
     startDate: startDateStr,
     endDate: endDateStr,
     configuration: {
       adProduct: 'SPONSORED_PRODUCTS',
       groupBy,
       columns,
       reportTypeId,
       timeUnit: opts?.timeUnit ?? 'SUMMARY',
       format: 'GZIP_JSON'
     }
   }

  // v3 filtering uses top-level filters with field names
  if (!opts?.skipEntityFilter && entityIds && entityIds.length > 0) {
    const field = reportType === 'campaigns' 
      ? 'campaignId' 
      : reportType === 'adGroups' 
      ? 'adGroupId' 
      : reportType === 'keywords'
      ? 'keywordId'
      : 'targetId'
    payload.filters = [{ field, values: entityIds }]
  }

  // If requesting keyword performance via v3 targeting reports, restrict to keyword rows
  if (reportType === 'keywords') {
    payload.filters = [
      ...(payload.filters ?? []),
      { field: 'keywordType', values: ['BROAD', 'PHRASE', 'EXACT'] },
    ]
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
    const errorText = await response.text().catch(() => '')
    // Handle duplicate request (HTTP 425) by extracting existing reportId
    if (response.status === 425) {
      try {
        const maybeJson = (() => { try { return JSON.parse(errorText) } catch { return null } })()
        const detail: string = maybeJson?.detail || errorText || ''
        const match = detail.match(/[0-9a-fA-F-]{36}/)
        if (match) {
          const dupId = match[0]
          console.log('Duplicate report detected, using existing reportId:', dupId)
          return dupId
        }
      } catch (_) {}
    }
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

    const { connectionId, dateRangeDays, diagnosticMode, timeUnit } = await req.json()
    const dateRange = Number(dateRangeDays) || 90
    const diag = Boolean(diagnosticMode)
    const timeUnitOpt: 'SUMMARY' | 'DAILY' = (timeUnit === 'DAILY' ? 'DAILY' : 'SUMMARY')
    console.log('Syncing data for connection:', connectionId, 'dateRangeDays:', dateRange, 'diagnosticMode:', diag)
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

    const accessTokenDecrypted = await decryptText(connection.access_token)
    const refreshTokenDecrypted = await decryptText(connection.refresh_token)

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
    
    let accessToken = accessTokenDecrypted
    
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
            refresh_token: refreshTokenDecrypted,
            client_id: clientId!,
            client_secret: clientSecret,
          }),
        })

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json()
          const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
          
          // Update connection with new tokens (encrypt at rest)
          const encAccess = await encryptText(tokenData.access_token)
          const encRefresh = await encryptText(tokenData.refresh_token || refreshTokenDecrypted)

          await supabase
            .from('amazon_connections')
            .update({
              access_token: encAccess,
              refresh_token: encRefresh,
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
     const campaignsResponse = await fetchWithRetry(`${apiEndpoint}/v2/campaigns`, {
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
     console.log(`✅ Retrieved ${Array.isArray(campaignsData) ? campaignsData.length : 0} campaigns`)
 
     // If no campaigns, still proceed with performance sync using fallbacks
     if (!Array.isArray(campaignsData) || campaignsData.length === 0) {
       await supabase
         .from('amazon_connections')
         .update({ last_sync_at: new Date().toISOString(), campaign_count: 0, reporting_api_version: 'v3' })
         .eq('id', connectionId)
 
       console.log('ℹ️ No campaigns found for this profile — proceeding with unfiltered reports fallback')
       // do NOT return; continue to performance phase with unfiltered reports
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
      const adGroupsResponse = await fetchWithRetry(`${apiEndpoint}/v2/adGroups?campaignIdFilter=${campaignId}`, {
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
      const keywordsResponse = await fetchWithRetry(`${apiEndpoint}/v2/keywords?adGroupIdFilter=${adGroupId}`, {
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

    // Sync targets for each ad group (auto-targeting)
    console.log('🎯 Syncing targets...')
    const targetIds: string[] = []

    for (const [adGroupId, storedAdGroup] of adGroupMap.entries()) {
      const targetsResponse = await fetchWithRetry(`${apiEndpoint}/v2/sp/targets?adGroupIdFilter=${adGroupId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
        },
      })

      if (targetsResponse.ok) {
        const targetsData = await targetsResponse.json()
        console.log(`  🎯 Ad Group ${adGroupId}: ${targetsData.length} targets`)
        for (const t of targetsData) {
          if (!t.targetId) continue
          targetIds.push(t.targetId.toString())

          await supabase
            .from('targets')
            .upsert({
              adgroup_id: storedAdGroup.id,
              amazon_target_id: t.targetId.toString(),
              expression: t.expression ?? null,
              type: t.expressionType ?? null,
              bid: t.bid ?? null,
              status: t.state ? t.state.toLowerCase() : 'enabled',
            }, {
              onConflict: 'adgroup_id, amazon_target_id'
            })
        }
      } else {
        const errTxt = await targetsResponse.text().catch(() => '')
        console.error(`❌ Targets API error for adGroup ${adGroupId}:`, targetsResponse.status, errTxt)
      }
    }

    console.log(`📊 Entity sync complete: ${campaignIds.length} campaigns, ${adGroupIds.length} ad groups, ${keywordIds.length} keywords, ${targetIds.length} targets`)

    // Initialize diagnostics
    const diagnostics: any = {
       writeErrors: [],
       backfilled: { keywords: 0, targets: 0 },
       keyword: {
         totalKeywords: keywordIds.length,
         filteredIdsUsed: 0,
         reportRows: 0,
         nonZeroClickRows: 0,
         matchedRows: 0,
         timeUnit: '',
         dateRangeDays: 0,
         diagnosticMode: diag
       }
     }

    // PHASE 2: Fetch performance data via proper Reporting API
    console.log('⚡ Starting performance data sync...')
    let totalMetricsUpdated = 0

    // Define columns using correct Amazon API v3 column names
    const campaignColumns = ['campaignId','impressions','clicks','spend','sales14d','purchases14d']
    const adGroupColumns = ['adGroupId','campaignId','impressions','clicks','spend','sales14d','purchases14d']
    const targetColumns = ['targetId','adGroupId','campaignId','impressions','clicks','spend','sales14d','purchases14d']
    const keywordColumns = ['keywordId','adGroupId','campaignId','keywordText','matchType','impressions','clicks','spend','sales14d','purchases14d']

    // Minimal columns fallback (in case of config errors)
    const minCampaignColumns = ['campaignId','impressions','clicks','spend','sales14d','purchases14d']
    const minAdGroupColumns = ['adGroupId','impressions','clicks','spend','sales14d','purchases14d']
    const minTargetColumns = ['targetId','impressions','clicks','spend','sales14d','purchases14d']
    const minKeywordColumns = ['keywordId','impressions','clicks','spend','sales14d','purchases14d']

    // Campaign Performance
    if (campaignIds.length > 0) {
      console.log('📈 Fetching campaign performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'campaigns', campaignColumns, campaignIds, { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
        )
        const report = await pollReportStatus(
          apiEndpoint, accessToken, clientId, connection.profile_id, reportId
        )
        const performanceData = await downloadAndParseReport(report.url!)
        console.log(`💾 Processing ${performanceData.length} campaign performance records`)
        console.log('Campaign report sample keys:', Object.keys(performanceData[0] || {}))
        // Upsert campaigns with performance data (ensures rows exist)
        for (const perf of performanceData) {
          if (!perf.campaignId) continue
          const anyPerf = perf as any
          const impressions = Number(anyPerf.impressions ?? 0)
          const clicks = Number(anyPerf.clicks ?? 0)
          const spend = Number(anyPerf.spend ?? anyPerf.cost ?? 0)
          const sales7d = Number(anyPerf.sales7d ?? anyPerf.attributedSales7d ?? 0)
          const sales14d = Number(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? 0)
          const orders7d = Number(anyPerf.purchases7d ?? anyPerf.attributedConversions7d ?? 0)
          const orders14d = Number(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? 0)
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

          const { error: campErr } = await supabase
            .from('campaigns')
            .upsert({
              connection_id: connectionId,
              amazon_campaign_id: perf.campaignId.toString(),
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
              ctr_14d: ctr14d,
              cpc_14d: cpc14d,
              conversion_rate_14d: convRate14d,
              clicks_14d: clicks,
              impressions_14d: impressions,
              spend_14d: spend,
              last_updated: new Date().toISOString()
            }, { onConflict: 'connection_id, amazon_campaign_id' })
          
          if (campErr) {
            diagnostics.writeErrors.push({ entity: 'campaign', id: perf.campaignId?.toString?.(), error: campErr.message })
          } else {
            totalMetricsUpdated++
          }
        }
      } catch (error) {
        console.error('❌ Campaign performance sync failed:', error)
        console.log('🔁 Retrying campaign report with minimal columns...')
        try {
          const reportId = await createReportRequest(
            apiEndpoint, accessToken, clientId, connection.profile_id,
            'campaigns', minCampaignColumns, campaignIds, { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
          )
          const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
          const performanceData = await downloadAndParseReport(report.url!)
          diagnostics.campaignMinimalColumnsFallbackUsed = true
          for (const perf of performanceData) {
            if (!perf.campaignId) continue
            const anyPerf = perf as any
            const impressions = Number(anyPerf.impressions ?? 0)
            const clicks = Number(anyPerf.clicks ?? 0)
            const spend = Number(anyPerf.spend ?? anyPerf.cost ?? 0)
            const sales14d = Number(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? 0)
            const orders14d = Number(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? 0)
            const ctr14d = impressions > 0 ? (clicks / impressions) * 100 : 0
            const cpc14d = clicks > 0 ? spend / clicks : 0
            const acos14d = sales14d > 0 ? (spend / sales14d) * 100 : 0
            const roas14d = spend > 0 ? sales14d / spend : 0

            const { error: campErr } = await supabase
              .from('campaigns')
              .upsert({
                connection_id: connectionId,
                amazon_campaign_id: perf.campaignId.toString(),
                impressions,
                clicks,
                spend,
                sales: sales14d,
                orders: orders14d,
                acos: acos14d,
                roas: roas14d,
                ctr_14d: ctr14d,
                cpc_14d: cpc14d,
                clicks_14d: clicks,
                impressions_14d: impressions,
                spend_14d: spend,
                last_updated: new Date().toISOString()
              }, { onConflict: 'connection_id, amazon_campaign_id' })
            if (campErr) {
              diagnostics.writeErrors.push({ entity: 'campaign_min_fallback', id: perf.campaignId?.toString?.(), error: campErr.message })
            } else {
              totalMetricsUpdated++
            }
          }
        } catch (err2) {
          console.error('❌ Minimal-columns campaign report also failed:', err2)
        }
      }
    } else {
      // Fallback: no campaign IDs from v2, request unfiltered campaign report and upsert metrics
      console.log('📈 Fallback: fetching unfiltered campaign performance (no ID filter)')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'campaigns', campaignColumns, undefined, { dateRangeDays: dateRange, timeUnit: timeUnitOpt, skipEntityFilter: true }
        )
        const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
        const performanceData = await downloadAndParseReport(report.url!)
        console.log(`💾 Processing ${performanceData.length} fallback campaign performance records`)
        diagnostics.fallbackUnfilteredCampaignReportUsed = true
        for (const perf of performanceData) {
          if (!perf.campaignId) continue
          const anyPerf = perf as any
          const impressions = Number(anyPerf.impressions ?? 0)
          const clicks = Number(anyPerf.clicks ?? 0)
          const spend = Number(anyPerf.spend ?? anyPerf.cost ?? 0)
          const sales7d = Number(anyPerf.sales7d ?? anyPerf.attributedSales7d ?? 0)
          const sales14d = Number(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? 0)
          const orders7d = Number(anyPerf.purchases7d ?? anyPerf.attributedConversions7d ?? 0)
          const orders14d = Number(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? 0)
          const ctr7d = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc7d = clicks > 0 ? spend / clicks : 0
          const acos7d = sales7d > 0 ? (spend / sales7d) * 100 : 0
          const acos14d = sales14d > 0 ? (spend / sales14d) * 100 : 0
          const roas7d = spend > 0 ? sales7d / spend : 0
          const roas14d = spend > 0 ? sales14d / spend : 0
          const convRate7d = clicks > 0 ? (orders7d / clicks) * 100 : 0
          const convRate14d = clicks > 0 ? (orders14d / clicks) * 100 : 0

          const { error: campErr } = await supabase
            .from('campaigns')
            .upsert({
              connection_id: connectionId,
              amazon_campaign_id: perf.campaignId.toString(),
              impressions,
              clicks,
              spend,
              sales: sales14d,
              orders: orders14d,
              acos: acos14d,
              roas: roas14d,
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
            }, { onConflict: 'connection_id, amazon_campaign_id' })

          if (campErr) {
            diagnostics.writeErrors.push({ entity: 'campaign', id: perf.campaignId?.toString?.(), error: campErr.message })
          } else {
            totalMetricsUpdated++
          }
        }
      } catch (error) {
        console.error('❌ Fallback unfiltered campaign performance sync failed:', error)
      }
    }

    // Ad Group Performance  
    if (adGroupIds.length > 0) {
      console.log('📊 Fetching ad group performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'adGroups', adGroupColumns, adGroupIds, { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
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
          const spend = Number(anyPerf.spend ?? anyPerf.cost ?? 0)
          const sales7d = Number(anyPerf.sales7d ?? anyPerf.attributedSales7d ?? 0)
          const sales14d = Number(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? 0)
          const orders7d = Number(anyPerf.purchases7d ?? anyPerf.attributedConversions7d ?? 0)
          const orders14d = Number(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? 0)
          
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
            const { error: agErr } = await supabase
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
            
            if (agErr) {
              diagnostics.writeErrors.push({ entity: 'ad_group', id: perf.adGroupId?.toString?.(), error: agErr.message })
            } else {
              totalMetricsUpdated++
            }
          }
        }
      } catch (error) {
        console.error('❌ Ad group performance sync failed:', error)
        console.log('🔁 Retrying ad group report with minimal columns...')
        try {
          const reportId = await createReportRequest(
            apiEndpoint, accessToken, clientId, connection.profile_id,
            'adGroups', minAdGroupColumns, adGroupIds, { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
          )
          const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
          const performanceData = await downloadAndParseReport(report.url!)
          diagnostics.adGroupMinimalColumnsFallbackUsed = true
          for (const perf of performanceData) {
            if (!perf.adGroupId) continue
            const anyPerf = perf as any
            const impressions = Number(anyPerf.impressions ?? 0)
            const clicks = Number(anyPerf.clicks ?? 0)
            const spend = Number(anyPerf.spend ?? anyPerf.cost ?? 0)
            const sales14d = Number(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? 0)
            const orders14d = Number(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? 0)
            const ctr14d = impressions > 0 ? (clicks / impressions) * 100 : 0
            const cpc14d = clicks > 0 ? spend / clicks : 0
            const acos14d = sales14d > 0 ? (spend / sales14d) * 100 : 0
            const roas14d = spend > 0 ? sales14d / spend : 0
            const { data: agRecord } = await supabase
              .from('ad_groups')
              .select('id')
              .eq('amazon_adgroup_id', perf.adGroupId.toString())
              .maybeSingle()
            if (agRecord?.id) {
              const { error: agErr } = await supabase
                .from('ad_groups')
                .update({
                  impressions,
                  clicks,
                  spend,
                  sales: sales14d,
                  orders: orders14d,
                  acos: acos14d,
                  roas: roas14d,
                  ctr_14d: ctr14d,
                  cpc_14d: cpc14d,
                  clicks_14d: clicks,
                  impressions_14d: impressions,
                  spend_14d: spend,
                  last_updated: new Date().toISOString()
                })
                .eq('id', agRecord.id)
              if (agErr) {
                diagnostics.writeErrors.push({ entity: 'ad_group_min_fallback', id: perf.adGroupId?.toString?.(), error: agErr.message })
              } else {
                totalMetricsUpdated++
              }
            }
          }
        } catch (err2) {
          console.error('❌ Minimal-columns ad group report also failed:', err2)
        }
      }
    } else {
      console.log('📊 Fallback: fetching unfiltered ad group performance (no ID filter)')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'adGroups', adGroupColumns, undefined, { dateRangeDays: dateRange, timeUnit: timeUnitOpt, skipEntityFilter: true }
        )
        const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
        const performanceData = await downloadAndParseReport(report.url!)
        for (const perf of performanceData) {
          if (!perf.adGroupId) continue
          const anyPerf = perf as any
          const impressions = Number(anyPerf.impressions ?? 0)
          const clicks = Number(anyPerf.clicks ?? 0)
          const spend = Number(anyPerf.spend ?? anyPerf.cost ?? 0)
          const sales7d = Number(anyPerf.sales7d ?? anyPerf.attributedSales7d ?? 0)
          const sales14d = Number(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? 0)
          const orders7d = Number(anyPerf.purchases7d ?? anyPerf.attributedConversions7d ?? 0)
          const orders14d = Number(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? 0)
          const ctr7d = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc7d = clicks > 0 ? spend / clicks : 0
          const acos7d = sales7d > 0 ? (spend / sales7d) * 100 : 0
          const acos14d = sales14d > 0 ? (spend / sales14d) * 100 : 0
          const roas7d = spend > 0 ? sales7d / spend : 0
          const roas14d = spend > 0 ? sales14d / spend : 0
          const convRate7d = clicks > 0 ? (orders7d / clicks) * 100 : 0
          const convRate14d = clicks > 0 ? (orders14d / clicks) * 100 : 0

          const { data: agRecord } = await supabase
            .from('ad_groups')
            .select('id')
            .eq('amazon_adgroup_id', perf.adGroupId.toString())
            .maybeSingle()

          if (agRecord?.id) {
            const { error: agErr } = await supabase
              .from('ad_groups')
              .update({
                impressions,
                clicks,
                spend,
                sales: sales14d,
                orders: orders14d,
                acos: acos14d,
                roas: roas14d,
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
              .eq('id', agRecord.id)
            if (agErr) {
              diagnostics.writeErrors.push({ entity: 'ad_group_fallback', id: perf.adGroupId?.toString?.(), error: agErr.message })
            } else {
              totalMetricsUpdated++
            }
          }
        }
      } catch (error) {
        console.error('❌ Fallback unfiltered ad group performance sync failed:', error)
      }
    }

    // Targets Performance
    if (typeof targetIds !== 'undefined' && targetIds.length > 0) {
      console.log('🎯 Fetching target performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'targets', targetColumns, targetIds, { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
        )
        const report = await pollReportStatus(
          apiEndpoint, accessToken, clientId, connection.profile_id, reportId
        )
        const performanceData = await downloadAndParseReport(report.url!)
        console.log(`💾 Processing ${performanceData.length} target performance records`)
        for (const perf of performanceData) {
          const anyPerf = perf as any
          const targetId = anyPerf.targetId ?? anyPerf.keywordId
          if (!targetId) continue
          const impressions = Number(anyPerf.impressions ?? 0)
          const clicks = Number(anyPerf.clicks ?? 0)
          const spend = Number(anyPerf.spend ?? anyPerf.cost ?? 0)
          const sales7d = Number(anyPerf.sales7d ?? anyPerf.attributedSales7d ?? 0)
          const sales14d = Number(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? 0)
          const orders7d = Number(anyPerf.purchases7d ?? anyPerf.attributedConversions7d ?? 0)
          const orders14d = Number(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? 0)
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc = clicks > 0 ? spend / clicks : 0
          const acos7d = sales7d > 0 ? (spend / sales7d) * 100 : 0
          const acos14d = sales14d > 0 ? (spend / sales14d) * 100 : 0
          const roas7d = spend > 0 ? sales7d / spend : 0
          const roas14d = spend > 0 ? sales14d / spend : 0
          const convRate7d = clicks > 0 ? (orders7d / clicks) * 100 : 0
          const convRate14d = clicks > 0 ? (orders14d / clicks) * 100 : 0

          const { data: tgtUpd, error: tgtErr } = await supabase
            .from('targets')
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
              // 7d
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
              // 14d
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
            .eq('amazon_target_id', targetId.toString())
            .select('id')

          if (tgtErr) {
            diagnostics.writeErrors.push({ entity: 'target', id: targetId?.toString?.(), error: tgtErr.message })
          } else if (tgtUpd && tgtUpd.length > 0) {
            totalMetricsUpdated++
          } else {
            // Backfill missing target using adGroupId from report
            const agAmazonId = anyPerf.adGroupId?.toString?.()
            if (agAmazonId) {
              const { data: ag } = await supabase
                .from('ad_groups')
                .select('id')
                .eq('amazon_adgroup_id', agAmazonId)
                .maybeSingle()
              if (ag?.id) {
                const { error: upErr } = await supabase
                  .from('targets')
                  .upsert({
                    adgroup_id: ag.id,
                    amazon_target_id: targetId.toString(),
                    type: anyPerf.expressionType ?? null,
                    expression: anyPerf.expression ?? null,
                    status: 'enabled',
                    bid: null,
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
                    // 7d
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
                    // 14d
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
                  }, { onConflict: 'adgroup_id, amazon_target_id' })
                if (upErr) {
                  diagnostics.writeErrors.push({ entity: 'target_backfill', id: targetId?.toString?.(), error: upErr.message })
                } else {
                  diagnostics.backfilled.targets++
                  totalMetricsUpdated++
                }
              } else {
                diagnostics.writeErrors.push({ entity: 'target_backfill_missing_adgroup', id: targetId?.toString?.(), adGroupId: agAmazonId })
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Target performance sync failed:', error)
      }
    }

    // Keyword Performance
    if (keywordIds.length > 0) {
      console.log('🔑 Fetching keyword performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'keywords', keywordColumns, keywordIds, { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
        )
        const report = await pollReportStatus(
          apiEndpoint, accessToken, clientId, connection.profile_id, reportId
        )
        const performanceData = await downloadAndParseReport(report.url!)
        diagnostics.keyword.reportRows = performanceData.length
        diagnostics.keyword.filteredIdsUsed = keywordIds.length
        diagnostics.keyword.timeUnit = 'SUMMARY'
        diagnostics.keyword.dateRangeDays = Math.min(dateRange, 31)
        diagnostics.keyword.nonZeroClickRows = performanceData.filter((r: any) => Number(r.clicks ?? 0) > 0).length
        console.log(`💾 Processing ${performanceData.length} keyword performance records`)
        for (const perf of performanceData) {
          const anyPerf = perf as any
          const keywordId = anyPerf.keywordId ?? anyPerf.targetId
          if (!keywordId) continue
          const impressions = Number(anyPerf.impressions ?? 0)
          const clicks = Number(anyPerf.clicks ?? 0)
          const spend = Number(anyPerf.spend ?? anyPerf.cost ?? 0)
          const sales7d = Number(anyPerf.sales7d ?? anyPerf.attributedSales7d ?? 0)
          const sales14d = Number(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? 0)
          const orders7d = Number(anyPerf.purchases7d ?? anyPerf.attributedConversions7d ?? 0)
          const orders14d = Number(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? 0)
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc = clicks > 0 ? spend / clicks : 0
          const acos7d = sales7d > 0 ? (spend / sales7d) * 100 : 0
          const acos14d = sales14d > 0 ? (spend / sales14d) * 100 : 0
          const roas7d = spend > 0 ? sales7d / spend : 0
          const roas14d = spend > 0 ? sales14d / spend : 0
          const convRate7d = clicks > 0 ? (orders7d / clicks) * 100 : 0
          const convRate14d = clicks > 0 ? (orders14d / clicks) * 100 : 0

          const { error: kwErr, data: kwUpd } = await supabase
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
              // 7d
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
              // 14d
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
            .eq('amazon_keyword_id', keywordId.toString())
            .select('id')
          
          if (kwErr) {
            diagnostics.writeErrors.push({ entity: 'keyword', id: keywordId?.toString?.(), error: kwErr.message })
          } else if (kwUpd && kwUpd.length > 0) {
            diagnostics.keyword.matchedRows++
            totalMetricsUpdated++
          } else {
            // Backfill missing keyword using adGroupId and keyword details from report
            const agAmazonId = anyPerf.adGroupId?.toString?.()
            if (agAmazonId) {
              const { data: ag } = await supabase
                .from('ad_groups')
                .select('id')
                .eq('amazon_adgroup_id', agAmazonId)
                .maybeSingle()
              if (ag?.id) {
                const { error: upErr } = await supabase
                  .from('keywords')
                  .upsert({
                    adgroup_id: ag.id,
                    amazon_keyword_id: keywordId.toString(),
                    keyword_text: anyPerf.keywordText || 'unknown',
                    match_type: (anyPerf.matchType || 'exact').toLowerCase(),
                    status: 'enabled',
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
                    // 7d
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
                    // 14d
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
                  }, { onConflict: 'adgroup_id, amazon_keyword_id' })
                if (upErr) {
                  diagnostics.writeErrors.push({ entity: 'keyword_backfill', id: keywordId?.toString?.(), error: upErr.message })
                } else {
                  diagnostics.backfilled.keywords++
                  totalMetricsUpdated++
                }
              } else {
                diagnostics.writeErrors.push({ entity: 'keyword_backfill_missing_adgroup', id: keywordId?.toString?.(), adGroupId: agAmazonId })
              }
            }
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
        reporting_api_version: 'v3',
        campaign_count: campaignIds.length
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
            keywords: keywordIds.length,
            targets: targetIds.length
          },
          metricsUpdated: 0,
          diagnostics
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
          keywords: keywordIds.length,
          targets: targetIds.length
        },
        metricsUpdated: totalMetricsUpdated,
        apiVersion: 'v3',
        diagnostics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Sync error:', error)
    const message = (error as Error)?.message || 'Unknown error'
    let code = 'SYNC_ERROR'
    if (message.includes('Connection is not active')) code = 'CONNECTION_INACTIVE'
    else if (message.includes('Token expired')) code = 'TOKEN_EXPIRED'
    else if (message.includes('Missing Amazon client secret')) code = 'MISSING_AMAZON_SECRET'

    return new Response(
      JSON.stringify({ success: false, code, message, error: message }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
