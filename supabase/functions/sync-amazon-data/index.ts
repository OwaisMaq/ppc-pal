import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerSecond: 10,
  burstSize: 20,
  retryDelay: 1000
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

// Enhanced error handling with retry logic
async function makeAmazonApiRequest(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        return response
      }
      
      // Handle specific error codes
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : RATE_LIMIT.retryDelay * attempt
        console.log(`Rate limited, waiting ${delay}ms before retry ${attempt}/${retries}`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      if (response.status >= 500) {
        console.log(`Server error ${response.status}, retrying attempt ${attempt}/${retries}`)
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay * attempt))
        continue
      }
      
      // For client errors (4xx), don't retry
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${errorText}`)
      
    } catch (error) {
      lastError = error as Error
      
      if (attempt === retries) {
        throw lastError
      }
      
      console.log(`Request failed (attempt ${attempt}/${retries}):`, error.message)
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay * attempt))
    }
  }
  
  throw lastError!
}

// Enhanced reporting API with proper v3 workflow and v2 fallback
async function fetchPerformanceData(
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string,
  campaignIds: string[],
  reportStartDate: string,
  reportEndDate: string,
  attributionWindow: string,
  requestQueue: RequestQueue
): Promise<any[]> {
  
  console.log(`Fetching performance data for ${attributionWindow} attribution, campaigns: ${campaignIds.length}`)
  
  // Try v3 API first with corrected column names
  try {
    console.log('Attempting v3 reporting API with corrected column mapping')
    
    // Step 1: Submit report request (v3 API with correct column names)
    const reportPayload = {
      startDate: reportStartDate,
      endDate: reportEndDate,
      configuration: {
        adProduct: 'SPONSORED_PRODUCTS',
        groupBy: ['campaign'],
        columns: [
          'campaignId',
          'campaignName', 
          'impressions',
          'clicks',
          'cost',
          `sales${attributionWindow}`,  // Corrected: sales7d instead of attributedSales7d
          `orders${attributionWindow}`, // Corrected: orders7d instead of attributedUnitsOrdered7d
          'ctr',  // Corrected: ctr instead of clickThroughRate
          'cpc'   // Corrected: cpc instead of costPerClick
        ],
        reportTypeId: 'spCampaigns',
        timeUnit: 'SUMMARY',
        format: 'GZIP_JSON'
      },
      campaignIdFilter: campaignIds
    }
    
    console.log('Submitting v3 report request:', JSON.stringify(reportPayload, null, 2))
    
    const submitResponse = await requestQueue.add(() =>
      makeAmazonApiRequest(`${apiEndpoint}/reporting/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportPayload)
      })
    )
    
    if (submitResponse.ok) {
      const submitData = await submitResponse.json()
      console.log('v3 report submitted successfully:', submitData)
      
      if (submitData.reportId) {
        // Step 2: Poll for report status
        const reportId = submitData.reportId
        let statusResponse
        let attempts = 0
        const maxAttempts = 30 // 5 minutes with 10-second intervals
        
        do {
          await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
          attempts++
          
          console.log(`Polling report status (attempt ${attempts}/${maxAttempts})...`)
          
          statusResponse = await requestQueue.add(() =>
            makeAmazonApiRequest(`${apiEndpoint}/reporting/reports/${reportId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': profileId,
              },
            })
          )
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            console.log('Report status:', statusData.status)
            
            if (statusData.status === 'COMPLETED' && statusData.url) {
              // Step 3: Download report data
              console.log('Report completed, downloading data...')
              
              const downloadResponse = await fetch(statusData.url)
              if (downloadResponse.ok) {
                const reportData = await downloadResponse.json()
                console.log(`v3 API successful, returned ${reportData.length || 0} records`)
                // Mark data with API version for tracking
                return (reportData || []).map((item: any) => ({ ...item, __apiVersion: 'v3' }))
            } else if (statusData.status === 'FAILED') {
              console.error('v3 report generation failed:', statusData)
              break
            }
          }
          
        } while (attempts < maxAttempts && (!statusResponse.ok || 
                 !['COMPLETED', 'FAILED'].includes((await statusResponse.json()).status)))
        
        if (attempts >= maxAttempts) {
          console.warn('v3 report polling timeout, falling back to v2')
        }
      }
    }
    
  } catch (v3Error) {
    console.error('v3 API failed:', v3Error.message)
  }
  
  // Fallback to v2 API with corrected endpoint
  try {
    console.log('Falling back to v2 reporting API with corrected endpoint')
    
    // Try direct metrics endpoint first for immediate data
    const metricsResponse = await requestQueue.add(() =>
      makeAmazonApiRequest(`${apiEndpoint}/v2/campaigns?stateFilter=enabled,paused,archived`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
        },
      })
    )
    
    if (metricsResponse.ok) {
      const metricsData = await metricsResponse.json()
      console.log(`v2 metrics API successful, returned ${metricsData.length || 0} campaign records`)
      
      // Process the campaign data to extract available metrics
      const processedData = metricsData.map((campaign: any) => ({
        campaignId: campaign.campaignId,
        campaignName: campaign.name,
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        cost: campaign.cost || campaign.spend || 0,
        [`sales${attributionWindow}`]: campaign[`attributedSales${attributionWindow}`] || campaign.sales || 0,
        [`orders${attributionWindow}`]: campaign[`attributedUnitsOrdered${attributionWindow}`] || campaign.orders || 0,
        ctr: campaign.ctr || 0,
        cpc: campaign.cpc || 0
      }))
      
      return processedData
    }
    
    // Fallback to report generation if direct metrics fail
    const v2Payload = {
      reportDate: reportEndDate,
      metrics: `impressions,clicks,cost,attributedSales${attributionWindow},attributedUnitsOrdered${attributionWindow}`,
      campaignType: 'sponsoredProducts'
    }
    
    console.log('Trying v2 report generation:', JSON.stringify(v2Payload, null, 2))
    
    const v2Response = await requestQueue.add(() =>
      makeAmazonApiRequest(`${apiEndpoint}/v2/sp/campaigns/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(v2Payload)
      })
    )
    
    if (v2Response.ok) {
      const v2Data = await v2Response.json()
      
      if (v2Data.reportId) {
        // Poll v2 report status
        let statusAttempts = 0
        const maxStatusAttempts = 20
        
        while (statusAttempts < maxStatusAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000))
          statusAttempts++
          
          const statusResponse = await requestQueue.add(() =>
            makeAmazonApiRequest(`${apiEndpoint}/v2/reports/${v2Data.reportId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': profileId,
              },
            })
          )
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            console.log('v2 report status:', statusData.status)
            
            if (statusData.status === 'SUCCESS' && statusData.location) {
              const downloadResponse = await fetch(statusData.location)
              if (downloadResponse.ok) {
                const reportData = await downloadResponse.json()
                console.log(`v2 API successful, returned ${reportData.length || 0} records`)
                return reportData || []
              }
            } else if (statusData.status === 'FAILURE') {
              console.error('v2 report generation failed')
              break
            }
          }
        }
      } else if (Array.isArray(v2Data)) {
        // Direct data return (some v2 endpoints return data immediately)
        console.log(`v2 API returned immediate data: ${v2Data.length} records`)
        return v2Data
      }
    }
    
  } catch (v2Error) {
    console.error('v2 API also failed:', v2Error.message)
    throw new Error(`Both v3 and v2 APIs failed. v2: ${v2Error.message}`)
  }
  
  console.warn('No performance data retrieved from either API version')
  return []
}

// Enhanced connection health monitoring
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
    // Test basic API connectivity
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
    
    // Test campaigns API
    const campaignsResponse = await fetch(`${apiEndpoint}/v2/campaigns?count=1`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
      },
    })
    
    if (!campaignsResponse.ok) {
      issues.push(`Campaigns API access failed: ${campaignsResponse.status}`)
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

    const { connectionId, dateRange, attributionWindows, campaignTypes } = await req.json()
    console.log('Starting enhanced data sync for connection:', connectionId)
    
    performanceLog.connectionId = connectionId
    performanceLog.phases.auth = Date.now() - startTime

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
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      throw new Error('Amazon API credentials not configured')
    }

    // Enhanced token refresh logic
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

    // Initialize request queue for rate limiting
    const requestQueue = new RequestQueue()

    // Use region-specific API endpoint
    const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api.amazon.com'
    console.log('Using API endpoint:', apiEndpoint)

    // Perform connection health check
    const healthCheck = await checkConnectionHealth(
      supabase, connectionId, apiEndpoint, accessToken, clientId, connection.profile_id
    )
    
    if (!healthCheck.healthy) {
      console.warn('Connection health issues detected:', healthCheck.issues)
    }

    performanceLog.phases.healthCheck = Date.now() - startTime

    // Enhanced campaigns fetch with comprehensive debugging
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
      // If response is not an array, maybe it's wrapped in an object
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
    
    // Enhanced attribution windows with validation
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
    const campaignBatches: string[][] = []
    
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

    // Create optimized batches for performance requests
    const batchSize = 50 // Reduced batch size for better reliability
    for (let i = 0; i < campaignIds.length; i += batchSize) {
      campaignBatches.push(campaignIds.slice(i, i + batchSize))
    }

    performanceLog.phases.campaignsStore = Date.now() - startTime

    // Enhanced performance data fetching with validation and monitoring
    let totalMetricsUpdated = 0
    let campaignsWithZeroData = 0
    let apiVersionsUsed = new Set<string>()
    
    if (campaignIds.length > 0) {
      console.log('Fetching enhanced performance data with validation...')
      
      const performancePromises: Promise<void>[] = []
      
      for (const window of windows) {
        for (let batchIndex = 0; batchIndex < campaignBatches.length; batchIndex++) {
          const batch = campaignBatches[batchIndex]
          
          performancePromises.push(
            (async () => {
              try {
                console.log(`Processing batch ${batchIndex + 1}/${campaignBatches.length} for ${window} attribution`)
                
                const performanceData = await fetchPerformanceData(
                  apiEndpoint,
                  accessToken,
                  clientId,
                  connection.profile_id,
                  batch,
                  reportStartDate,
                  reportEndDate,
                  window,
                  requestQueue
                )
                
                // Track API version used for this batch
                if (performanceData.length > 0) {
                  apiVersionsUsed.add(performanceData[0].__apiVersion || 'unknown')
                }
                
                // Update campaigns with performance data
                for (const perfData of performanceData) {
                  if (!perfData.campaignId) {
                    console.warn('Skipping performance data without campaignId:', perfData)
                    continue
                  }
                  
                  console.log(`Processing performance data for campaign ${perfData.campaignId}:`, perfData)
                  
                  // Updated to use correct column names for both v3 and v2 APIs
                  const salesKeyV3 = `sales${window}`  // v3 API format: sales7d, sales14d
                  const ordersKeyV3 = `orders${window}` // v3 API format: orders7d, orders14d
                  const salesKeyV2 = `attributedSales${window}` // v2 API format: attributedSales7d, attributedSales14d
                  const ordersKeyV2 = `attributedUnitsOrdered${window}` // v2 API format: attributedUnitsOrdered7d, attributedUnitsOrdered14d
                  
                  // Enhanced metrics calculation with validation and multiple fallbacks
                  const impressions = Math.max(0, parseInt(perfData.impressions || '0') || 0)
                  const clicks = Math.max(0, parseInt(perfData.clicks || '0') || 0)
                  const spend = Math.max(0, parseFloat(perfData.cost || perfData.spend || '0') || 0)
                  
                  // Try multiple column name formats for sales and orders
                  const sales = Math.max(0, parseFloat(
                    perfData[salesKeyV3] || 
                    perfData[salesKeyV2] || 
                    perfData.sales || 
                    perfData.attributedSales || 
                    '0'
                  ) || 0)
                  
                  const orders = Math.max(0, parseInt(
                    perfData[ordersKeyV3] || 
                    perfData[ordersKeyV2] || 
                    perfData.orders || 
                    perfData.attributedUnitsOrdered || 
                    '0'
                  ) || 0)
                  
                  // Handle CTR - v3 returns decimal, v2 returns percentage
                  let ctr = 0
                  if (perfData.ctr !== undefined) {
                    ctr = Math.max(0, parseFloat(perfData.ctr) || 0)
                    // If it's already a decimal (v3), leave as is; if percentage (v2), convert
                    if (ctr > 1) ctr = ctr / 100
                  } else if (perfData.clickThroughRate !== undefined) {
                    ctr = Math.max(0, parseFloat(perfData.clickThroughRate) / 100 || 0)
                  }
                  
                  // Handle CPC
                  const cpc = Math.max(0, parseFloat(perfData.cpc || perfData.costPerClick || '0') || 0)
                  const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0
                  const acos = sales > 0 ? (spend / sales) * 100 : null
                  const roas = spend > 0 ? sales / spend : null
                  
                  console.log(`Calculated metrics for campaign ${perfData.campaignId}: spend=${spend}, sales=${sales}, impressions=${impressions}, clicks=${clicks}`)

                  // Track zero data campaigns for monitoring
                  if (spend === 0 && sales === 0 && impressions === 0 && clicks === 0) {
                    campaignsWithZeroData++
                  } else {
                    totalMetricsUpdated++
                  }

                  // Dynamic update object based on attribution window
                  const updateData: any = {
                    last_updated: new Date().toISOString(),
                    [`impressions_${window}`]: impressions,
                    [`clicks_${window}`]: clicks,
                    [`spend_${window}`]: spend,
                    [`sales_${window}`]: sales,
                    [`orders_${window}`]: orders,
                    [`acos_${window}`]: acos,
                    [`roas_${window}`]: roas,
                    [`ctr_${window}`]: ctr,
                    [`cpc_${window}`]: cpc,
                    [`conversion_rate_${window}`]: conversionRate
                  }

                  // Set primary metrics to 14d by default
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
                    console.error('Error updating campaign performance:', perfData.campaignId, updateError)
                  }

                  // Store historical performance data
                  const { data: campaignRecord } = await supabase
                    .from('campaigns')
                    .select('id')
                    .eq('connection_id', connectionId)
                    .eq('amazon_campaign_id', perfData.campaignId.toString())
                    .single()

                  if (campaignRecord) {
                    await supabase
                      .from('campaign_performance_history')
                      .upsert({
                        campaign_id: campaignRecord.id,
                        date: reportEndDate,
                        attribution_window: window,
                        impressions,
                        clicks,
                        spend,
                        sales,
                        orders,
                        acos,
                        roas,
                        ctr,
                        cpc,
                        conversion_rate: conversionRate
                      }, {
                        onConflict: 'campaign_id, date, attribution_window'
                      })
                  }
                }
                
              } catch (batchError) {
                console.error(`Error processing batch ${batchIndex + 1} for ${window}:`, batchError)
              }
            })()
          )
        }
      }
      
      // Wait for all performance data fetching to complete
      await Promise.allSettled(performancePromises)
    }

    performanceLog.phases.performanceData = Date.now() - startTime

    // Enhanced ad groups and keywords sync with parallel processing
    console.log('Syncing ad groups and keywords...')
    
    const { data: storedCampaigns } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id')
      .eq('connection_id', connectionId)

    const adGroupPromises: Promise<void>[] = []
    
    for (const campaign of storedCampaigns || []) {
      adGroupPromises.push(
        (async () => {
          try {
            const adGroupsResponse = await requestQueue.add(() =>
              makeAmazonApiRequest(`${apiEndpoint}/v2/adGroups?campaignIdFilter=${campaign.amazon_campaign_id}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Amazon-Advertising-API-ClientId': clientId,
                  'Amazon-Advertising-API-Scope': connection.profile_id,
                },
              })
            )

            if (adGroupsResponse.ok) {
              const adGroupsData = await adGroupsResponse.json()
              
              for (const adGroup of adGroupsData) {
                const { data: storedAdGroup } = await supabase
                  .from('ad_groups')
                  .upsert({
                    campaign_id: campaign.id,
                    amazon_adgroup_id: adGroup.adGroupId.toString(),
                    name: adGroup.name,
                    status: adGroup.state?.toLowerCase() || 'enabled',
                    default_bid: adGroup.defaultBid || null,
                  }, {
                    onConflict: 'campaign_id, amazon_adgroup_id'
                  })
                  .select('id')
                  .single()

                if (storedAdGroup) {
                  // Fetch keywords for this ad group
                  try {
                    const keywordsResponse = await requestQueue.add(() =>
                      makeAmazonApiRequest(`${apiEndpoint}/v2/keywords?adGroupIdFilter=${adGroup.adGroupId}`, {
                        headers: {
                          'Authorization': `Bearer ${accessToken}`,
                          'Amazon-Advertising-API-ClientId': clientId,
                          'Amazon-Advertising-API-Scope': connection.profile_id,
                        },
                      })
                    )

                    if (keywordsResponse.ok) {
                      const keywordsData = await keywordsResponse.json()
                      
                      for (const keyword of keywordsData) {
                        if (!keyword.keywordId || !keyword.keywordText) {
                          continue
                        }

                        await supabase
                          .from('keywords')
                          .upsert({
                            adgroup_id: storedAdGroup.id,
                            amazon_keyword_id: keyword.keywordId.toString(),
                            keyword_text: keyword.keywordText,
                            match_type: keyword.matchType || 'exact',
                            bid: keyword.bid || null,
                            status: keyword.state?.toLowerCase() || 'enabled',
                          }, {
                            onConflict: 'adgroup_id, amazon_keyword_id'
                          })
                      }
                    }
                  } catch (keywordError) {
                    console.error(`Keywords sync failed for ad group ${adGroup.adGroupId}:`, keywordError)
                  }
                }
              }
            }
          } catch (adGroupError) {
            console.error(`Ad groups sync failed for campaign ${campaign.amazon_campaign_id}:`, adGroupError)
          }
        })()
      )
    }
    
    // Wait for ad groups and keywords sync to complete
    await Promise.allSettled(adGroupPromises)

    performanceLog.phases.adGroupsKeywords = Date.now() - startTime

    // Update connection with enhanced metadata
    await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        campaign_count: campaignIds.length,
        reporting_api_version: 'v3_with_v2_fallback'
      })
      .eq('id', connectionId)

    performanceLog.totalTime = Date.now() - startTime
    console.log('Enhanced sync completed successfully:', performanceLog)

    // Log performance metrics to database
    try {
      await supabase
        .from('sync_performance_logs')
        .insert({
          connection_id: connectionId,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date().toISOString(),
          total_duration_ms: performanceLog.totalTime,
          phases: performanceLog.phases,
          campaigns_processed: campaignIds.length,
          operation_type: 'enhanced_sync',
          success: true,
          performance_metrics: {
            attributionWindows: windows,
            healthStatus: healthCheck.healthy ? 'healthy' : 'degraded',
            apiVersionUsed: Array.from(apiVersionsUsed).join(', ') || 'v3_with_v2_fallback',
            totalMetricsUpdated,
            campaignsWithZeroData,
            dataQualityScore: totalMetricsUpdated > 0 ? (totalMetricsUpdated / (totalMetricsUpdated + campaignsWithZeroData)) * 100 : 0
          }
        })
    } catch (logError) {
      console.error('Failed to log performance metrics:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enhanced data sync completed',
        performance: performanceLog,
        stats: {
          campaignsProcessed: campaignIds.length,
          attributionWindows: windows,
          healthStatus: healthCheck.healthy ? 'healthy' : 'degraded'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enhanced sync error:', error)
    
    performanceLog.error = error.message
    performanceLog.totalTime = Date.now() - startTime
    
    // Log failed sync to database
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase
        .from('sync_performance_logs')
        .insert({
          connection_id: performanceLog.connectionId || null,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date().toISOString(),
          total_duration_ms: performanceLog.totalTime,
          phases: performanceLog.phases,
          campaigns_processed: 0,
          operation_type: 'enhanced_sync',
          success: false,
          error_message: error.message,
          performance_metrics: { error: error.message }
        })
    } catch (logError) {
      console.error('Failed to log error metrics:', logError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        performance: performanceLog
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})