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
  reportId?: string
}

interface PerformanceData {
  campaignId?: string
  adGroupId?: string
  targetingType?: string
  targetingText?: string
  matchType?: string
  targeting?: string
  keywordId?: string
  targetId?: string
  searchTerm?: string
  keywordText?: string
  date?: string
  impressions?: number
  clicks?: number
  cost?: number
  sales_7d?: number
  purchases_7d?: number
  sales_1d?: number
  purchases_1d?: number
  sales30d?: number
  purchases30d?: number
}

// Wait with exponential backoff
async function waitWithExponentialBackoff(attempt: number) {
  const baseDelay = 1000
  const delay = baseDelay * Math.pow(2, attempt)
  console.log(`⏳ Waiting ${delay}ms before retry attempt ${attempt + 1}`)
  await new Promise(resolve => setTimeout(resolve, delay))
}

// Fetch with retry for 429 and 5xx errors
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // If successful, return immediately
      if (response.ok) {
        return response
      }
      
      // If it's a client error (4xx except 429), don't retry
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response
      }
      
      // For 429 (rate limit) or 5xx errors, retry with backoff
      if (attempt < maxRetries && (response.status === 429 || response.status >= 500)) {
        console.log(`⚠️ Request failed with status ${response.status}, retrying...`)
        await waitWithExponentialBackoff(attempt)
        continue
      }
      
      return response
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        console.log(`⚠️ Request failed with error: ${lastError.message}, retrying...`)
        await waitWithExponentialBackoff(attempt)
        continue
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}

// Generate performance report
async function createReportRequest(
  accessToken: string, 
  profileId: string, 
  reportType: string,
  dateRange: number,
  timeUnit: 'SUMMARY' | 'DAILY' = 'SUMMARY',
  columns: string[] = ['impressions', 'clicks', 'cost', 'sales_7d', 'purchases_7d'],
  entityIds?: string[],
  apiEndpoint: string = 'https://advertising-api.amazon.com'
): Promise<string> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - dateRange)
  
  const requestBody: any = {
    reportDate: startDate.toISOString().split('T')[0],
    reportEndDate: endDate.toISOString().split('T')[0],
    timeUnit: timeUnit,
    columns: columns,
    format: 'GZIP_JSON'
  }

  // Add entity filters if provided
  if (entityIds && entityIds.length > 0) {
    if (reportType === 'campaigns') {
      requestBody.campaignIdFilter = entityIds
    } else if (reportType === 'adGroups') {
      requestBody.adGroupIdFilter = entityIds  
    } else if (reportType === 'keywords') {
      requestBody.keywordIdFilter = entityIds
    } else if (reportType === 'targets') {
      requestBody.targetIdFilter = entityIds
    }
  }

  // Map report types to correct v3 reportTypeId and groupBy values
  const reportTypeMapping: Record<string, { reportTypeId: string, groupBy: string }> = {
    'campaigns': { reportTypeId: 'spCampaigns', groupBy: 'campaign' },
    'adGroups': { reportTypeId: 'spAdGroups', groupBy: 'adGroup' },
    'keywords': { reportTypeId: 'spKeywords', groupBy: 'keyword' },
    'targets': { reportTypeId: 'spTargets', groupBy: 'target' },
    'searchTerms': { reportTypeId: 'spSearchTerms', groupBy: 'searchTerm' }
  }

  const mapping = reportTypeMapping[reportType]
  if (!mapping) {
    throw new Error(`Unsupported report type: ${reportType}`)
  }

  console.log(`📊 Creating ${reportType} report with ${columns.length} columns, timeUnit: ${timeUnit}`)
  if (entityIds) {
    console.log(`🎯 Filtering to ${entityIds.length} specific entities`)
  }

  const response = await fetchWithRetry(
    `${apiEndpoint}/reporting/reports`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID') || '',
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.amazon.reporting.v3+json'
      },
      body: JSON.stringify({
        name: `${reportType}_${timeUnit.toLowerCase()}_${Date.now()}`,
        startDate: requestBody.reportDate,
        endDate: requestBody.reportEndDate,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          groupBy: [mapping.groupBy],
          columns: columns,
          reportTypeId: mapping.reportTypeId,
          timeUnit: timeUnit,
          format: 'GZIP_JSON',
          ...(entityIds && { 
            filters: [{
              field: reportType === 'campaigns' ? 'CAMPAIGN_ID' : 
                     reportType === 'adGroups' ? 'AD_GROUP_ID' :
                     reportType === 'keywords' ? 'KEYWORD_ID' : 
                     reportType === 'targets' ? 'TARGET_ID' : 'SEARCH_TERM',
              values: entityIds
            }]
          })
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ Report creation failed: ${response.status} ${errorText}`)
    
    // Enhanced error logging for debugging
    const errorDetails = {
      stage: 'create',
      status: response.status,
      statusText: response.statusText,
      bodySnippet: errorText.substring(0, 200),
      endpoint: apiEndpoint,
      reportType: reportType,
      profileId: profileId,
      requestBody: JSON.stringify({
        name: `${reportType}_${timeUnit.toLowerCase()}_${Date.now()}`,
        startDate: requestBody.reportDate,
        endDate: requestBody.reportEndDate,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          groupBy: [mapping.groupBy],
          columns: columns,
          reportTypeId: mapping.reportTypeId,
          timeUnit: timeUnit,
          format: 'GZIP_JSON'
        }
      }).substring(0, 300)
    }
    
    console.error('📊 Report creation error details:', errorDetails)
    throw new Error(`Report creation failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log(`✅ Report created with ID: ${result.reportId}`)
  return result.reportId
}

// Poll report status until completion
async function pollReportStatus(
  accessToken: string, 
  profileId: string, 
  reportId: string,
  maxWaitTime = 300000, // 5 minutes
  apiEndpoint: string = 'https://advertising-api.amazon.com'
): Promise<ReportRequest> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetchWithRetry(
      `${apiEndpoint}/reporting/reports/${reportId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID') || '',
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/vnd.amazon.reporting.v3+json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Report status check failed: ${response.status}`)
    }

    const result = await response.json()
    console.log(`📊 Report ${reportId} status: ${result.status}`)
    
    if (result.status === 'COMPLETED') {
      return result
    } else if (result.status === 'FAILED') {
      throw new Error(`Report generation failed: ${result.statusDetails}`)
    }
    
    // Wait 10 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 10000))
  }
  
  throw new Error('Report generation timeout')
}

// Download and parse gzipped JSON report
async function downloadAndParseReport(downloadUrl: string): Promise<PerformanceData[]> {
  console.log('📥 Downloading report data...')
  
  const response = await fetchWithRetry(downloadUrl, {})
  
  if (!response.ok) {
    throw new Error(`Report download failed: ${response.status}`)
  }
  
  const gzippedData = await response.arrayBuffer()
  
  // Decompress gzipped data
  const decompressedData = new Response(
    new ReadableStream({
      start(controller) {
        const stream = new DecompressionStream('gzip')
        const writer = stream.writable.getWriter()
        const reader = stream.readable.getReader()
        
        writer.write(new Uint8Array(gzippedData))
        writer.close()
        
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.close()
              break
            }
            controller.enqueue(value)
          }
        }
        pump()
      }
    })
  )
  
  const jsonText = await decompressedData.text()
  const results = jsonText.trim().split('\\n').map(line => JSON.parse(line))
  
  console.log(`✅ Parsed ${results.length} performance records`)
  return results
}

// Fetch all pages of paginated API results
async function fetchAllPages(
  accessToken: string, 
  profileId: string, 
  endpoint: string,
  maxResults = 10000,
  apiEndpoint: string = 'https://advertising-api.amazon.com'
): Promise<any[]> {
  const results: any[] = []
  let nextToken: string | undefined
  let pageCount = 0
  const maxPages = Math.ceil(maxResults / 1000) // Assuming 1000 per page max
  
  // Validate the API endpoint before starting
  if (!apiEndpoint.includes('advertising-api')) {
    console.warn(`⚠️  Invalid API endpoint format: ${apiEndpoint}, falling back to default`)
    apiEndpoint = 'https://advertising-api.amazon.com'
  }
  
  console.log(`🌍 Fetching ${endpoint} from regional endpoint: ${apiEndpoint}`)
  
  do {
    pageCount++
    console.log(`📄 Fetching page ${pageCount} from ${endpoint}`)
    
    let url = `${apiEndpoint}/sp/${endpoint}?count=1000`
    if (nextToken) {
      url += `&nextToken=${encodeURIComponent(nextToken)}`
    }
    
    const response = await fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID') || '',
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Failed to fetch ${endpoint}: ${response.status} ${errorText}`)
      console.error(`🔗 Request URL: ${url}`)
      console.error(`🌍 API Endpoint: ${apiEndpoint}`)
      break
    }
    
    const data = await response.json()
    results.push(...(data.campaigns || data.adGroups || data.keywords || data.targets || []))
    nextToken = data.nextToken
    
    console.log(`✅ Page ${pageCount}: ${data.campaigns?.length || data.adGroups?.length || data.keywords?.length || data.targets?.length || 0} items`)
    
    if (pageCount >= maxPages) {
      console.log(`⚠️ Reached max pages limit (${maxPages})`)
      break
    }
  } while (nextToken)
  
  console.log(`✅ Total ${endpoint} fetched: ${results.length} from ${apiEndpoint}`)
  return results
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let syncJobId: string | undefined;

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
    
    // Use helper function to clean up existing jobs and create new one
    const { data: newJobId, error: jobError } = await supabase
      .rpc('cleanup_and_create_sync_job', {
        p_connection_id: connectionId,
        p_user_id: user.id
      })

    if (jobError || !newJobId) {
      console.error('Failed to create sync job:', jobError)
      throw new Error('Failed to create sync job: ' + (jobError?.message || 'Unknown error'))
    }
    
    syncJobId = newJobId
    console.log('✅ Created sync job:', syncJobId)

    // Update sync job progress with timeout check
    const updateProgress = async (progress: number, phase?: string) => {
      if (syncJobId) {
        // Check if sync has been running too long (30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        
        const { data: currentJob } = await supabase
          .from('sync_jobs')
          .select('started_at, status')
          .eq('id', syncJobId)
          .single()
          
        if (currentJob && currentJob.started_at < thirtyMinutesAgo && currentJob.status === 'running') {
          console.warn('⏰ Sync job has exceeded 30 minute timeout')
          throw new Error('Sync job timeout - process took too long')
        }
        
        await supabase
          .from('sync_jobs')
          .update({ 
            progress_percent: progress,
            ...(phase && { phase })
          })
          .eq('id', syncJobId)
      }
    }

    // Get Amazon connection
    const { data: connection, error: connectionError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      throw new Error('Connection not found')
    }

    // Check connection status - allow active connections even with setup_required_reason
    // since tokens might still be valid
    if (connection.status !== 'active' && connection.status !== 'setup_required') {
      throw new Error(`Connection is not active (status: ${connection.status})`)
    }

    // Get encryption key
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable not found')
    }

    // Set encryption key in session for token decryption
    const { error: setKeyError } = await supabase
      .rpc('set_config', {
        key: 'app.enc_key',
        value: encryptionKey,
        is_local: true
      });

    if (setKeyError) {
      console.error('Failed to set encryption key in session:', setKeyError);
      throw new Error('Failed to configure session for token retrieval');
    }

    // Get tokens from secure storage using the RPC function
    let tokensResult;
    try {
      tokensResult = await supabase.rpc('get_tokens', { p_profile_id: connection.profile_id });
    } catch (error) {
      console.error('RPC get_tokens failed:', error);
      
      // Update connection with error status
      await supabase
        .from('amazon_connections')
        .update({ 
          setup_required_reason: 'Failed to retrieve tokens - please reconnect your Amazon account',
          health_status: 'error'
        })
        .eq('id', connectionId)
        
      throw new Error('Failed to retrieve stored tokens - connection needs to be re-established');
    }

    const { data: tokens, error: tokensError } = tokensResult;

    if (tokensError || !tokens || tokens.length === 0) {
      console.error('Failed to retrieve stored tokens:', tokensError)
      
      // Update connection with error status
      await supabase
        .from('amazon_connections')
        .update({ 
          setup_required_reason: 'Failed to retrieve tokens - please reconnect your Amazon account',
          health_status: 'error'
        })
        .eq('id', connectionId)
        
      throw new Error('Failed to retrieve stored tokens - connection needs to be re-established')
    }

    let accessToken = tokens[0].access_token
    const refreshToken = tokens[0].refresh_token

    // Check if token needs refresh (expires within 5 minutes)
    const expiresAt = new Date(tokens[0].expires_at)
    const now = new Date()
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('🔄 Access token needs refresh')
      
      try {
        const refreshResponse = await supabase.functions.invoke('refresh-amazon-token', {
          body: { 
            connectionId: connectionId,
            profileId: connection.profile_id 
          }
        })

        if (refreshResponse.error) {
          throw new Error(`Token refresh failed: ${refreshResponse.error.message}`)
        }

        const { accessToken: newAccessToken } = refreshResponse.data
        if (!newAccessToken) {
          throw new Error('No access token returned from refresh')
        }

        accessToken = newAccessToken
        console.log('✅ Token refreshed successfully')
        
        // Update connection status to active if it was setup_required
        if (connection.status === 'setup_required') {
          await supabase
            .from('amazon_connections')
            .update({ 
              status: 'active',
              setup_required_reason: null,
              health_status: 'healthy' 
            })
            .eq('id', connectionId)
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error)
        throw new Error(`Token refresh failed: ${error}`)
      }
    }

    await updateProgress(10, 'Fetching Amazon campaigns...')

    // Track diagnostics
    const diagnostics: any = {
      startTime: new Date().toISOString(),
      dateRange,
      timeUnit: timeUnitOpt,
      diagnosticMode: diag
    }

    // Get API endpoint with detailed logging
    const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api.amazon.com'
    console.log(`🌍 Using API endpoint: ${apiEndpoint} for profile: ${connection.profile_id}`)
    console.log(`📍 Marketplace: ${connection.marketplace_id || 'unknown'}`)
    
    if (!connection.advertising_api_endpoint) {
      console.warn(`⚠️  No advertising_api_endpoint set for profile ${connection.profile_id}, using default NA endpoint`)
    }
    
    // Fetch campaigns
    console.log('📁 Fetching campaigns...')
    const campaigns = await fetchAllPages(accessToken, connection.profile_id, 'campaigns', 10000, apiEndpoint)
    console.log(`✅ Found ${campaigns.length} campaigns`)

    await updateProgress(20, 'Storing campaign data...')

    // Store campaigns
    const campaignIds: string[] = []
    for (const campaign of campaigns) {
      try {
        const { error: campaignError } = await supabase
          .from('campaigns')
          .upsert({
            campaign_id: campaign.campaignId,
            connection_id: connectionId,
            name: campaign.name,
            campaign_type: campaign.campaignType,
            targeting_type: campaign.targetingType,
            state: campaign.state,
            daily_budget: campaign.dynamicBidding?.strategy ? null : campaign.budget?.budget,
            start_date: campaign.startDate,
            end_date: campaign.endDate,
            bid_strategy: campaign.dynamicBidding?.strategy,
            placement_bidding: campaign.dynamicBidding?.placementBidding ? JSON.stringify(campaign.dynamicBidding.placementBidding) : null,
            budget_type: campaign.budget?.budgetType,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'campaign_id,connection_id',
            ignoreDuplicates: false
          })

        if (campaignError) {
          console.warn(`Failed to store campaign ${campaign.campaignId}:`, campaignError)
        } else {
          campaignIds.push(campaign.campaignId)
        }
      } catch (error) {
        console.warn(`Failed to process campaign ${campaign.campaignId}:`, error)
      }
    }

    await updateProgress(30, 'Fetching ad groups...')

    // Fetch and store ad groups
    console.log('📁 Fetching ad groups...')
    const adGroups = await fetchAllPages(accessToken, connection.profile_id, 'adGroups', 10000, apiEndpoint)
    console.log(`✅ Found ${adGroups.length} ad groups`)

    const adGroupIds: string[] = []
    for (const adGroup of adGroups) {
      try {
        // Get the stored campaign for targeting type
        const { data: storedCampaign } = await supabase
          .from('campaigns')
          .select('targeting_type')
          .eq('campaign_id', adGroup.campaignId)
          .eq('connection_id', connectionId)
          .single()

        const { error: adGroupError } = await supabase
          .from('ad_groups')
          .upsert({
            adgroup_id: adGroup.adGroupId,
            campaign_id: adGroup.campaignId,
            connection_id: connectionId,
            name: adGroup.name,
            default_bid: adGroup.defaultBid,
            state: adGroup.state,
            campaign_targeting_type: storedCampaign?.targeting_type,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'adgroup_id,connection_id',
            ignoreDuplicates: false
          })

        if (adGroupError) {
          console.warn(`Failed to store ad group ${adGroup.adGroupId}:`, adGroupError)
        } else {
          adGroupIds.push(adGroup.adGroupId)
        }

        // Sync keywords for this ad group
        try {
          const keywords = await fetchAllPages(accessToken, connection.profile_id, `adGroups/${adGroup.adGroupId}/keywords`, 10000, apiEndpoint)
          
          for (const keyword of keywords) {
            await supabase
              .from('keywords')
              .upsert({
                amazon_keyword_id: keyword.keywordId,
                adgroup_id: adGroup.adGroupId,
                campaign_id: adGroup.campaignId,
                connection_id: connectionId,
                keyword_text: keyword.keywordText,
                match_type: keyword.matchType,
                state: keyword.state,
                bid: keyword.bid,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'adgroup_id,amazon_keyword_id',
                ignoreDuplicates: false
              })
          }
        } catch (error) {
          console.warn(`Failed to sync keywords for ad group ${adGroup.adGroupId}:`, error)
        }
      } catch (error) {
        console.warn(`Failed to sync ad groups for campaign ${adGroup.campaignId}:`, error)
      }
    }

    await updateProgress(40, 'Fetching keywords...')

    // Fetch all keywords
    console.log('📁 Fetching keywords...')
    const keywords = await fetchAllPages(accessToken, connection.profile_id, 'keywords', 10000, apiEndpoint)
    console.log(`✅ Found ${keywords.length} keywords`)

    const keywordIds: string[] = []
    for (const keyword of keywords) {
      try {
        const { error: keywordError } = await supabase
          .from('keywords')
          .upsert({
            amazon_keyword_id: keyword.keywordId,
            adgroup_id: keyword.adGroupId,
            campaign_id: keyword.campaignId,
            connection_id: connectionId,
            keyword_text: keyword.keywordText,
            match_type: keyword.matchType,
            state: keyword.state,
            bid: keyword.bid,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'adgroup_id,amazon_keyword_id',
            ignoreDuplicates: false
          })

        if (keywordError) {
          console.warn(`Failed to store keyword ${keyword.keywordId}:`, keywordError)
        } else {
          keywordIds.push(keyword.keywordId)
        }
      } catch (error) {
        console.warn(`Failed to sync keywords for ad group ${keyword.adGroupId}:`, error)
      }
    }

    await updateProgress(50, 'Fetching targets...')

    // Fetch targets
    console.log('📁 Fetching targets...')
    const targets = await fetchAllPages(accessToken, connection.profile_id, 'targets', 10000, apiEndpoint)
    console.log(`✅ Found ${targets.length} targets`)

    const targetIds: string[] = []
    for (const target of targets) {
      try {
        const { error: targetError } = await supabase
          .from('targets')
          .upsert({
            amazon_target_id: target.targetId,
            adgroup_id: target.adGroupId,
            campaign_id: target.campaignId,
            connection_id: connectionId,
            expression_type: target.expression?.[0]?.type,
            expression_value: target.expression?.[0]?.value,
            state: target.state,
            bid: target.bid,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'adgroup_id,amazon_target_id',
            ignoreDuplicates: false
          })

        if (targetError) {
          console.warn(`Failed to store target ${target.targetId}:`, targetError)
        } else {
          targetIds.push(target.targetId)
        }
      } catch (error) {
        console.warn(`Failed to sync targets for ad group ${target.adGroupId}:`, error)
      }
    }

    // Fetch advertised products for ASIN data (only for campaigns, not performance)
    if (campaignIds.length > 0) {
      try {
        console.log('📁 Fetching advertised products for ASIN data...')
        const advertisedProducts = await fetchAllPages(accessToken, connection.profile_id, 'advertised/products', 10000, apiEndpoint)
        console.log(`✅ Found ${advertisedProducts.length} advertised products`)
        
        // Group ASINs by campaign for efficient updates
        const campaignAsinUpdates = new Map<string, string[]>()
        
        for (const product of advertisedProducts) {
          if (product.campaignId && product.asin) {
            if (!campaignAsinUpdates.has(product.campaignId)) {
              campaignAsinUpdates.set(product.campaignId, [])
            }
            campaignAsinUpdates.get(product.campaignId)!.push(product.asin)
          }
        }
        
        // Update campaigns with their ASINs
        for (const [campaignId, asins] of campaignAsinUpdates) {
          await supabase
            .from('campaigns')
            .update({ 
              asins: asins,
              updated_at: new Date().toISOString()
            })
            .eq('campaign_id', campaignId)
            .eq('connection_id', connectionId)
        }
        
        console.log(`✅ Updated ASINs for ${campaignAsinUpdates.size} campaigns from advertised products`)
      } catch (error) {
        console.warn('⚠️ Failed to fetch advertised products for ASIN data:', error)
      }
    }

    await updateProgress(60, 'Processing performance reports...')

    // Performance data sync
    let totalMetricsUpdated = 0

    // Define columns for each report type - use proper v3 snake_case format
    const campaignColumns = ['impressions', 'clicks', 'cost', 'purchases_7d', 'sales_7d']
    const adGroupColumns = ['impressions', 'clicks', 'cost', 'purchases_7d', 'sales_7d']  
    const targetColumns = ['impressions', 'clicks', 'cost', 'purchases_7d', 'sales_7d']
    const keywordColumns = ['impressions', 'clicks', 'cost', 'purchases_7d', 'sales_7d']
    const searchTermColumns = ['date','campaignId','adGroupId','keywordId','searchTerm','clicks','impressions','cost','attributedConversions7d','attributedSales7d']

    // Only generate reports if we have data to report on
    if (campaignIds.length === 0 && adGroupIds.length === 0 && keywordIds.length === 0 && targetIds.length === 0) {
      await updateProgress(100, 'No entities found to sync')
      
      if (syncJobId) {
        await supabase
          .from('sync_jobs')
          .update({ 
            status: 'completed',
            finished_at: new Date().toISOString(),
            progress_percent: 100,
            phase: 'Sync completed - no entities found'
          })
          .eq('id', syncJobId)
      }

      return new Response(
        JSON.stringify({
          success: true,
          code: 'SYNC_COMPLETE_NO_DATA',
          message: 'Sync completed but no entities were found',
          entitiesSynced: {
            campaigns: 0,
            adGroups: 0,
            keywords: 0,
            targets: 0
          },
          metricsUpdated: 0,
          diagnostics
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Campaign performance reports
    if (campaignIds.length > 0) {
      console.log('📊 Syncing campaign performance data...')
      try {
        const reportId = await createReportRequest(
          accessToken, 
          connection.profile_id, 
          'campaigns',
          dateRange,
          timeUnitOpt,
          campaignColumns,
          campaignIds,
          apiEndpoint
        )

        const reportResult = await pollReportStatus(accessToken, connection.profile_id, reportId, 300000, apiEndpoint)
        
        if (reportResult.url) {
          const performanceData = await downloadAndParseReport(reportResult.url)
          
          console.log(`📊 Processing ${performanceData.length} campaign performance records...`)
          let campaignMetricsUpdated = 0

          for (const record of performanceData) {
            try {
              const updateData: any = {
                impressions: record.impressions || 0,
                clicks: record.clicks || 0,
                cost: record.cost || 0,
                sales_7d: record.sales_7d || 0,
                orders_7d: record.purchases_7d || 0,
                updated_at: new Date().toISOString()
              }

              // Add date for DAILY reports
              if (timeUnitOpt === 'DAILY' && record.date) {
                updateData.date = record.date
              }

              const { error: updateError } = await supabase
                .from('campaigns')
                .update(updateData)
                .eq('campaign_id', record.campaignId)
                .eq('connection_id', connectionId)

              if (updateError) {
                console.warn(`Failed to update campaign ${record.campaignId} metrics:`, updateError)
              } else {
                campaignMetricsUpdated++
                
                // Also insert into fact tables for daily data
                if (timeUnitOpt === 'DAILY' && record.date) {
                  // Insert into AMS streaming tables for real-time dashboard
                  await supabase
                    .from('ams_messages_sp_traffic')
                    .insert({
                      profile_id: connection.profile_id,
                      campaign_id: record.campaignId,
                      hour_start: new Date(record.date + 'T12:00:00Z'), // Use noon for daily data
                      impressions: record.impressions || 0,
                      clicks: record.clicks || 0,
                      cost: record.cost || 0,
                      connection_id: connectionId,
                      payload: {}
                    })
                    .onConflict('profile_id,campaign_id,hour_start')

                  // Insert conversion data
                  if (record.sales_7d || record.purchases_7d) {
                    await supabase
                      .from('ams_messages_sp_conversion')
                      .insert({
                        profile_id: connection.profile_id,
                        campaign_id: record.campaignId,
                        hour_start: new Date(record.date + 'T12:00:00Z'),
                        attributed_sales: record.sales_7d || 0,
                        attributed_conversions: record.purchases_7d || 0,
                        connection_id: connectionId,
                        payload: {}
                      })
                      .onConflict('profile_id,campaign_id,hour_start')
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to process campaign performance record:`, error)
            }
          }

          totalMetricsUpdated += campaignMetricsUpdated
          console.log(`✅ Updated metrics for ${campaignMetricsUpdated} campaigns`)
          diagnostics.campaignReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: campaignColumns }
        }

        console.log('✅ Campaign performance data synced successfully')
      } catch (error) {
        if (error instanceof Error && error.message.includes('400')) {
          console.warn('⚠️ Campaign report failed, trying with minimal columns...')
          try {
              const reportId = await createReportRequest(
                accessToken, 
                connection.profile_id, 
                'campaigns',
                dateRange,
                timeUnitOpt,
                ['impressions', 'clicks', 'cost'], // Minimal columns
                campaignIds,
                apiEndpoint
              )

              const reportResult = await pollReportStatus(accessToken, connection.profile_id, reportId, 300000, apiEndpoint)
            
            if (reportResult.url) {
              const performanceData = await downloadAndParseReport(reportResult.url)
              
              let campaignMetricsUpdated = 0
              for (const record of performanceData) {
                try {
                  const updateData: any = {
                    impressions: record.impressions || 0,
                    clicks: record.clicks || 0,
                    cost: record.cost || 0,
                    updated_at: new Date().toISOString()
                  }

                  if (timeUnitOpt === 'DAILY' && record.date) {
                    updateData.date = record.date
                  }

                  const { error: updateError } = await supabase
                    .from('campaigns')
                    .update(updateData)
                    .eq('campaign_id', record.campaignId)
                    .eq('connection_id', connectionId)

                  if (!updateError) {
                    campaignMetricsUpdated++
                  }
                } catch (error) {
                  console.warn(`Failed to process campaign performance record:`, error)
                }
              }

              totalMetricsUpdated += campaignMetricsUpdated
              diagnostics.campaignReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: ['impressions', 'clicks', 'cost'], fallback: true }
              console.log(`✅ Updated metrics for ${campaignMetricsUpdated} campaigns (minimal columns)`)
            }
          } catch (fallbackError) {
            console.error('❌ Campaign performance sync failed (including fallback):', fallbackError)
            diagnostics.campaignReportError = String(fallbackError)
          }
        } else {
          console.error('❌ Campaign performance sync failed:', error)
          diagnostics.campaignReportError = String(error)
        }
      }
    }

    await updateProgress(70, 'Syncing ad group performance...')

    // Ad Group performance reports
    if (adGroupIds.length > 0) {
      console.log('📊 Syncing ad group performance data...')
      try {
        const reportId = await createReportRequest(
          accessToken, 
          connection.profile_id, 
          'adGroups',
          dateRange,
          timeUnitOpt,
          adGroupColumns,
          adGroupIds,
          apiEndpoint
        )

        const reportResult = await pollReportStatus(accessToken, connection.profile_id, reportId, 300000, apiEndpoint)
        
        if (reportResult.url) {
          const performanceData = await downloadAndParseReport(reportResult.url)
          
          console.log(`📊 Processing ${performanceData.length} ad group performance records...`)
          let adGroupMetricsUpdated = 0

          for (const record of performanceData) {
            try {
              const updateData: any = {
                impressions: record.impressions || 0,
                clicks: record.clicks || 0,
                cost: record.cost || 0,
                sales_7d: record.sales_7d || 0,
                orders_7d: record.purchases_7d || 0,
                updated_at: new Date().toISOString()
              }

              if (timeUnitOpt === 'DAILY' && record.date) {
                updateData.date = record.date
              }

              const { error: updateError } = await supabase
                .from('ad_groups')
                .update(updateData)
                .eq('adgroup_id', record.adGroupId)
                .eq('connection_id', connectionId)

              if (updateError) {
                console.warn(`Failed to update ad group ${record.adGroupId} metrics:`, updateError)
              } else {
                adGroupMetricsUpdated++
                
                // Also insert into fact tables for daily data  
                if (timeUnitOpt === 'DAILY' && record.date) {
                  // Insert into AMS streaming tables for real-time dashboard
                  await supabase
                    .from('ams_messages_sp_traffic')
                    .insert({
                      profile_id: connection.profile_id,
                      campaign_id: record.campaignId,
                      ad_group_id: record.adGroupId,
                      hour_start: new Date(record.date + 'T12:00:00Z'), // Use noon for daily data
                      impressions: record.impressions || 0,
                      clicks: record.clicks || 0,
                      cost: record.cost || 0,
                      connection_id: connectionId,
                      payload: {}
                    })
                    .onConflict('profile_id,campaign_id,ad_group_id,hour_start')

                  // Insert conversion data
                  if (record.sales_7d || record.purchases_7d) {
                    await supabase
                      .from('ams_messages_sp_conversion')
                      .insert({
                        profile_id: connection.profile_id,
                        campaign_id: record.campaignId,
                        ad_group_id: record.adGroupId,
                        hour_start: new Date(record.date + 'T12:00:00Z'),
                        attributed_sales: record.sales_7d || 0,
                        attributed_conversions: record.purchases_7d || 0,
                        connection_id: connectionId,
                        payload: {}
                      })
                      .onConflict('profile_id,campaign_id,ad_group_id,hour_start')
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to process ad group performance record:`, error)
            }
          }

          totalMetricsUpdated += adGroupMetricsUpdated
          console.log(`✅ Updated metrics for ${adGroupMetricsUpdated} ad groups`)
          diagnostics.adGroupReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: adGroupColumns }
        }

        console.log('✅ Ad group performance data synced successfully')
      } catch (error) {
        if (error instanceof Error && error.message.includes('400')) {
          console.warn('⚠️ Ad group report failed, trying with minimal columns...')
          try {
            const reportId = await createReportRequest(
              accessToken, 
              connection.profile_id, 
              'adGroups',
              dateRange,
              timeUnitOpt,
              ['impressions', 'clicks', 'cost'],
              adGroupIds,
              apiEndpoint
            )

            const reportResult = await pollReportStatus(accessToken, connection.profile_id, reportId, 300000, apiEndpoint)
            
            if (reportResult.url) {
              const performanceData = await downloadAndParseReport(reportResult.url)
              
              let adGroupMetricsUpdated = 0
              for (const record of performanceData) {
                try {
                  const updateData: any = {
                    impressions: record.impressions || 0,
                    clicks: record.clicks || 0,
                    cost: record.cost || 0,
                    updated_at: new Date().toISOString()
                  }

                  if (timeUnitOpt === 'DAILY' && record.date) {
                    updateData.date = record.date
                  }

                  const { error: updateError } = await supabase
                    .from('ad_groups')
                    .update(updateData)
                    .eq('adgroup_id', record.adGroupId)
                    .eq('connection_id', connectionId)

                  if (!updateError) {
                    adGroupMetricsUpdated++
                  }
                } catch (error) {
                  console.warn(`Failed to process ad group performance record:`, error)
                }
              }

              totalMetricsUpdated += adGroupMetricsUpdated
              diagnostics.adGroupReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: ['impressions', 'clicks', 'cost'], fallback: true }
              console.log(`✅ Updated metrics for ${adGroupMetricsUpdated} ad groups (minimal columns)`)
            }
          } catch (fallbackError) {
            console.error('❌ Ad group performance sync failed (including fallback):', fallbackError)
            diagnostics.adGroupReportError = String(fallbackError)
          }
        } else {
          console.error('❌ Ad group performance sync failed:', error)
          diagnostics.adGroupReportError = String(error)
        }
      }
    }

    await updateProgress(80, 'Syncing target performance...')

    // Target performance reports
    if (targetIds.length > 0) {
      console.log('📊 Syncing target performance data...')
      try {
        const reportId = await createReportRequest(
          accessToken, 
          connection.profile_id, 
          'targets',
          dateRange,
          timeUnitOpt,
          targetColumns,
          targetIds,
          apiEndpoint
        )

        const reportResult = await pollReportStatus(accessToken, connection.profile_id, reportId, 300000, apiEndpoint)
        
        if (reportResult.url) {
          const performanceData = await downloadAndParseReport(reportResult.url)
          
          console.log(`📊 Processing ${performanceData.length} target performance records...`)
          let targetMetricsUpdated = 0

          for (const record of performanceData) {
            try {
              const updateData: any = {
                impressions: record.impressions || 0,
                clicks: record.clicks || 0,
                cost: record.cost || 0,
                sales_7d: record.sales_7d || 0,
                orders_7d: record.purchases_7d || 0,
                updated_at: new Date().toISOString()
              }

              if (timeUnitOpt === 'DAILY' && record.date) {
                updateData.date = record.date
              }

              const { error: updateError } = await supabase
                .from('targets')
                .update(updateData)
                .eq('amazon_target_id', record.targetId)
                .eq('connection_id', connectionId)

              if (updateError) {
                console.warn(`Failed to update target ${record.targetId} metrics:`, updateError)
              } else {
                targetMetricsUpdated++
                
                // Also insert into fact tables for daily data
                if (timeUnitOpt === 'DAILY' && record.date) {
                  // Insert into AMS streaming tables for real-time dashboard
                  await supabase
                    .from('ams_messages_sp_traffic')
                    .insert({
                      profile_id: connection.profile_id,
                      campaign_id: record.campaignId,
                      ad_group_id: record.adGroupId,
                      target_id: record.targetId,
                      hour_start: new Date(record.date + 'T12:00:00Z'), // Use noon for daily data
                      impressions: record.impressions || 0,
                      clicks: record.clicks || 0,
                      cost: record.cost || 0,
                      connection_id: connectionId,
                      payload: {}
                    })
                    .onConflict('profile_id,campaign_id,ad_group_id,target_id,hour_start')

                  // Insert conversion data
                  if (record.sales_7d || record.purchases_7d) {
                    await supabase
                      .from('ams_messages_sp_conversion')
                      .insert({
                        profile_id: connection.profile_id,
                        campaign_id: record.campaignId,
                        ad_group_id: record.adGroupId,
                        target_id: record.targetId,
                        hour_start: new Date(record.date + 'T12:00:00Z'),
                        attributed_sales: record.sales_7d || 0,
                        attributed_conversions: record.purchases_7d || 0,
                        connection_id: connectionId,
                        payload: {}
                      })
                      .onConflict('profile_id,campaign_id,ad_group_id,target_id,hour_start')
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to process target performance record:`, error)
            }
          }

          totalMetricsUpdated += targetMetricsUpdated
          console.log(`✅ Updated metrics for ${targetMetricsUpdated} targets`)
          diagnostics.targetReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: targetColumns }
        }

        console.log('✅ Target performance data synced successfully')
      } catch (error) {
        console.error('❌ Target performance sync failed:', error)
        diagnostics.targetReportError = String(error)
      }
    }

    await updateProgress(85, 'Syncing search terms for dashboard...')

    // Search Terms performance reports - critical for dashboard and Search Studio
    if (campaignIds.length > 0) {
      console.log('🔍 Syncing search terms performance data...')
      try {
        const reportId = await createReportRequest(
          accessToken, 
          connection.profile_id, 
          'searchTerms',
          dateRange,
          timeUnitOpt,
          ['date','campaignId','adGroupId','keywordId','searchTerm','clicks','impressions','cost','attributedConversions7d','attributedSales7d'],
          campaignIds,
          apiEndpoint
        )

        const reportResult = await pollReportStatus(accessToken, connection.profile_id, reportId, 300000, apiEndpoint)
        
        if (reportResult.url) {
          const performanceData = await downloadAndParseReport(reportResult.url)
          
          console.log(`🔍 Processing ${performanceData.length} search term performance records...`)
          let searchTermMetricsUpdated = 0

          for (const record of performanceData) {
            try {
              // Insert search terms directly into fact_search_term_daily table
              if (timeUnitOpt === 'DAILY' && record.date) {
                const { error: insertError } = await supabase
                  .from('fact_search_term_daily')
                  .upsert({
                    profile_id: connection.profile_id,
                    campaign_id: record.campaignId,
                    ad_group_id: record.adGroupId,
                    keyword_id: record.keywordId || '',
                    keyword_text: record.keywordText || record.targeting || '',
                    search_term: record.searchTerm || '',
                    date: record.date,
                    impressions: record.impressions || 0,
                    clicks: record.clicks || 0,
                    cost_micros: Math.round((record.cost || 0) * 1000000),
                    attributed_conversions_7d: record.attributedConversions7d || 0,
                    attributed_sales_7d_micros: Math.round((record.attributedSales7d || 0) * 1000000),
                    attributed_conversions_1d: record.attributedConversions1d || 0,
                    match_type: record.matchType || 'BROAD',
                    targeting: record.targeting || ''
                  }, {
                    onConflict: 'profile_id,campaign_id,ad_group_id,keyword_id,search_term,date'
                  })
                
                if (insertError) {
                  console.warn(`Failed to upsert search term data:`, insertError)
                }
                
                searchTermMetricsUpdated++
              }
            } catch (error) {
              console.warn(`Failed to process search term performance record:`, error)
            }
          }

          totalMetricsUpdated += searchTermMetricsUpdated
          console.log(`✅ Updated metrics for ${searchTermMetricsUpdated} search terms`)
          diagnostics.searchTermReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: ['date','campaignId','adGroupId','keywordId','searchTerm','clicks','impressions','cost','attributedConversions7d','attributedSales7d'] }
        }

        console.log('✅ Search terms performance data synced successfully')
      } catch (error) {
        console.error('❌ Search terms performance sync failed:', error)
        diagnostics.searchTermReportError = String(error)
      }
    }

    await updateProgress(87, 'Syncing keyword performance...')

    // Keyword performance reports
    if (keywordIds.length > 0) {
      console.log('📊 Syncing keyword performance data...')
      try {
        const reportId = await createReportRequest(
          accessToken, 
          connection.profile_id, 
          'keywords',
          dateRange,
          timeUnitOpt,
          keywordColumns,
          keywordIds,
          apiEndpoint
        )

        const reportResult = await pollReportStatus(accessToken, connection.profile_id, reportId, 300000, apiEndpoint)
        
        if (reportResult.url) {
          const performanceData = await downloadAndParseReport(reportResult.url)
          
          console.log(`📊 Processing ${performanceData.length} keyword performance records...`)
          let keywordMetricsUpdated = 0

          for (const record of performanceData) {
            try {
              const updateData: any = {
                impressions: record.impressions || 0,
                clicks: record.clicks || 0,
                cost: record.cost || 0,
                sales_7d: record.sales_7d || 0,
                orders_7d: record.purchases_7d || 0,
                updated_at: new Date().toISOString()
              }

              if (timeUnitOpt === 'DAILY' && record.date) {
                updateData.date = record.date
              }

              const { error: updateError } = await supabase
                .from('keywords')
                .update(updateData)
                .eq('amazon_keyword_id', record.keywordId)
                .eq('connection_id', connectionId)

              if (updateError) {
                console.warn(`Failed to update keyword ${record.keywordId} metrics:`, updateError)
              } else {
                keywordMetricsUpdated++
              }
            } catch (error) {
              console.warn(`Failed to process keyword performance record:`, error)
            }
          }

          totalMetricsUpdated += keywordMetricsUpdated
          console.log(`✅ Updated metrics for ${keywordMetricsUpdated} keywords`)
          diagnostics.keywordReport = { rows: performanceData.length, timeUnit: timeUnitOpt, columns: keywordColumns }
        }

        console.log('✅ Keyword performance data synced successfully')
      } catch (error) {
        console.error('❌ Keyword performance sync failed:', error)
        diagnostics.keywordReportError = String(error)
      }
    }

    await updateProgress(90, 'Syncing budget usage...')

    // Sync budget usage data
    if (campaignIds.length > 0) {
      try {
        console.log('💰 Syncing budget usage data...')
        for (const campaignId of campaignIds) {
          try {
            const response = await fetchWithRetry(
              `${apiEndpoint}/sp/campaigns/${campaignId}/budget/usage`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID') || '',
                  'Amazon-Advertising-API-Scope': connection.profile_id,
                  'Content-Type': 'application/json'
                }
              }
            )

            if (response.ok) {
              const budgetData = await response.json()
              
              await supabase
                .from('campaigns')
                .update({
                  budget_used: budgetData.usedBudget || 0,
                  budget_remaining: budgetData.remainingBudget || 0,
                  updated_at: new Date().toISOString()
                })
                .eq('campaign_id', campaignId)
                .eq('connection_id', connectionId)
            }
          } catch (error) {
            console.warn(`Failed to sync budget for campaign ${campaignId}:`, error)
          }
        }
        
        console.log('✅ Budget usage data synced')
      } catch (error) {
        console.warn('⚠️ Budget usage sync failed:', error)
        diagnostics.budgetUsageError = String(error)
      }
    }

    await updateProgress(95, 'Finalizing sync...')

    // Mark sync job as completed
    if (syncJobId) {
      await supabase
        .from('sync_jobs')
        .update({ 
          status: 'completed',
          finished_at: new Date().toISOString(),
          progress_percent: 100,
          phase: 'Sync completed successfully'
        })
        .eq('id', syncJobId)
    }

    // Update connection last_sync
    await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        setup_required_reason: null,
        health_status: 'healthy'
      })
      .eq('id', connectionId)

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
        usedReportingV3: true,
        columnsUsed: {
          campaign: ['impressions', 'clicks', 'cost', 'purchases_7d', 'sales_7d'],
          adGroup: ['impressions', 'clicks', 'cost', 'purchases_7d', 'sales_7d'], 
          target: ['impressions', 'clicks', 'cost', 'purchases_7d', 'sales_7d'],
          searchTerm: ['impressions', 'clicks', 'cost', 'purchases_7d', 'sales_7d']
        },
        diagnostics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('🚨 Sync error:', error)
    const message = (error as Error)?.message || 'Unknown error'
    let code = 'SYNC_ERROR'
    
    // Categorize errors for better user feedback
    if (message.includes('Connection is not active')) code = 'CONNECTION_INACTIVE'
    else if (message.includes('Token expired') || message.includes('refresh failed')) code = 'TOKEN_EXPIRED'
    else if (message.includes('Missing Amazon client secret') || message.includes('clientSecret is not defined')) code = 'MISSING_AMAZON_SECRET'
    else if (message.includes('Connection not found')) code = 'CONNECTION_NOT_FOUND'
    else if (message.includes('No authorization header')) code = 'NO_AUTH'
    else if (message.includes('Invalid authorization')) code = 'INVALID_AUTH'

    // Mark sync job as failed  
    if (syncJobId) {
      await supabase
        .from('sync_jobs')
        .update({ 
          status: 'failed',
          finished_at: new Date().toISOString(),
          progress_percent: 0,
          phase: message,
          error_details: { error: message, code }
        })
        .eq('id', syncJobId)
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        code, 
        message: message.includes('clientSecret') 
          ? 'Amazon client secret configuration is missing. Please contact support.' 
          : message,
        error: message 
      }),
      { 
        status: code === 'NO_AUTH' || code === 'INVALID_AUTH' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})