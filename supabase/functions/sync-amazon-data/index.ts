import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerSecond: 5, // Conservative rate limiting
  burstSize: 10,
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

// Create and poll an Amazon Ads report for campaign performance
async function fetchCampaignPerformanceReport(
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string,
  startDate: string,
  endDate: string,
  requestQueue: RequestQueue
): Promise<any[]> {
  
  console.log(`Creating performance report for date range: ${startDate} to ${endDate}`)
  
  try {
    // Step 1: Create the report
    const reportRequest = {
      reportDate: endDate,
      campaignType: "sponsoredProducts",
      segment: "campaign",
      metrics: [
        "campaignName",
        "campaignId",
        "impressions", 
        "clicks",
        "cost",
        "attributedSales14d",
        "attributedUnitsOrdered14d",
        "attributedSales7d",
        "attributedUnitsOrdered7d"
      ]
    }

    console.log('Creating report with request:', JSON.stringify(reportRequest, null, 2))

    const createReportResponse = await requestQueue.add(() =>
      makeAmazonApiRequest(`${apiEndpoint}/reporting/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportRequest)
      })
    )

    if (!createReportResponse.ok) {
      console.error(`Report creation failed: ${createReportResponse.status}`)
      return []
    }

    const reportCreationResult = await createReportResponse.json()
    console.log('Report creation result:', reportCreationResult)

    if (!reportCreationResult.reportId) {
      console.error('No reportId returned from report creation')
      return []
    }

    const reportId = reportCreationResult.reportId

    // Step 2: Poll for report completion
    let reportReady = false
    let pollAttempts = 0
    const maxPollAttempts = 30 // 5 minutes at 10-second intervals
    
    console.log(`Polling for report ${reportId} completion...`)

    while (!reportReady && pollAttempts < maxPollAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      pollAttempts++

      const statusResponse = await requestQueue.add(() =>
        makeAmazonApiRequest(`${apiEndpoint}/reporting/reports/${reportId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': profileId,
          },
        })
      )

      if (!statusResponse.ok) {
        console.error(`Report status check failed: ${statusResponse.status}`)
        continue
      }

      const statusResult = await statusResponse.json()
      console.log(`Report ${reportId} status (attempt ${pollAttempts}):`, statusResult.status)

      if (statusResult.status === 'SUCCESS') {
        reportReady = true
        
        // Step 3: Download the report data
        if (statusResult.location) {
          console.log(`Downloading report data from: ${statusResult.location}`)
          
          const downloadResponse = await requestQueue.add(() =>
            makeAmazonApiRequest(statusResult.location, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': profileId,
              },
            })
          )

          if (downloadResponse.ok) {
            const reportData = await downloadResponse.json()
            console.log(`Downloaded report with ${Array.isArray(reportData) ? reportData.length : 0} records`)
            return Array.isArray(reportData) ? reportData : []
          } else {
            console.error('Failed to download report data')
          }
        }
      } else if (statusResult.status === 'FAILURE') {
        console.error('Report generation failed:', statusResult)
        break
      }
    }

    if (!reportReady) {
      console.warn(`Report ${reportId} did not complete within ${maxPollAttempts} attempts`)
    }

    return []
    
  } catch (error) {
    console.error('Error creating/downloading performance report:', error)
    return []
  }
}

// Fetch campaigns using the v3 campaigns endpoint with fallback to v2
async function fetchCampaigns(
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string,
  requestQueue: RequestQueue
): Promise<any[]> {
  
  console.log('Fetching campaigns from v3 endpoint with v2 fallback')
  
  // Try v3 first
  try {
    const v3Response = await requestQueue.add(() =>
      makeAmazonApiRequest(`${apiEndpoint}/sp/campaigns`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
      })
    )

    if (v3Response.ok) {
      const campaignsData = await v3Response.json()
      console.log(`Retrieved ${Array.isArray(campaignsData) ? campaignsData.length : 0} campaigns from v3 API`)
      return Array.isArray(campaignsData) ? campaignsData : []
    }
  } catch (v3Error) {
    console.log('v3 API failed, falling back to v2:', v3Error.message)
  }

  // Fallback to v2
  try {
    console.log('Using v2 fallback endpoint')
    const response = await requestQueue.add(() =>
      makeAmazonApiRequest(`${apiEndpoint}/v2/sp/campaigns`, {
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
      console.error(`Campaigns API failed: ${response.status}`)
      return []
    }

    const campaignsData = await response.json()
    console.log(`Retrieved ${Array.isArray(campaignsData) ? campaignsData.length : 0} campaigns`)

    return Array.isArray(campaignsData) ? campaignsData : []
    
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return []
  }
}

// Enhanced connection health check with v3 and v2 compatibility
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
    // Test v3 profile access first
    let profileResponse
    try {
      profileResponse = await fetch(`${apiEndpoint}/profiles`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
        },
      })
      
      if (profileResponse.ok) {
        console.log('v3 profiles API is working')
      } else if (profileResponse.status === 404) {
        // Try v2 fallback
        profileResponse = await fetch(`${apiEndpoint}/v2/profiles`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': profileId,
          },
        })
        
        if (profileResponse.ok) {
          console.log('v2 profiles API is working')
        } else {
          issues.push(`Both v3 and v2 Profile API access failed: ${profileResponse.status}`)
        }
      } else {
        issues.push(`Profile API access failed: ${profileResponse.status}`)
      }
    } catch (profileError) {
      issues.push(`Profile API test failed: ${profileError.message}`)
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
    console.log('Starting Amazon data sync for connection:', connectionId)
    
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

    // Fetch campaigns
    console.log('Fetching campaigns...')
    const campaignsData = await fetchCampaigns(
      apiEndpoint, accessToken, clientId, connection.profile_id, requestQueue
    )

    console.log(`Retrieved ${campaignsData.length} campaigns`)

    performanceLog.phases.campaignsFetch = Date.now() - startTime

    // Enhanced date range handling
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date()
    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : new Date()
    if (!dateRange?.startDate) {
      startDate.setDate(startDate.getDate() - 7) // Last 7 days by default
    }
    
    const reportStartDate = startDate.toISOString().split('T')[0]
    const reportEndDate = endDate.toISOString().split('T')[0]
    
    console.log('Date range:', reportStartDate, 'to', reportEndDate)

    // Store campaigns
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

    // Fetch performance data using proper reporting API
    let totalMetricsUpdated = 0
    
    if (campaignIds.length > 0) {
      console.log('Fetching performance data using reporting API...')
      
      try {
        const performanceData = await fetchCampaignPerformanceReport(
          apiEndpoint,
          accessToken,
          clientId,
          connection.profile_id,
          reportStartDate,
          reportEndDate,
          requestQueue
        )
        
        console.log(`Retrieved ${performanceData.length} performance records`)
        
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
          const sales_14d = Math.max(0, parseFloat(perfData.attributedSales14d || '0') || 0)
          const orders_14d = Math.max(0, parseInt(perfData.attributedUnitsOrdered14d || '0') || 0)
          const sales_7d = Math.max(0, parseFloat(perfData.attributedSales7d || '0') || 0)
          const orders_7d = Math.max(0, parseInt(perfData.attributedUnitsOrdered7d || '0') || 0)
          
          // Calculate derived metrics
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
          const cpc = clicks > 0 ? spend / clicks : 0
          const conversionRate_14d = clicks > 0 ? (orders_14d / clicks) * 100 : 0
          const conversionRate_7d = clicks > 0 ? (orders_7d / clicks) * 100 : 0
          const acos_14d = sales_14d > 0 ? (spend / sales_14d) * 100 : null
          const roas_14d = spend > 0 ? sales_14d / spend : null
          const acos_7d = sales_7d > 0 ? (spend / sales_7d) * 100 : null
          const roas_7d = spend > 0 ? sales_7d / spend : null
          
          console.log(`Updating campaign ${perfData.campaignId}: spend=${spend}, sales_14d=${sales_14d}, impressions=${impressions}, clicks=${clicks}`)

          // Update with both 7d and 14d attribution data
          const updateData = {
            last_updated: new Date().toISOString(),
            // Basic metrics (use most recent data)
            impressions: impressions,
            clicks: clicks,
            spend: spend,
            // Default to 14d attribution for primary metrics
            sales: sales_14d,
            orders: orders_14d,
            acos: acos_14d,
            roas: roas_14d,
            // 7d attribution specific
            sales_7d: sales_7d,
            orders_7d: orders_7d,
            clicks_7d: clicks,
            impressions_7d: impressions,
            spend_7d: spend,
            ctr_7d: ctr,
            cpc_7d: cpc,
            conversion_rate_7d: conversionRate_7d,
            acos_7d: acos_7d,
            roas_7d: roas_7d,
            // 14d attribution specific
            sales_14d: sales_14d,
            orders_14d: orders_14d,
            clicks_14d: clicks,
            impressions_14d: impressions,
            spend_14d: spend,
            ctr_14d: ctr,
            cpc_14d: cpc,
            conversion_rate_14d: conversionRate_14d,
            acos_14d: acos_14d,
            roas_14d: roas_14d,
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
        console.error('Error processing performance data:', error)
      }
    }

    performanceLog.phases.performanceData = Date.now() - startTime

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
        operation_type: 'reporting_api_sync',
        start_time: new Date(startTime).toISOString(),
        end_time: new Date().toISOString(),
        total_duration_ms: performanceLog.totalTime,
        campaigns_processed: campaignIds.length,
        success: true,
        phases: performanceLog.phases,
        performance_metrics: {
          campaignsProcessed: campaignIds.length,
          metricsUpdated: totalMetricsUpdated,
          apiEndpoint: apiEndpoint,
          reportingMethod: 'amazon_ads_reporting_api'
        }
      })

    console.log('Sync completed successfully:', performanceLog)

    return new Response(
      JSON.stringify({
        success: true,
        campaignsProcessed: campaignIds.length,
        metricsUpdated: totalMetricsUpdated,
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
          operation_type: 'reporting_api_sync',
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