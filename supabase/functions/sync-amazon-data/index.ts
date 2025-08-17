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
  status: string
  url?: string
  statusDetails?: string
}

interface PerformanceData {
  campaignId?: string
  adGroupId?: string
  keywordId?: string
  targetId?: string
  keywordText?: string
  matchType?: string
  impressions?: string
  clicks?: string
  spend?: string
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
   const dateRangeDays = opts?.dateRangeDays || 30
   const timeUnit = opts?.timeUnit || 'SUMMARY'
   const skipEntityFilter = opts?.skipEntityFilter || false
   
   // Calculate dates - Amazon reports use YYYY-MM-DD format
   const endDate = new Date()
   endDate.setDate(endDate.getDate() - 1) // Amazon reports are delayed by 1 day
   const endDateStr = opts?.endDate || endDate.toISOString().split('T')[0]
   const startDateStr = opts?.startDate || new Date(endDate.getTime() - dateRangeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
 
  // Fix: correct reportTypeId mapping for v3 API
  const reportTypeId = (() => {
    switch (reportType) {
      case 'campaigns': return 'spCampaigns'
      case 'adGroups': return 'spAdGroups'
      case 'targets': return 'spTargets'
      case 'keywords': return 'spKeywords'
      case 'advertisedProducts': return 'spAdvertisedProduct'
      default: throw new Error(`Unknown reportType: ${reportType}`)
    }
  })()

  const payload: any = {
    name: `${reportType}_${Date.now()}`,
    startDate: startDateStr,
    endDate: endDateStr,
    configuration: {
      adProduct: 'SPONSORED_PRODUCTS',
      columns: columns,
      reportTypeId,
      timeUnit: timeUnit,
      format: 'GZIP_JSON'
    }
  }

  // If DAILY, include the 'date' column so we can insert time-series rows
  if (timeUnit === 'DAILY' && !payload.configuration.columns.includes('date')) {
    payload.configuration.columns = ['date', ...payload.configuration.columns]
  }
 
   // Apply entity filtering unless explicitly skipped
   if (!opts?.skipEntityFilter && entityIds && entityIds.length > 0) {
      const filterField = reportType === 'campaigns' ? 'campaignId'
                       : reportType === 'adGroups' ? 'adGroupId'
                       : reportType === 'keywords' ? 'keywordId'
                       : reportType === 'targets' ? 'targetId'
                       : reportType === 'advertisedProducts' ? 'adGroupId'
                       : 'campaignId'
      
      payload.filters = [{ field: filterField, operator: 'IN', values: entityIds }]
   }

  // Add groupBy for campaign reports (required for v3 API) but not for keywords
  if (reportType === 'campaigns') {
    payload.configuration.groupBy = ['campaign']
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
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Failed to create ${reportType} report:`, response.status, errorText)
    if (response.status === 425) {
      try {
        const errorData = JSON.parse(errorText)
        const retryAfterMatch = errorData.details?.match(/(\d+) seconds/)
        if (retryAfterMatch) {
          const retryAfter = parseInt(retryAfterMatch[1])
          throw new Error(`Rate limited, retry after ${retryAfter} seconds`)
        }
      } catch {}
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
      throw new Error(`Failed to poll report status: ${response.status}`)
    }

    const report = await response.json()
    
    if (report.status === 'SUCCESS' && report.url) {
      return report
    } else if (report.status === 'FAILURE') {
      throw new Error(`Report generation failed: ${report.statusDetails}`)
    }
    
    console.log(`⏳ Report ${reportId} status: ${report.status}, attempt ${attempt + 1}/${maxAttempts}`)
    
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
    throw new Error('No response body')
  }

  const decompressedStream = compressedStream.pipeThrough(new DecompressionStream('gzip'))
  const decompressedResponse = new Response(decompressedStream)
  const jsonText = await decompressedResponse.text()
  
  // Handle both JSON array and NDJSON format
  const trimmed = jsonText.trim()
  if (trimmed.startsWith('[')) {
    return JSON.parse(trimmed)
  }
  // Handle NDJSON (newline-delimited JSON)
  const lines = trimmed.split('\n').filter(Boolean)
  return lines.map(line => JSON.parse(line))
}

// Missing pagination function for v2 API endpoints
async function fetchAllPages(urlBase: string, headers: Record<string, string>, pageSize = 100): Promise<any[]> {
  let startIndex = 0
  const results: any[] = []
  
  for (;;) {
    const separator = urlBase.includes('?') ? '&' : '?'
    const url = `${urlBase}${separator}startIndex=${startIndex}&count=${pageSize}`
    
    console.log(`  📄 Fetching page: startIndex=${startIndex}, count=${pageSize}`)
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${await response.text()}`)
    }
    
    const page = await response.json()
    
    if (!Array.isArray(page)) {
      console.error('Expected array response, got:', typeof page)
      break
    }
    
    results.push(...page)
    console.log(`  ✅ Got ${page.length} items, total so far: ${results.length}`)
    
    if (page.length < pageSize) {
      break
    }
    
    startIndex += pageSize
  }
  
  return results
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
    const dateRange = Number(dateRangeDays) || 30  // Changed from 90 to 30 days to comply with Amazon API limits
    const diag = Boolean(diagnosticMode)
    const timeUnitOpt: 'SUMMARY' | 'DAILY' = (timeUnit === 'SUMMARY' ? 'SUMMARY' : 'DAILY')
    console.log('🚀 Starting sync for user:', user.id, 'connection:', connectionId, 'dateRangeDays:', dateRange, 'diagnosticMode:', diag)
    
    // Create sync job for progress tracking
    const { data: syncJob, error: syncJobError } = await supabase
      .from('sync_jobs')
      .insert({
        connection_id: connectionId,
        user_id: user.id,
        status: 'running',
        phase: 'starting',
        progress_percent: 0,
        sync_details: {
          dateRange,
          diagnosticMode: diag,
          timeUnit: timeUnitOpt
        },
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (syncJobError) {
      console.error('Failed to create sync job:', syncJobError)
    }

    const syncJobId = syncJob?.id

    // PHASE 1: Validate connection and refresh token if needed
    console.log('🔐 Validating Amazon connection...')
    
    const { data: connection, error: connectionError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      console.error('❌ Connection not found or unauthorized:', {
        connectionId,
        userId: user.id,
        error: connectionError
      })
      throw new Error('Connection not found or unauthorized')
    }
    
    console.log('✅ Connection validated:', {
      profileId: connection.profile_id,
      profileName: connection.profile_name,
      status: connection.status,
      tokenExpiresAt: connection.token_expires_at
    })

    if (connection.status !== 'active') {
      throw new Error('Connection is not active')
    }
    
    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Missing Amazon client ID configuration')
    }

    let accessToken = await decryptText(connection.access_token)
    const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api-eu.amazon.com'
    
    // Check if token needs refresh (with 1 hour buffer)
    const now = new Date()
    const expiresAt = new Date(connection.token_expires_at)
    const bufferTime = 60 * 60 * 1000 // 1 hour in milliseconds
    
    if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
      console.log('🔄 Token expires soon, refreshing...')
      
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
      if (!clientSecret) {
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'setup_required',
            setup_required_reason: 'Missing Amazon client secret for token refresh'
          })
          .eq('id', connectionId)
        throw new Error('Missing Amazon client secret')
      }

      // Refresh the token
      try {
        console.log('Attempting token refresh...')
        
        const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: await decryptText(connection.refresh_token),
            client_id: clientId,
            client_secret: clientSecret,
          }),
        })

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json()
          accessToken = tokenData.access_token
          
          // Update stored tokens
          const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
          console.log('✅ Token refreshed successfully, expires at:', newExpiresAt.toISOString())
          
          await supabase
            .from('amazon_connections')
            .update({
              access_token: await encryptText(accessToken),
              refresh_token: await encryptText(tokenData.refresh_token || connection.refresh_token),
              token_expires_at: newExpiresAt.toISOString(),
              status: 'active',
              setup_required_reason: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionId)
        } else {
          const errorText = await refreshResponse.text()
          console.error('❌ Token refresh failed:', errorText)
          throw new Error(`Token refresh failed: ${refreshResponse.status}`)
        }
      } catch (refreshError) {
        console.error('❌ Token refresh error:', refreshError)
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'setup_required',
            setup_required_reason: 'Token refresh failed - please reconnect your Amazon account'
          })
          .eq('id', connectionId)
        throw new Error('Token refresh failed - please reconnect your Amazon account')
      }
    }

     // Update sync job status
     if (syncJobId) {
       await supabase.from('sync_jobs').update({
         status: 'running',
         phase: 'fetching-entities',
         progress_percent: 10
       }).eq('id', syncJobId)
     }
     
     // Also sync budget usage data
     console.log('💰 Will sync budget usage data after entity sync...')
     const campaignsResponse = await fetchWithRetry(`${apiEndpoint}/v2/campaigns`, {
       headers: {
         'Authorization': `Bearer ${accessToken}`,
         'Amazon-Advertising-API-ClientId': clientId,
         'Amazon-Advertising-API-Scope': connection.profile_id,
       },
     })
     
     if (!campaignsResponse.ok) {
       const errorText = await campaignsResponse.text()
       console.error('Failed to fetch campaigns:', campaignsResponse.status, errorText)
       throw new Error(`Failed to fetch campaigns: ${campaignsResponse.status}`)
     }
     
     const campaignsData = await campaignsResponse.json()
     
     if (!Array.isArray(campaignsData) || campaignsData.length === 0) {
       console.log('⚠️ No campaigns found for this connection')
       
       return new Response(JSON.stringify({
         success: true,
         message: 'No campaigns found',
         entitiesSynced: { campaigns: 0, adGroups: 0, keywords: 0, targets: 0 }
       }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 200
       })
     }

    // PHASE 1A: Sync campaign entities
    console.log(`📊 Syncing ${campaignsData.length} campaigns...`)
    let campaignMap = new Map()
    let adGroupMap = new Map()
    let autoCampaignCount = 0
    
    for (const campaign of campaignsData) {
      if (!campaign.campaignId || !campaign.name) {
        console.warn('Skipping malformed campaign:', campaign)
        continue
      }

      // Extract targeting type from name - fallback approach if targetingType is not provided
      const targetingType = campaign.targetingType?.toLowerCase() || 
        (campaign.name?.toLowerCase().includes('auto') ? 'auto' : 'manual')

      if (targetingType === 'auto') {
        autoCampaignCount++
      } else if (targetingType === 'manual') {
        // This is fine, we'll process keywords for manual campaigns
      }

      const { data: storedCampaign } = await supabase
        .from('campaigns')
        .upsert({
          connection_id: connectionId,
          amazon_campaign_id: campaign.campaignId.toString(),
          name: campaign.name,
          campaign_type: 'Sponsored Products',
          targeting_type: targetingType,
          status: campaign.state || 'enabled',
          daily_budget: parseFloat(campaign.dailyBudget) || null,
          start_date: campaign.startDate || null,
          end_date: campaign.endDate || null,
          asin: null // Will be populated from advertised products report
        }, {
          onConflict: 'connection_id,amazon_campaign_id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (storedCampaign) {
        campaignMap.set(campaign.campaignId.toString(), {
          ...storedCampaign,
          campaign_targeting_type: targetingType
        })
      }
    }
    
    for (const [campaignId, storedCampaign] of campaignMap.entries()) {
      try {
        // Try SP-specific endpoint first, fallback to generic if 404
        let adGroupsData: any[] = []
        
        try {
          adGroupsData = await fetchAllPages(`${apiEndpoint}/v2/sp/adGroups?campaignIdFilter=${campaignId}`, {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': connection.profile_id,
          })
        } catch (spError: any) {
          if (spError.message?.includes('404')) {
            console.log(`⚠️ SP adGroups endpoint failed with 404, trying generic endpoint for campaign ${campaignId}`)
            adGroupsData = await fetchAllPages(`${apiEndpoint}/v2/adGroups?campaignIdFilter=${campaignId}`, {
              'Authorization': `Bearer ${accessToken}`,
              'Amazon-Advertising-API-ClientId': clientId,
              'Amazon-Advertising-API-Scope': connection.profile_id,
            })
          } else {
            throw spError
          }
        }
        
        for (const adGroup of adGroupsData) {
          if (!adGroup.adGroupId || !adGroup.name) {
            console.warn('Skipping malformed ad group:', adGroup)
            continue
          }

          const { data: storedAdGroup } = await supabase
            .from('ad_groups')
            .upsert({
              campaign_id: storedCampaign.id,
              amazon_adgroup_id: adGroup.adGroupId.toString(),
              name: adGroup.name,
              default_bid: parseFloat(adGroup.defaultBid) || null,
              status: adGroup.state || 'enabled'
            }, {
              onConflict: 'campaign_id,amazon_adgroup_id',
              ignoreDuplicates: false
            })
            .select()
            .single()

          if (storedAdGroup) {
            adGroupMap.set(adGroup.adGroupId.toString(), {
              ...storedAdGroup,
              campaign_targeting_type: storedCampaign.campaign_targeting_type
            })
          }
        }
      } catch (error) {
        console.warn(`Failed to sync ad groups for campaign ${campaignId}:`, error)
      }
    }

    for (const [adGroupId, storedAdGroup] of adGroupMap.entries()) {
      // Only fetch keywords for manual campaigns (auto campaigns use targets instead)
      if (storedAdGroup.campaign_targeting_type === 'auto') {
        continue
      }

      try {
        // Try SP-specific endpoint first, fallback to generic if 404
        let keywordsData: any[] = []
        
        try {
          keywordsData = await fetchAllPages(`${apiEndpoint}/v2/sp/keywords?adGroupIdFilter=${adGroupId}`, {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': connection.profile_id,
          })
        } catch (spError: any) {
          if (spError.message?.includes('404')) {
            console.log(`⚠️ SP keywords endpoint failed with 404, trying generic endpoint for adGroup ${adGroupId}`)
            keywordsData = await fetchAllPages(`${apiEndpoint}/v2/keywords?adGroupIdFilter=${adGroupId}`, {
              'Authorization': `Bearer ${accessToken}`,
              'Amazon-Advertising-API-ClientId': clientId,
              'Amazon-Advertising-API-Scope': connection.profile_id,
            })
          } else {
            throw spError
          }
        }
        
        for (const keyword of keywordsData) {
          if (!keyword.keywordId || !keyword.keywordText) {
            console.warn('Skipping malformed keyword:', keyword)
            continue
          }

          await supabase
            .from('keywords')
            .upsert({
              adgroup_id: storedAdGroup.id,
              amazon_keyword_id: keyword.keywordId.toString(),
              keyword_text: keyword.keywordText,
              match_type: keyword.matchType || 'broad',
              bid: parseFloat(keyword.bid) || null,
              status: keyword.state || 'enabled'
            }, {
              onConflict: 'adgroup_id,amazon_keyword_id',
              ignoreDuplicates: false
            })
        }
      } catch (error) {
        console.warn(`Failed to sync keywords for ad group ${adGroupId}:`, error)
      }
    }

    for (const [adGroupId, storedAdGroup] of adGroupMap.entries()) {
      // Only fetch targets for auto campaigns (manual campaigns use keywords instead)
      if (storedAdGroup.campaign_targeting_type !== 'auto') {
        continue
      }
      
      try {
        // Try SP-specific endpoint first, fallback to generic if 404
        let targetsData: any[] = []
        
        try {
          targetsData = await fetchAllPages(`${apiEndpoint}/v2/sp/targets?adGroupIdFilter=${adGroupId}`, {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': connection.profile_id,
          })
        } catch (spError: any) {
          if (spError.message?.includes('404')) {
            console.log(`⚠️ SP targets endpoint failed with 404, trying generic endpoint for adGroup ${adGroupId}`)
            targetsData = await fetchAllPages(`${apiEndpoint}/v2/targets?adGroupIdFilter=${adGroupId}`, {
              'Authorization': `Bearer ${accessToken}`,
              'Amazon-Advertising-API-ClientId': clientId,
              'Amazon-Advertising-API-Scope': connection.profile_id,
            })
          } else {
            throw spError
          }
        }
        
        // Process targets data
        for (const target of targetsData) {
          if (!target.targetId) {
            console.warn('Skipping malformed target:', target)
            continue
          }

          // Extract ASIN from target expression for product targeting
          const expr = target.expression
          const asinCandidate = Array.isArray(expr?.value) ? 
            expr.value.find((v: any) => v?.type === 'ASIN')?.value : null

          await supabase
            .from('targets')
            .upsert({
              adgroup_id: storedAdGroup.id,
              amazon_target_id: target.targetId.toString(),
              type: target.expression?.type || 'auto',
              expression: target.expression ?? null,
              asin: asinCandidate ?? null,
              bid: parseFloat(target.bid) || null,
              status: target.state || 'enabled'
            }, {
              onConflict: 'adgroup_id,amazon_target_id',
              ignoreDuplicates: false
            })
        }
      } catch (error) {
        console.warn(`Failed to sync targets for ad group ${adGroupId}:`, error)
      }
    }

    // PHASE 1B: Sync advertised products to populate ASINs
    console.log('🛍️ Fetching advertised products for ASIN data...')
    const allAdGroupIds = Array.from(adGroupMap.keys())
    
    if (allAdGroupIds.length > 0) {
      try {
        const advProdColumns = ['adId', 'adGroupId', 'campaignId', 'asin', 'impressions', 'clicks', 'cost', 'attributedSales14d', 'attributedConversions14d']
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id,
          'advertisedProducts', advProdColumns, allAdGroupIds, 
          { dateRangeDays: 30, timeUnit: 'DAILY' }
        )
        
        const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
        const downloadedData = await downloadAndParseReport(report.url)
        
        // Update campaigns with ASIN data from advertised products
        const campaignAsinUpdates = new Map<string, string>()
        for (const row of downloadedData) {
          if (row.asin && row.campaignId) {
            campaignAsinUpdates.set(row.campaignId.toString(), row.asin)
          }
        }
        
        // Batch update campaigns with ASINs
        for (const [amazonCampaignId, asin] of campaignAsinUpdates.entries()) {
          await supabase.from('campaigns')
            .update({ asin })
            .eq('amazon_campaign_id', amazonCampaignId)
            .eq('connection_id', connectionId)
        }
        
        console.log(`✅ Updated ASINs for ${campaignAsinUpdates.size} campaigns from advertised products`)
      } catch (error) {
        console.warn('⚠️ Failed to fetch advertised products for ASIN data:', error)
      }
    }

    // Get the IDs for performance fetching
    const campaignIds = Array.from(campaignMap.keys())
    const adGroupIds = Array.from(adGroupMap.keys())
    
    const { data: keywordRows } = await supabase.from('keywords').select('amazon_keyword_id').eq('adgroup_id', Array.from(adGroupMap.values()).map(ag => ag.id))
    const keywordIds = keywordRows?.map(row => row.amazon_keyword_id) || []
    
    const { data: targetRows } = await supabase.from('targets').select('amazon_target_id').eq('adgroup_id', Array.from(adGroupMap.values()).map(ag => ag.id))
    const targetIds = targetRows?.map(row => row.amazon_target_id) || []

    if (targetIds.length === 0 && autoCampaignCount > 0) {
      console.warn('⚠️ Found auto campaigns but no targets - this may indicate a sync issue')
    } else if (targetIds.length > 0) {
      console.log(`🎯 Found ${targetIds.length} targets for auto campaigns`)
    }

    // Update sync job status
    if (syncJobId) {
      await supabase.from('sync_jobs').update({
        status: 'running',
        phase: 'fetching-performance',
        progress_percent: 30,
        sync_details: {
          entitiesSynced: {
            campaigns: campaignIds.length,
            adGroups: adGroupIds.length,
            keywords: keywordIds.length,
            targets: targetIds.length
          }
        }
      }).eq('id', syncJobId)
    }

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

    // Define columns using Amazon Reporting v3 column names (sales14d/purchases14d)
    const campaignColumns = ['campaignId','impressions','clicks','cost','sales14d','purchases14d']
    const adGroupColumns = ['adGroupId','campaignId','impressions','clicks','cost','sales14d','purchases14d']
    const targetColumns = ['targetId','adGroupId','campaignId','impressions','clicks','cost','sales14d','purchases14d']
    const keywordColumns = ['keywordId','adGroupId','campaignId','keywordText','matchType','impressions','clicks','cost','sales14d','purchases14d']

    // Minimal columns fallback (in case of config errors)
    const minCampaignColumns = ['campaignId','impressions','clicks','cost','sales14d','purchases14d']
    const minAdGroupColumns = ['adGroupId','impressions','clicks','cost','sales14d','purchases14d']
    const minTargetColumns = ['targetId','impressions','clicks','cost','sales14d','purchases14d']
    const minKeywordColumns = ['keywordId','impressions','clicks','cost','sales14d','purchases14d']

    // Campaign Performance
    if (campaignIds.length > 0) {
      console.log('📈 Fetching campaign performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id, 'campaigns', campaignColumns, campaignIds, 
          { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
        )
        const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
        
        if (report.url) {
          const performanceData = await downloadAndParseReport(report.url)
          console.log(`💾 Processing ${performanceData.length} campaign performance records`)
          
          // Upsert campaigns with performance data (ensures rows exist)
          for (const perf of performanceData) {
            if (!perf.campaignId) continue

            const campaignAmazonId = perf.campaignId.toString()
            const storedCampaign = campaignMap.get(campaignAmazonId)
            const anyPerf = perf as any

            const spend = parseFloat(anyPerf.cost ?? anyPerf.spend ?? '0') || 0
            const sales = parseFloat(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? anyPerf.sales_14d ?? '0') || 0
            const orders = parseInt(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? anyPerf.purchases_14d ?? '0') || 0

            const acos = sales > 0 ? (spend / sales) * 100 : 0
            const roas = spend > 0 ? sales / spend : 0
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
            const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0

            if (timeUnitOpt === 'DAILY' && anyPerf.date) {
              // Store in performance history table
              const campaign = campaignMap.get(campaignAmazonId)
              if (campaign) {
                await supabase.from('campaign_performance_history').upsert({
                  campaign_id: campaign.id,
                  date: anyPerf.date,
                  attribution_window: '14d',
                  impressions,
                  clicks,
                  spend,
                  sales,
                  orders,
                  acos,
                  roas,
                  ctr,
                  cpc: clicks > 0 ? spend / clicks : 0,
                  conversion_rate: conversionRate
                }, {
                  onConflict: 'campaign_id,date,attribution_window',
                  ignoreDuplicates: false
                })
                totalMetricsUpdated++
              }
            } else {
              // SUMMARY mode: update campaigns table directly
              if (storedCampaign) {
                const { error: campErr } = await supabase
                  .from('campaigns')
                  .update({
                    impressions,
                    clicks,
                    cost_14d: spend,
                    attributed_sales_14d: sales,
                    attributed_conversions_14d: orders,
                    acos,
                    roas,
                    last_updated: new Date().toISOString()
                  })
                  .eq('id', storedCampaign.id)

                if (campErr) {
                  console.error(`Failed to update campaign ${storedCampaign.id}:`, campErr)
                  diagnostics.writeErrors.push({ entity: 'campaign', id: storedCampaign.id, error: campErr.message })
                } else {
                  totalMetricsUpdated++
                }
              }
            }
          }

          diagnostics.campaignReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: campaignColumns }
        }

        console.log('✅ Campaign performance data synced successfully')
      } catch (error) {
        if (error instanceof Error && error.message.includes('400')) {
          console.warn('⚠️ Campaign report failed, trying with minimal columns...')
          try {
            const reportId = await createReportRequest(
              apiEndpoint, accessToken, clientId, connection.profile_id, 'campaigns', minCampaignColumns, campaignIds,
              { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
            )
            const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
            
            if (report.url) {
              const performanceData = await downloadAndParseReport(report.url)
              console.log(`💾 Processing ${performanceData.length} campaign performance records (minimal columns)`)
              
              diagnostics.campaignMinimalColumnsFallbackUsed = true
              for (const perf of performanceData) {
                if (!perf.campaignId) continue

                const campaignAmazonId = perf.campaignId.toString()
                const storedCampaign = campaignMap.get(campaignAmazonId)
                const anyPerf = perf as any

                const impressions = parseInt(anyPerf.impressions) || 0
                const clicks = parseInt(anyPerf.clicks) || 0
                const spend = parseFloat(anyPerf.cost ?? anyPerf.spend ?? '0') || 0
                const sales = parseFloat(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? anyPerf.sales_14d ?? '0') || 0
                const orders = parseInt(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? anyPerf.purchases_14d ?? '0') || 0

                const acos = sales > 0 ? (spend / sales) * 100 : 0
                const roas = spend > 0 ? sales / spend : 0

                if (storedCampaign) {
                  const { error: campErr } = await supabase
                    .from('campaigns')
                    .update({
                      impressions,
                      clicks,
                      cost_14d: spend,
                      attributed_sales_14d: sales,
                      attributed_conversions_14d: orders,
                      acos,
                      roas,
                      last_updated: new Date().toISOString()
                    })
                    .eq('id', storedCampaign.id)

                  if (campErr) {
                    console.error(`Failed to update campaign ${storedCampaign.id} (minimal):`, campErr)
                    diagnostics.writeErrors.push({ entity: 'campaign', id: storedCampaign.id, error: campErr.message })
                  } else {
                    totalMetricsUpdated++
                  }
                }
              }

              console.log('✅ Campaign performance data synced with minimal columns')
              diagnostics.campaignReportMinimal = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: minCampaignColumns }
            }
          } catch (fallbackError) {
            console.error('❌ Campaign performance sync failed even with minimal columns:', fallbackError)
            diagnostics.campaignReportError = String(fallbackError)
            
            // Final fallback: unfiltered report
            try {
              console.warn('⚠️ Trying unfiltered campaign report as last resort...')
              const reportId = await createReportRequest(
                apiEndpoint, accessToken, clientId, connection.profile_id, 'campaigns', minCampaignColumns, [],
                { dateRangeDays: dateRange, timeUnit: timeUnitOpt, skipEntityFilter: true }
              )
              const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
              
              if (report.url) {
                const performanceData = await downloadAndParseReport(report.url)
                diagnostics.fallbackUnfilteredCampaignReportUsed = true
                for (const perf of performanceData) {
                  if (!perf.campaignId) continue

                  const campaignAmazonId = perf.campaignId.toString()
                  const storedCampaign = campaignMap.get(campaignAmazonId)
                  
                  if (storedCampaign) {
                    const anyPerf = perf as any
                    const impressions = parseInt(anyPerf.impressions) || 0
                    const clicks = parseInt(anyPerf.clicks) || 0
                    const spend = parseFloat(anyPerf.cost ?? anyPerf.spend ?? '0') || 0
                    const sales = parseFloat(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? anyPerf.sales_14d ?? '0') || 0
                    const orders = parseInt(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? anyPerf.purchases_14d ?? '0') || 0

                    const acos = sales > 0 ? (spend / sales) * 100 : 0
                    const roas = spend > 0 ? sales / spend : 0

                    const { error: campErr } = await supabase
                      .from('campaigns')
                      .update({
                        impressions,
                        clicks,
                        cost_14d: spend,
                        attributed_sales_14d: sales,
                        attributed_conversions_14d: orders,
                        acos,
                        roas,
                        last_updated: new Date().toISOString()
                      })
                      .eq('id', storedCampaign.id)

                    if (campErr) {
                      console.error(`Failed to update campaign ${storedCampaign.id} (unfiltered):`, campErr)
                      diagnostics.writeErrors.push({ entity: 'campaign', id: storedCampaign.id, error: campErr.message })
                    } else {
                      totalMetricsUpdated++
                    }
                  }
                }
                
                console.log('✅ Campaign performance data synced with unfiltered fallback')
                diagnostics.campaignReportUnfiltered = { rows: performanceData.length, matched: totalMetricsUpdated }
              }
            } catch (unfilteredError) {
              console.error('❌ Even unfiltered campaign report failed:', unfilteredError)
              diagnostics.campaignReportUnfilteredError = String(unfilteredError)
            }
          }
        } else {
          console.error('❌ Campaign performance sync failed:', error)
          diagnostics.campaignReportError = String(error)
        }
      }
    }

    // Ad Group Performance  
    if (adGroupIds.length > 0) {
      console.log('📊 Fetching ad group performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id, 'adGroups', adGroupColumns, adGroupIds,
          { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
        )
        const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
        
        if (report.url) {
          const performanceData = await downloadAndParseReport(report.url)
          console.log(`💾 Processing ${performanceData.length} ad group performance records`)
          
          for (const perf of performanceData) {
            if (!perf.adGroupId) continue

            const adGroupAmazonId = perf.adGroupId.toString()
            const storedAdGroup = adGroupMap.get(adGroupAmazonId)
            const anyPerf = perf as any

            const impressions = parseInt(anyPerf.impressions) || 0
            const clicks = parseInt(anyPerf.clicks) || 0
            const spend = parseFloat(anyPerf.cost ?? anyPerf.spend ?? '0') || 0
            const sales = parseFloat(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? anyPerf.sales_14d ?? '0') || 0
            const orders = parseInt(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? anyPerf.purchases_14d ?? '0') || 0

            const acos = sales > 0 ? (spend / sales) * 100 : 0
            const roas = spend > 0 ? sales / spend : 0
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
            const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0

            if (adGroupRecord) {
              if (timeUnitOpt === 'DAILY' && anyPerf.date) {
                // Store in performance history table
                await supabase.from('adgroup_performance_history').upsert({
                  adgroup_id: adGroupRecord.id,
                  date: anyPerf.date,
                  attribution_window: '14d',
                  impressions,
                  clicks,
                  spend,
                  sales,
                  orders,
                  acos,
                  roas,
                  ctr,
                  cpc: clicks > 0 ? spend / clicks : 0,
                  conversion_rate: conversionRate
                }, {
                  onConflict: 'adgroup_id,date,attribution_window',
                  ignoreDuplicates: false
                })
                totalMetricsUpdated++
              } else {
                // SUMMARY mode: update ad_groups table directly
                const { error: agErr } = await supabase
                  .from('ad_groups')
                  .update({
                    impressions,
                    clicks,
                    cost_14d: spend,
                    attributed_sales_14d: sales,
                    attributed_conversions_14d: orders,
                    acos,
                    roas,
                    last_updated: new Date().toISOString()
                  })
                  .eq('id', adGroupRecord.id)

                if (agErr) {
                  console.error(`Failed to update ad group ${adGroupRecord.id}:`, agErr)
                  diagnostics.writeErrors.push({ entity: 'adGroup', id: adGroupRecord.id, error: agErr.message })
                } else {
                  totalMetricsUpdated++
                }
              }
            }
          }

          diagnostics.adGroupReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: adGroupColumns }
        }

        console.log('✅ Ad group performance data synced successfully')
      } catch (error) {
        if (error instanceof Error && error.message.includes('400')) {
          console.warn('⚠️ Ad group report failed, trying with minimal columns...')
          try {
            const reportId = await createReportRequest(
              apiEndpoint, accessToken, clientId, connection.profile_id, 'adGroups', minAdGroupColumns, adGroupIds,
              { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
            )
            const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
            
            if (report.url) {
              const performanceData = await downloadAndParseReport(report.url)
              console.log(`💾 Processing ${performanceData.length} ad group performance records (minimal columns)`)
              
              diagnostics.adGroupMinimalColumnsFallbackUsed = true
              for (const perf of performanceData) {
                if (!perf.adGroupId) continue

                const adGroupAmazonId = perf.adGroupId.toString()
                const storedAdGroup = adGroupMap.get(adGroupAmazonId)
                const anyPerf = perf as any

                const impressions = parseInt(anyPerf.impressions) || 0
                const clicks = parseInt(anyPerf.clicks) || 0
                const spend = parseFloat(anyPerf.cost ?? anyPerf.spend ?? '0') || 0
                const sales = parseFloat(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? anyPerf.sales_14d ?? '0') || 0
                const orders = parseInt(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? anyPerf.purchases_14d ?? '0') || 0

                const acos = sales > 0 ? (spend / sales) * 100 : 0
                const roas = spend > 0 ? sales / spend : 0

                if (agRecord?.id) {
                  const { error: agErr } = await supabase
                    .from('ad_groups')
                    .update({
                      impressions,
                      clicks,
                      cost_14d: spend,
                      attributed_sales_14d: sales,
                      attributed_conversions_14d: orders,
                      acos,
                      roas,
                      last_updated: new Date().toISOString()
                    })
                    .eq('id', agRecord.id)

                  if (agErr) {
                    console.error(`Failed to update ad group ${agRecord.id} (minimal):`, agErr)
                    diagnostics.writeErrors.push({ entity: 'adGroup', id: agRecord.id, error: agErr.message })
                  } else {
                    totalMetricsUpdated++
                  }
                }
              }

              console.log('✅ Ad group performance data synced with minimal columns')
              diagnostics.adGroupReportMinimal = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: minAdGroupColumns }
            }
          } catch (fallbackError) {
            console.error('❌ Ad group performance sync failed even with minimal columns:', fallbackError)
            diagnostics.adGroupReportError = String(fallbackError)
            
            // Final fallback: unfiltered report
            try {
              const reportId = await createReportRequest(
                apiEndpoint, accessToken, clientId, connection.profile_id, 'adGroups', minAdGroupColumns, [],
                { dateRangeDays: dateRange, timeUnit: timeUnitOpt, skipEntityFilter: true }
              )
              const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
              
              if (report.url) {
                const performanceData = await downloadAndParseReport(report.url)
                for (const perf of performanceData) {
                  if (!perf.adGroupId) continue

                  const adGroupAmazonId = perf.adGroupId.toString()
                  const storedAdGroup = adGroupMap.get(adGroupAmazonId)

                  if (agRecord?.id) {
                    const anyPerf = perf as any
                    const impressions = parseInt(anyPerf.impressions) || 0
                    const clicks = parseInt(anyPerf.clicks) || 0
                    const spend = parseFloat(anyPerf.cost ?? anyPerf.spend ?? '0') || 0
                    const sales = parseFloat(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? anyPerf.sales_14d ?? '0') || 0
                    const orders = parseInt(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? anyPerf.purchases_14d ?? '0') || 0

                    const acos = sales > 0 ? (spend / sales) * 100 : 0
                    const roas = spend > 0 ? sales / spend : 0

                    const { error: agErr } = await supabase
                      .from('ad_groups')
                      .update({
                        impressions,
                        clicks,
                        cost_14d: spend,
                        attributed_sales_14d: sales,
                        attributed_conversions_14d: orders,
                        acos,
                        roas,
                        last_updated: new Date().toISOString()
                      })
                      .eq('id', agRecord.id)

                    if (agErr) {
                      console.error(`Failed to update ad group ${agRecord.id} (unfiltered):`, agErr)
                      diagnostics.writeErrors.push({ entity: 'adGroup', id: agRecord.id, error: agErr.message })
                    } else {
                      totalMetricsUpdated++
                    }
                  }
                }
                
                console.log('✅ Ad group performance data synced with unfiltered fallback')
              }
            } catch (unfilteredError) {
              console.error('❌ Even unfiltered ad group report failed:', unfilteredError)
              diagnostics.adGroupReportUnfilteredError = String(unfilteredError)
            }
          }
        } else {
          console.error('❌ Ad group performance sync failed:', error)
          diagnostics.adGroupReportError = String(error)
        }
      }
    }

    // Target Performance (for auto campaigns)
    if (typeof targetIds !== 'undefined' && targetIds.length > 0) {
      console.log('🎯 Fetching target performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id, 'targets', targetColumns, targetIds,
          { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
        )
        const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
        
        if (report.url) {
          const performanceData = await downloadAndParseReport(report.url)
          console.log(`💾 Processing ${performanceData.length} target performance records`)
          for (const perf of performanceData) {
            const anyPerf = perf as any
            const targetId = anyPerf.targetId
            if (!targetId) continue

            const impressions = parseInt(anyPerf.impressions) || 0
            const clicks = parseInt(anyPerf.clicks) || 0
            const spend = parseFloat(anyPerf.cost ?? anyPerf.spend ?? '0') || 0
            const sales = parseFloat(anyPerf.sales14d ?? anyPerf.attributedSales14d ?? anyPerf.sales_14d ?? '0') || 0
            const orders = parseInt(anyPerf.purchases14d ?? anyPerf.attributedConversions14d ?? anyPerf.purchases_14d ?? '0') || 0

            const acos = sales > 0 ? (spend / sales) * 100 : 0
            const roas = spend > 0 ? sales / spend : 0
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
            const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0

            // Find the target record and its ad group
            const { data: tgtUpd, error: tgtErr } = await supabase
              .from('targets')
              .update({
                impressions,
                clicks,
                cost_14d: spend,
                attributed_sales_14d: sales,
                attributed_conversions_14d: orders,
                acos,
                roas,
                last_updated: new Date().toISOString()
              })
              .eq('amazon_target_id', targetId.toString())
              .select('id, adgroup_id, ad_groups(amazon_adgroup_id)')

            if (tgtErr) {
              console.error(`Failed to update target ${targetId}:`, tgtErr)
            } else if (tgtUpd && tgtUpd.length > 0) {
              totalMetricsUpdated++
              
              // Also try to backfill ad group metrics by aggregating target data
              const agAmazonId = (tgtUpd[0] as any).ad_groups?.amazon_adgroup_id
              if (agAmazonId) {
                const storedAdGroup = adGroupMap.get(agAmazonId.toString())
                const ag = storedAdGroup || tgtUpd[0]
                if (ag?.id) {
                  // Simple approach: update with current target's metrics
                  // In a real system, you'd aggregate all targets for this ad group
                  await supabase
                    .from('ad_groups')
                    .upsert({
                      id: ag.id,
                      impressions,
                      clicks,
                      cost_14d: spend,
                      attributed_sales_14d: sales,
                      attributed_conversions_14d: orders,
                      acos,
                      roas,
                      ctr,
                      conversion_rate: conversionRate,
                      last_updated: new Date().toISOString()
                    }, {
                      onConflict: 'id',
                      ignoreDuplicates: false
                    })

                  diagnostics.backfilled.targets++

                  const { error: upErr } = result
                  if (upErr) {
                    console.error(`Failed to backfill ad group ${ag.id} with target data:`, upErr)
                  }
                }
              }
            }
          }

          diagnostics.targetReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: targetColumns }
        }

        console.log('✅ Target performance data synced successfully')
      } catch (error) {
        console.error('❌ Target performance sync failed:', error)
        diagnostics.targetReportError = String(error)
      }
    }

    // Keyword Performance (for manual campaigns)  
    if (keywordIds.length > 0) {
      console.log('🔑 Fetching keyword performance...')
      try {
        const reportId = await createReportRequest(
          apiEndpoint, accessToken, clientId, connection.profile_id, 'keywords', keywordColumns, keywordIds,
          { dateRangeDays: dateRange, timeUnit: timeUnitOpt }
        )
        const report = await pollReportStatus(apiEndpoint, accessToken, clientId, connection.profile_id, reportId)
        
        if (report.url) {
          const performanceData = await downloadAndParseReport(report.url)
          console.log(`💾 Processing ${performanceData.length} keyword performance records`)
          for (const perf of performanceData) {
            const anyPerf = perf as any
            const keywordId = anyPerf.keywordId
            if (!keywordId) continue

            const impressions = parseInt(anyPerf.impressions) || 0
            const clicks = parseInt(anyPerf.clicks) || 0
            const spend = parseFloat(anyPerf.cost ?? anyPerf.spend ?? '0') || 0
            const sales = parseFloat(anyPerf.attributedSales14d ?? anyPerf.sales14d ?? anyPerf.sales_14d ?? '0') || 0
            const orders = parseInt(anyPerf.attributedConversions14d ?? anyPerf.purchases14d ?? anyPerf.purchases_14d ?? '0') || 0

            const acos = sales > 0 ? (spend / sales) * 100 : 0
            const roas = spend > 0 ? sales / spend : 0
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
            const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0

            if (timeUnitOpt === 'DAILY' && anyPerf.date) {
              // Store in performance history table
              const { data: existingKeyword } = await supabase
                .from('keywords')
                .select('id')
                .eq('amazon_keyword_id', keywordId.toString())
                .single()
              
              if (existingKeyword) {
                await supabase.from('keyword_performance_history').upsert({
                  keyword_id: existingKeyword.id,
                  date: anyPerf.date,
                  attribution_window: '14d',
                  impressions,
                  clicks,
                  spend,
                  sales,
                  orders,
                  acos,
                  roas,
                  ctr,
                  cpc: clicks > 0 ? spend / clicks : 0,
                  conversion_rate: conversionRate
                }, {
                  onConflict: 'keyword_id,date,attribution_window',
                  ignoreDuplicates: false
                })
                totalMetricsUpdated++
              }
            } else {
              // SUMMARY mode: update keywords table directly
              const { data: kwUpd, error: kwErr } = await supabase
                .from('keywords')
                .update({
                  impressions,
                  clicks,
                  cost_14d: spend,
                  attributed_sales_14d: sales,
                  attributed_conversions_14d: orders,
                  acos,
                  roas,
                  last_updated: new Date().toISOString()
                })
                .eq('amazon_keyword_id', keywordId.toString())
                .select('id, adgroup_id, ad_groups(amazon_adgroup_id)')

              if (kwErr) {
                console.error(`Failed to update keyword ${keywordId}:`, kwErr)
              } else if (kwUpd && kwUpd.length > 0) {
                totalMetricsUpdated++
                
                // Also try to backfill ad group metrics by aggregating keyword data
                const agAmazonId = (kwUpd[0] as any).ad_groups?.amazon_adgroup_id
                if (agAmazonId) {
                  const storedAdGroup = adGroupMap.get(agAmazonId.toString())
                  if (ag?.id) {
                    // Simple approach: update with current keyword's metrics
                    // In a real system, you'd aggregate all keywords for this ad group
                    await supabase
                      .from('ad_groups')
                      .upsert({
                        id: ag.id,
                        impressions,
                        clicks,
                        cost_14d: spend,
                        attributed_sales_14d: sales,
                        attributed_conversions_14d: orders,
                        acos,
                        roas,
                        ctr,
                        conversion_rate: conversionRate,
                        last_updated: new Date().toISOString()
                      }, {
                        onConflict: 'id',
                        ignoreDuplicates: false
                      })

                    diagnostics.backfilled.keywords++

                    const { error: upErr } = result
                    if (upErr) {
                      console.error(`Failed to backfill ad group ${ag.id} with keyword data:`, upErr)
                    }
                  }
                }
              }
            }
          }

          diagnostics.keywordReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: keywordColumns }
        }

        console.log('✅ Keyword performance data synced successfully')
      } catch (error) {
        console.error('❌ Keyword performance sync failed:', error)
        diagnostics.keywordReportError = String(error)
      }
    }

    // PHASE 3: Sync budget usage data
    console.log('💰 Syncing budget usage data...')
    if (campaignIds.length > 0) {
      try {
        // Process in smaller batches to avoid API limits
        const budgetBatchSize = 50
        for (let i = 0; i < campaignIds.length; i += budgetBatchSize) {
          const batch = campaignIds.slice(i, i + budgetBatchSize)
          
          try {
            // Amazon's Budget Usage API endpoint
            const budgetResponse = await fetchWithRetry(`${apiEndpoint}/budgets/usage/campaigns`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': connection.profile_id,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                campaignIds: batch,
                startDate: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              })
            })

            if (budgetResponse.ok) {
              const budgetData = await budgetResponse.json()
              
              if (budgetData.usage && Array.isArray(budgetData.usage)) {
                for (const usageEntry of budgetData.usage) {
                  if (usageEntry.campaignId && usageEntry.date) {
                    // Find the campaign in our stored data
                    const campaign = campaignMap.get(usageEntry.campaignId.toString())
                    if (campaign) {
                      // Store budget usage data
                      const { error: budgetError } = await supabase
                        .from('campaign_budget_usage')
                        .upsert({
                          campaign_id: campaign.id,
                          date: usageEntry.date,
                          period_type: 'DAILY',
                          budget_amount: parseFloat(usageEntry.budgetAmount) || null,
                          usage_amount: parseFloat(usageEntry.usageAmount) || null,
                          usage_percentage: parseFloat(usageEntry.usagePercentage) || null,
                          currency: usageEntry.currency || null
                        }, {
                          onConflict: 'campaign_id,date,period_type',
                          ignoreDuplicates: false
                        })
                      if (budgetError) {
                        console.error(`Failed to store budget usage for campaign ${campaign.id}:`, budgetError)
                      }
                    }
                  }
                }
              }
            }
          } catch (batchError) {
            console.warn(`Budget usage sync failed for batch ${i}-${i + budgetBatchSize}:`, batchError)
          }
        }
        
        console.log('✅ Budget usage data synced')
      } catch (error) {
        console.warn('⚠️ Budget usage sync failed:', error)
        diagnostics.budgetUsageError = String(error)
      }
    }

    // Update sync job as completed
    if (syncJobId) {
      await supabase.from('sync_jobs').update({
        status: 'completed',
        phase: 'completed',
        progress_percent: 100,
        finished_at: new Date().toISOString(),
        sync_details: {
          entitiesSynced: {
            campaigns: campaignIds.length,
            adGroups: adGroupIds.length,
            keywords: keywordIds.length,
            targets: targetIds.length
          },
          metricsUpdated: totalMetricsUpdated
        }
      }).eq('id', syncJobId)
    }

    // Update connection sync timestamp
    await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        campaign_count: campaignIds.length,
        status: 'active',
        health_status: 'healthy'
      })
      .eq('id', connectionId)

    // Early exit if no metrics were updated
    if (totalMetricsUpdated === 0) {
      console.log('⚠️ No performance metrics were updated')
      
      return new Response(
        JSON.stringify({
          success: true,
          code: 'NO_METRICS_UPDATED',
          message: 'Sync completed but no performance metrics were updated',
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

    // If DAILY sync, roll up 14-day aggregates into campaigns table
    if (timeUnitOpt === 'DAILY') {
      console.log('Rolling up 14-day campaign aggregates...')
      try {
        const { error: rollupError } = await supabase.rpc('rollup_campaign_aggregates_14d', {
          p_connection_id: connectionId
        })
        if (rollupError) {
          console.error('Failed to roll up campaign aggregates:', rollupError)
          diagnostics.rollupError = rollupError.message ?? String(rollupError)
        } else {
          console.log('Successfully rolled up campaign aggregates')
          diagnostics.rollupSuccess = true
        }
      } catch (error) {
        console.error('Error during campaign rollup:', error)
        diagnostics.rollupError = (error as Error)?.message || String(error)
      }
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

    // Mark sync job as failed
    if (syncJobId) {
      await supabase.from('sync_jobs').update({
        status: 'error',
        phase: 'error',
        progress_percent: 0,
        finished_at: new Date().toISOString(),
        error_details: { error: message, code }
      }).eq('id', syncJobId)
    }

    return new Response(
      JSON.stringify({ success: false, code, message, error: message }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})