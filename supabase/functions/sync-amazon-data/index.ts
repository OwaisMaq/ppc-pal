import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerSecond: 8, // Reduced for better reliability
  burstSize: 15,
  retryDelay: 2000
}

// Request queue for rate limiting
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private lastRequest = 0

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      if (!this.processing) {
        this.process()
      }
    })
  }

  private async process() {
    this.processing = true
    
    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequest
      
      if (timeSinceLastRequest < (1000 / RATE_LIMIT.requestsPerSecond)) {
        await new Promise(resolve => setTimeout(resolve, (1000 / RATE_LIMIT.requestsPerSecond) - timeSinceLastRequest))
      }
      
      const request = this.queue.shift()
      if (request) {
        this.lastRequest = Date.now()
        await request()
      }
    }
    
    this.processing = false
  }
}

// Enhanced API request with proper Amazon Ads API error handling
async function makeAmazonApiRequest(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        return response
      }
      
      const errorText = await response.text()
      console.log(`API request failed (${response.status}): ${errorText}`)
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : RATE_LIMIT.retryDelay * attempt
        console.log(`Rate limited, waiting ${delay}ms before retry ${attempt}/${retries}`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Retry on server errors
      if (response.status >= 500) {
        console.log(`Server error ${response.status}, retrying attempt ${attempt}/${retries}`)
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay * attempt))
        continue
      }
      
      // Don't retry on client errors
      throw new Error(`API request failed: ${response.status} ${errorText}`)
      
    } catch (error) {
      console.log(`Request failed (attempt ${attempt}/${retries}): ${error.message}`)
      
      if (attempt === retries) {
        throw error
      }
      
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay * attempt))
    }
  }
  
  throw new Error('Maximum retries exceeded')
}

// Fetch campaign performance using the correct Amazon Ads API v2 endpoint
async function fetchCampaignPerformance(
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string,
  campaignIds: string[],
  startDate: string,
  endDate: string,
  attributionWindow: string,
  requestQueue: RequestQueue
): Promise<any[]> {
  
  console.log(`Fetching performance for ${campaignIds.length} campaigns, ${attributionWindow} attribution`)
  
  try {
    // Use Amazon Ads API v2 campaigns endpoint with performance metrics
    // This is the most reliable endpoint for getting campaign performance data
    const campaignFilter = campaignIds.length > 0 ? `campaignIdFilter=${campaignIds.join(',')}` : ''
    const metricsUrl = `${apiEndpoint}/v2/sp/campaigns/extended?${campaignFilter}`
    
    console.log(`Making request to: ${metricsUrl}`)
    
    const response = await requestQueue.add(() =>
      makeAmazonApiRequest(metricsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
      })
    )
    
    if (!response.ok) {
      console.error(`Performance API failed: ${response.status}`)
      return []
    }
    
    const performanceData = await response.json()
    console.log(`Retrieved ${Array.isArray(performanceData) ? performanceData.length : 0} performance records`)
    
    if (!Array.isArray(performanceData)) {
      console.warn('Performance API returned non-array data')
      return []
    }
    
    // Transform the extended campaign data to include performance metrics
    const results = performanceData.map(campaign => ({
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      impressions: campaign.impressions || 0,
      clicks: campaign.clicks || 0,
      cost: campaign.cost || 0,
      sales: campaign[`attributedSales${attributionWindow}`] || campaign.sales || 0,
      orders: campaign[`attributedUnitsOrdered${attributionWindow}`] || campaign.orders || 0,
      ctr: campaign.ctr || 0,
      cpc: campaign.cpc || 0,
      attributionWindow: attributionWindow,
      __source: 'extended_campaigns_api'
    }))
    
    console.log(`Processed ${results.length} campaign performance records`)
    return results
    
  } catch (error) {
    console.error('Error fetching campaign performance:', error)
    return []
  }
}

// Fetch ad groups for campaigns
async function fetchAdGroups(
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string,
  campaignIds: string[],
  requestQueue: RequestQueue
): Promise<any[]> {
  
  console.log(`Fetching ad groups for ${campaignIds.length} campaigns`)
  
  try {
    const adGroupsUrl = `${apiEndpoint}/v2/sp/adGroups/extended`
    
    const response = await requestQueue.add(() =>
      makeAmazonApiRequest(adGroupsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignIdFilter: campaignIds,
          includeExtendedDataFields: true
        })
      })
    )
    
    if (!response.ok) {
      console.error(`Ad groups API failed: ${response.status}`)
      return []
    }
    
    const adGroupsData = await response.json()
    console.log(`Retrieved ${Array.isArray(adGroupsData) ? adGroupsData.length : 0} ad groups`)
    
    return Array.isArray(adGroupsData) ? adGroupsData : []
    
  } catch (error) {
    console.error('Error fetching ad groups:', error)
    return []
  }
}

// Fetch keywords for ad groups
async function fetchKeywords(
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string,
  adGroupIds: string[],
  requestQueue: RequestQueue
): Promise<any[]> {
  
  console.log(`Fetching keywords for ${adGroupIds.length} ad groups`)
  
  try {
    const keywordsUrl = `${apiEndpoint}/v2/sp/keywords/extended`
    
    const response = await requestQueue.add(() =>
      makeAmazonApiRequest(keywordsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adGroupIdFilter: adGroupIds,
          includeExtendedDataFields: true
        })
      })
    )
    
    if (!response.ok) {
      console.error(`Keywords API failed: ${response.status}`)
      return []
    }
    
    const keywordsData = await response.json()
    console.log(`Retrieved ${Array.isArray(keywordsData) ? keywordsData.length : 0} keywords`)
    
    return Array.isArray(keywordsData) ? keywordsData : []
    
  } catch (error) {
    console.error('Error fetching keywords:', error)
    return []
  }
}

// Enhanced connection health check
async function checkConnectionHealth(
  supabase: any,
  connectionId: string,
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string
): Promise<{ healthy: boolean, issues: string[] }> {
  const issues: string[] = []
  
  try {
    // Test basic profile access
    const profileResponse = await fetch(`${apiEndpoint}/v2/profiles`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
      },
    })
    
    if (!profileResponse.ok) {
      issues.push(`Profile API access failed: ${profileResponse.status}`)
    }
    
  } catch (error) {
    issues.push(`Connection test failed: ${error.message}`)
  }
  
  // Update connection health status
  await supabase
    .from('amazon_connections')
    .update({
      last_health_check: new Date().toISOString(),
      health_status: issues.length === 0 ? 'healthy' : 'degraded',
      health_issues: issues.length > 0 ? issues : null
    })
    .eq('id', connectionId)
  
  return { healthy: issues.length === 0, issues }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now()
  let performanceLog: any = {
    operation: 'sync-amazon-data',
    startTime,
    phases: {}
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

    const { connectionId, dateRange, attributionWindows } = await req.json()
    console.log('Starting enhanced data sync for connection:', connectionId)
    
    performanceLog.connectionId = connectionId
    performanceLog.phases.auth = Date.now() - startTime

    // Get connection details
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
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      throw new Error('Amazon API credentials not configured')
    }

    // Token refresh logic
    const now = new Date()
    const expiresAt = new Date(connection.token_expires_at)
    let accessToken = connection.access_token
    
    const bufferTime = 5 * 60 * 1000 // 5 minutes
    if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
      console.log('Token expired or expiring soon, attempting refresh...')
      
      try {
        const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: connection.refresh_token,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        })

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json()
          const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
          
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

    performanceLog.phases.tokenRefresh = Date.now() - startTime

    // Initialize request queue
    const requestQueue = new RequestQueue()

    // Use correct API endpoint
    const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api-eu.amazon.com'
    console.log('Using API endpoint:', apiEndpoint)

    // Connection health check
    const healthCheck = await checkConnectionHealth(
      supabase, connectionId, apiEndpoint, accessToken, clientId, connection.profile_id
    )
    
    if (!healthCheck.healthy) {
      console.warn('Connection health issues detected:', healthCheck.issues)
    }

    performanceLog.phases.healthCheck = Date.now() - startTime

    // Fetch campaigns with detailed logging
    console.log('Fetching campaigns with enhanced error handling...')
    console.log('API request details:', {
      endpoint: `${apiEndpoint}/v2/campaigns`,
      profileId: connection.profile_id,
      clientId: clientId ? 'present' : 'missing',
      accessToken: accessToken ? `present (${accessToken.substring(0, 10)}...)` : 'missing'
    })
    
    const campaignsResponse = await requestQueue.add(() => 
      makeAmazonApiRequest(`${apiEndpoint}/v2/campaigns`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
        },
      })
    )

    console.log('Campaigns response status:', campaignsResponse.status)
    console.log('Campaigns response headers:', Object.fromEntries(campaignsResponse.headers.entries()))
    
    let campaignsData
    const responseText = await campaignsResponse.text()
    console.log('Raw campaigns response:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''))
    
    try {
      campaignsData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse campaigns response as JSON:', parseError)
      throw new Error(`Invalid JSON response: ${responseText}`)
    }
    
    console.log('Parsed campaigns data type:', typeof campaignsData)
    console.log('Is campaigns data array?', Array.isArray(campaignsData))
    console.log('Retrieved campaigns count:', Array.isArray(campaignsData) ? campaignsData.length : 'N/A')
    
    if (!Array.isArray(campaignsData)) {
      console.log('Full campaigns response object:', JSON.stringify(campaignsData, null, 2))
      if (campaignsData?.error) {
        console.error('API returned error:', campaignsData.error)
        throw new Error(`Amazon API error: ${JSON.stringify(campaignsData.error)}`)
      }
      // Handle wrapped response
      if (campaignsData?.campaigns && Array.isArray(campaignsData.campaigns)) {
        campaignsData = campaignsData.campaigns
        console.log('Found campaigns in nested object, count:', campaignsData.length)
      } else {
        console.warn('Unexpected response structure, treating as empty array')
        campaignsData = []
      }
    }

    performanceLog.phases.campaignsFetch = Date.now() - startTime

    // Enhanced date range handling
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date()
    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : new Date()
    if (!dateRange?.startDate) {
      startDate.setDate(startDate.getDate() - 30)
    }
    
    const reportStartDate = startDate.toISOString().split('T')[0]
    const reportEndDate = endDate.toISOString().split('T')[0]
    
    // Enhanced attribution windows
    const supportedWindows = connection.supported_attribution_models || ['7d', '14d']
    const requestedWindows = attributionWindows || ['7d', '14d']
    const windows = requestedWindows.filter(w => supportedWindows.includes(w))
    
    if (windows.length === 0) {
      console.warn('No supported attribution windows found, using defaults')
      windows.push('14d')
    }
    
    console.log('Using attribution windows:', windows)
    console.log('Date range:', reportStartDate, 'to', reportEndDate)

    // Store campaigns with enhanced error handling
    const campaignIds: string[] = []
    
    for (const campaign of campaignsData) {
      if (!campaign.campaignId || !campaign.name) {
        console.warn('Skipping invalid campaign:', campaign)
        continue
      }

      campaignIds.push(campaign.campaignId.toString())
      
      try {
        const { error: campaignError } = await supabase
          .from('campaigns')
          .upsert({
            connection_id: connectionId,
            amazon_campaign_id: campaign.campaignId.toString(),
            name: campaign.name,
            campaign_type: campaign.campaignType || 'sponsoredProducts',
            targeting_type: campaign.targetingType || 'auto',
            product_type: 'Sponsored Products',
            status: campaign.state ? campaign.state.toLowerCase() : 'enabled',
            daily_budget: campaign.dailyBudget || null,
            start_date: campaign.startDate || null,
            end_date: campaign.endDate || null,
          }, {
            onConflict: 'connection_id, amazon_campaign_id'
          })

        if (campaignError) {
          console.error('Error storing campaign:', campaign.campaignId, campaignError)
        }
      } catch (error) {
        console.error('Critical error storing campaign:', campaign.campaignId, error)
      }
    }

    performanceLog.phases.campaignsStore = Date.now() - startTime

    // Enhanced performance data fetching with correct API calls
    let totalMetricsUpdated = 0
    
    if (campaignIds.length > 0) {
      console.log('Fetching enhanced performance data with validation...')
      
      for (const window of windows) {
        console.log(`Processing ${window} attribution`)
        
        try {
          const performanceData = await fetchCampaignPerformance(
            apiEndpoint,
            accessToken,
            clientId,
            connection.profile_id,
            campaignIds,
            reportStartDate,
            reportEndDate,
            window,
            requestQueue
          )
          
          console.log(`Retrieved ${performanceData.length} performance records for ${window}`)
          
          // Update campaigns with performance data
          for (const perfData of performanceData) {
            if (!perfData.campaignId) {
              console.warn('Skipping performance data without campaignId:', perfData)
              continue
            }
            
            // Enhanced metrics calculation with proper data types
            const impressions = Math.max(0, parseInt(perfData.impressions || '0') || 0)
            const clicks = Math.max(0, parseInt(perfData.clicks || '0') || 0)
            const spend = Math.max(0, parseFloat(perfData.cost || '0') || 0)
            const sales = Math.max(0, parseFloat(perfData.sales || '0') || 0)
            const orders = Math.max(0, parseInt(perfData.orders || '0') || 0)
            
            // Calculate derived metrics
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
            const cpc = clicks > 0 ? spend / clicks : 0
            const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0
            const acos = sales > 0 ? (spend / sales) * 100 : null
            const roas = spend > 0 ? sales / spend : null
            
            console.log(`Updating campaign ${perfData.campaignId}: spend=${spend}, sales=${sales}, impressions=${impressions}, clicks=${clicks}`)

            // Dynamic update object based on attribution window
            const updateData: any = {
              last_updated: new Date().toISOString(),
              [`impressions_${window}`]: impressions,
              [`clicks_${window}`]: clicks,
              [`spend_${window}`]: spend,
              [`sales_${window}`]: sales,
              [`orders_${window}`]: orders,
              [`ctr_${window}`]: ctr,
              [`cpc_${window}`]: cpc,
              [`conversion_rate_${window}`]: conversionRate,
              [`acos_${window}`]: acos,
              [`roas_${window}`]: roas,
            }

            // Also update the default columns for the primary attribution window
            if (window === '14d') {
              updateData.impressions = impressions
              updateData.clicks = clicks
              updateData.spend = spend
              updateData.sales = sales
              updateData.orders = orders
              updateData.acos = acos
              updateData.roas = roas
            }

            const { error: updateError } = await supabase
              .from('campaigns')
              .update(updateData)
              .eq('connection_id', connectionId)
              .eq('amazon_campaign_id', perfData.campaignId.toString())

            if (updateError) {
              console.error('Error updating campaign metrics:', perfData.campaignId, updateError)
            } else {
              totalMetricsUpdated++
            }
          }
        } catch (error) {
          console.error(`Error processing ${window} attribution:`, error)
        }
      }
    }

    performanceLog.phases.performanceData = Date.now() - startTime

    // Sync ad groups and keywords
    console.log('Syncing ad groups and keywords...')
    
    try {
      const adGroupsData = await fetchAdGroups(
        apiEndpoint, accessToken, clientId, connection.profile_id, campaignIds, requestQueue
      )
      
      const adGroupIds: string[] = []
      
      for (const adGroup of adGroupsData) {
        if (!adGroup.adGroupId || !adGroup.name) continue
        
        adGroupIds.push(adGroup.adGroupId.toString())
        
        await supabase
          .from('ad_groups')
          .upsert({
            campaign_id: (await supabase
              .from('campaigns')
              .select('id')
              .eq('connection_id', connectionId)
              .eq('amazon_campaign_id', adGroup.campaignId.toString())
              .single()).data?.id,
            amazon_adgroup_id: adGroup.adGroupId.toString(),
            name: adGroup.name,
            status: adGroup.state?.toLowerCase() || 'enabled',
            default_bid: adGroup.defaultBid,
          }, {
            onConflict: 'campaign_id, amazon_adgroup_id'
          })
      }
      
      if (adGroupIds.length > 0) {
        const keywordsData = await fetchKeywords(
          apiEndpoint, accessToken, clientId, connection.profile_id, adGroupIds, requestQueue
        )
        
        for (const keyword of keywordsData) {
          if (!keyword.keywordId || !keyword.keywordText) continue
          
          await supabase
            .from('keywords')
            .upsert({
              adgroup_id: (await supabase
                .from('ad_groups')
                .select('id')
                .eq('amazon_adgroup_id', keyword.adGroupId.toString())
                .single()).data?.id,
              amazon_keyword_id: keyword.keywordId.toString(),
              keyword_text: keyword.keywordText,
              match_type: keyword.matchType?.toLowerCase() || 'broad',
              bid: keyword.bid,
              status: keyword.state?.toLowerCase() || 'enabled',
            }, {
              onConflict: 'adgroup_id, amazon_keyword_id'
            })
        }
      }
    } catch (error) {
      console.error('Error syncing ad groups and keywords:', error)
    }

    performanceLog.phases.adGroupsKeywords = Date.now() - startTime

    // Update connection metadata
    await supabase
      .from('amazon_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        campaign_count: campaignIds.length
      })
      .eq('id', connectionId)

    // Log performance metrics
    performanceLog.totalTime = Date.now() - startTime
    
    await supabase
      .from('sync_performance_logs')
      .insert({
        connection_id: connectionId,
        operation_type: 'enhanced_sync',
        start_time: new Date(startTime).toISOString(),
        end_time: new Date().toISOString(),
        total_duration_ms: performanceLog.totalTime,
        campaigns_processed: campaignIds.length,
        success: true,
        phases: performanceLog.phases,
        performance_metrics: {
          campaignsProcessed: campaignIds.length,
          metricsUpdated: totalMetricsUpdated,
          attributionWindows: windows,
          apiEndpoint: apiEndpoint
        }
      })

    console.log('Enhanced sync completed successfully:', performanceLog)

    return new Response(
      JSON.stringify({
        success: true,
        campaignsProcessed: campaignIds.length,
        metricsUpdated: totalMetricsUpdated,
        attributionWindows: windows,
        performanceData: performanceLog
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Sync failed:', error)
    
    const errorLog = {
      ...performanceLog,
      error: error.message,
      totalTime: Date.now() - startTime
    }

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase
        .from('sync_performance_logs')
        .insert({
          connection_id: performanceLog.connectionId || null,
          operation_type: 'enhanced_sync',
          start_time: new Date(startTime).toISOString(),
          end_time: new Date().toISOString(),
          total_duration_ms: errorLog.totalTime,
          success: false,
          error_message: error.message,
          phases: performanceLog.phases
        })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: errorLog
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})