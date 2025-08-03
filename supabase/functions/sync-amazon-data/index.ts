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

// AWS SigV4 signing for Amazon Advertising API
async function createAWSSignature(
  method: string, 
  url: string, 
  headers: Record<string, string>, 
  body: string,
  accessToken: string,
  clientId: string
): Promise<Record<string, string>> {
  
  // For Amazon Advertising API, we still use Bearer token but with proper formatting
  // The API expects the access token without 'Bearer ' prefix in storage but with it in requests
  const cleanToken = accessToken.replace(/^Bearer\s+/i, '');
  
  return {
    ...headers,
    'Authorization': `Bearer ${cleanToken}`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Content-Type': 'application/json',
    'User-Agent': 'Lovable-Amazon-Integration/1.0'
  };
}

// Enhanced API request with proper Amazon Ads API authentication
async function makeAmazonApiRequest(
  url: string, 
  options: RequestInit, 
  accessToken: string,
  clientId: string,
  profileId?: string,
  retries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create proper headers with AWS-style authentication
      const method = options.method || 'GET';
      const body = options.body ? String(options.body) : '';
      
      const baseHeaders: Record<string, string> = {
        'Amazon-Advertising-API-ClientId': clientId,
        'Content-Type': 'application/json',
        'User-Agent': 'Lovable-Amazon-Integration/1.0'
      };
      
      if (profileId) {
        baseHeaders['Amazon-Advertising-API-Scope'] = profileId;
      }
      
      // Add Authorization header with proper token format
      const cleanToken = accessToken.replace(/^Bearer\s+/i, '');
      baseHeaders['Authorization'] = `Bearer ${cleanToken}`;
      
      const requestOptions = {
        ...options,
        headers: {
          ...baseHeaders,
          ...(options.headers || {})
        }
      };
      
      console.log(`Making ${method} request to: ${url}`);
      console.log('Request headers:', JSON.stringify(requestOptions.headers, null, 2));
      
      const response = await fetch(url, requestOptions);
      
      if (response.ok) {
        console.log(`✅ Request successful (${response.status})`);
        return response;
      }
      
      const errorText = await response.text();
      console.log(`❌ API request failed (${response.status}): ${errorText}`);
      
      // Enhanced error logging for authentication issues
      if (response.status === 403) {
        console.log('🔐 Authorization failed. Request URL:', url);
        console.log('🔑 Access token format check:', {
          tokenLength: cleanToken.length,
          startsWithAtza: cleanToken.startsWith('Atza|'),
          hasBearer: accessToken.includes('Bearer')
        });
      }
      
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
      
      // Don't retry on authentication errors (they won't improve with retries)
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed: ${response.status} ${errorText}`)
      }
      
      // Don't retry on other client errors
      throw new Error(`API request failed: ${response.status} ${errorText}`)
      
    } catch (error) {
      console.log(`Request failed (attempt ${attempt}/${retries}): ${error.message}`)
      
      if (attempt === retries) {
        throw error
      }
      
      // Don't retry authentication errors
      if (error.message.includes('Authentication failed')) {
        throw error
      }
      
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay * attempt))
    }
  }
  
  throw new Error('Maximum retries exceeded')
}

// Simplified performance data fetch using campaigns extended endpoint
async function fetchCampaignPerformanceData(
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string,
  campaignIds: string[],
  requestQueue: RequestQueue
): Promise<any[]> {
  
  console.log(`Fetching performance data for ${campaignIds.length} campaigns`)
  
  if (campaignIds.length === 0) {
    return []
  }
  
  try {
    // Use campaigns extended endpoint for performance data
    const response = await requestQueue.add(() =>
      makeAmazonApiRequest(
        `${apiEndpoint}/v3/sp/campaigns/extended`,
        { method: 'GET' },
        accessToken,
        clientId,
        profileId
      )
    )

    if (!response.ok) {
      console.error(`Performance data fetch failed: ${response.status}`)
      return []
    }

    const performanceData = await response.json()
    console.log(`Retrieved performance data for ${Array.isArray(performanceData) ? performanceData.length : 0} campaigns`)

    // Filter to only campaigns we're interested in
    if (Array.isArray(performanceData)) {
      return performanceData.filter(campaign => 
        campaignIds.includes(campaign.campaignId?.toString())
      )
    }

    return []
    
  } catch (error) {
    console.error('Error fetching performance data:', error)
    return []
  }
}

// Create and poll an Amazon Ads report for historical campaign performance
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
    // Step 1: Create the report using v3 reporting API
    const reportRequest = {
      reportDate: endDate,
      configuration: {
        adProduct: "SPONSORED_PRODUCTS",
        groupBy: ["CAMPAIGN"],
        columns: [
          "campaignName",
          "campaignId", 
          "impressions",
          "clicks",
          "cost",
          "sales14d",
          "orders14d",
          "sales7d", 
          "orders7d"
        ],
        reportTypeId: "spCampaigns",
        timeUnit: "SUMMARY",
        format: "GZIP_JSON"
      }
    }

    console.log('Creating report with request:', JSON.stringify(reportRequest, null, 2))

    const createReportResponse = await requestQueue.add(() =>
      makeAmazonApiRequest(
        `${apiEndpoint}/reporting/reports`,
        {
          method: 'POST',
          body: JSON.stringify(reportRequest)
        },
        accessToken,
        clientId,
        profileId
      )
    )

    if (!createReportResponse.ok) {
      console.error(`Report creation failed: ${createReportResponse.status}`)
      const errorText = await createReportResponse.text()
      console.error('Report creation error details:', errorText)
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
    const maxPollAttempts = 20 // 3-4 minutes at 10-second intervals
    
    console.log(`Polling for report ${reportId} completion...`)

    while (!reportReady && pollAttempts < maxPollAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      pollAttempts++

      const statusResponse = await requestQueue.add(() =>
        makeAmazonApiRequest(
          `${apiEndpoint}/reporting/reports/${reportId}`,
          { method: 'GET' },
          accessToken,
          clientId,
          profileId
        )
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
            makeAmazonApiRequest(
              statusResult.location,
              { method: 'GET' },
              accessToken,
              clientId,
              profileId
            )
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

// Regional API endpoint mapping
function getRegionalApiEndpoint(marketplaceId: string): string {
  const endpoints = {
    // North America
    'US': 'https://advertising-api.amazon.com',
    'CA': 'https://advertising-api.amazon.com',
    'MX': 'https://advertising-api.amazon.com',
    
    // Europe
    'UK': 'https://advertising-api-eu.amazon.com',
    'DE': 'https://advertising-api-eu.amazon.com',
    'FR': 'https://advertising-api-eu.amazon.com',
    'IT': 'https://advertising-api-eu.amazon.com',
    'ES': 'https://advertising-api-eu.amazon.com',
    'NL': 'https://advertising-api-eu.amazon.com',
    'PL': 'https://advertising-api-eu.amazon.com',
    'SE': 'https://advertising-api-eu.amazon.com',
    
    // Far East
    'JP': 'https://advertising-api-fe.amazon.com',
    'AU': 'https://advertising-api-fe.amazon.com',
    'SG': 'https://advertising-api-fe.amazon.com',
    'AE': 'https://advertising-api-fe.amazon.com',
    'IN': 'https://advertising-api-fe.amazon.com',
  }
  
  return endpoints[marketplaceId] || 'https://advertising-api-eu.amazon.com'
}

// Fetch campaigns using the correct v3 endpoint with extended data
async function fetchCampaigns(
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string,
  requestQueue: RequestQueue
): Promise<any[]> {
  
  console.log('Fetching campaigns from v3/sp/campaigns/extended endpoint')
  
  try {
    const response = await requestQueue.add(() =>
      makeAmazonApiRequest(
        `${apiEndpoint}/v3/sp/campaigns/extended`,
        { method: 'GET' },
        accessToken,
        clientId,
        profileId
      )
    )

    if (!response.ok) {
      // Fallback to basic v3 endpoint if extended fails
      console.log('Extended endpoint failed, trying basic v3 endpoint')
      const fallbackResponse = await requestQueue.add(() =>
        makeAmazonApiRequest(
          `${apiEndpoint}/v3/sp/campaigns`,
          { method: 'GET' },
          accessToken,
          clientId,
          profileId
        )
      )
      
      if (fallbackResponse.ok) {
        const campaignsData = await fallbackResponse.json()
        console.log(`Retrieved ${Array.isArray(campaignsData) ? campaignsData.length : 0} campaigns from basic v3 endpoint`)
        return Array.isArray(campaignsData) ? campaignsData : []
      } else {
        console.error(`Both v3 endpoints failed: ${response.status}, ${fallbackResponse.status}`)
        return []
      }
    }

    const campaignsData = await response.json()
    console.log(`Retrieved ${Array.isArray(campaignsData) ? campaignsData.length : 0} campaigns from extended endpoint`)

    return Array.isArray(campaignsData) ? campaignsData : []
    
  } catch (error) {
    console.error('Error fetching campaigns:', error)
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
  console.log('⚡ Starting enhanced connection health check...');
  
  let healthStatus = 'healthy';
  let healthIssues: string[] = [];

  try {
    // Validate token format before making requests
    const cleanToken = accessToken.replace(/^Bearer\s+/i, '');
    if (!cleanToken.startsWith('Atza|')) {
      healthIssues.push('Invalid access token format - not an Amazon token');
      healthStatus = 'unhealthy';
    }

    // Test basic profile access with enhanced error handling
    console.log('🔍 Testing profile access...');
    const profileResponse = await makeAmazonApiRequest(
      `${apiEndpoint}/v2/profiles`,
      { method: 'GET' },
      accessToken,
      clientId,
      profileId
    );

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.log('❌ Profile access failed:', profileResponse.status, errorText);
      
      if (profileResponse.status === 403) {
        healthIssues.push('Authentication failed - token may be expired or invalid');
        healthStatus = 'auth_failed';
      } else if (profileResponse.status === 429) {
        healthIssues.push('Rate limit exceeded');
        healthStatus = 'rate_limited';
      } else {
        healthIssues.push(`API error ${profileResponse.status}: ${errorText}`);
        healthStatus = 'unhealthy';
      }
    } else {
      console.log('✅ Profile access successful');
    }

    // Test campaigns endpoint access
    console.log('🔍 Testing campaigns endpoint access...');
    const campaignsResponse = await makeAmazonApiRequest(
      `${apiEndpoint}/v3/sp/campaigns`,
      { method: 'GET' },
      accessToken,
      clientId,
      profileId
    );

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text();
      console.log('❌ Campaigns access failed:', campaignsResponse.status, errorText);
      
      if (campaignsResponse.status === 403) {
        healthIssues.push('Campaign access denied - insufficient permissions');
        if (healthStatus === 'healthy') healthStatus = 'auth_failed';
      }
    } else {
      console.log('✅ Campaigns endpoint accessible');
    }

  } catch (error) {
    console.error('❌ Health check error:', error);
    healthIssues.push(`Health check failed: ${error.message}`);
    healthStatus = 'error';
  }

  // Update connection with enhanced health information
  console.log(`📊 Health check result: ${healthStatus}`, healthIssues);
  
  await supabase
    .from('amazon_connections')
    .update({
      health_status: healthStatus,
      health_issues: healthIssues.length > 0 ? healthIssues : null,
      last_health_check: new Date().toISOString(),
      // If auth failed, update status to require attention
      status: healthStatus === 'auth_failed' ? 'expired' : 'active',
      setup_required_reason: healthStatus === 'auth_failed' ? 'Authentication failed - please reconnect your account' : null
    })
    .eq('id', connectionId);
  
  return { healthy: healthIssues.length === 0, issues: healthIssues };
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
          
          // Store access token without Bearer prefix for consistency
          const cleanAccessToken = tokenData.access_token.replace(/^Bearer\s+/i, '')
          
          await supabase
            .from('amazon_connections')
            .update({
              access_token: cleanAccessToken,
              refresh_token: tokenData.refresh_token || connection.refresh_token,
              token_expires_at: newExpiresAt.toISOString(),
              status: 'active',
              setup_required_reason: null,
              health_status: 'unknown', // Reset to trigger health check
              last_health_check: null
            })
            .eq('id', connectionId)
          
          accessToken = cleanAccessToken
          console.log('Token refreshed and stored successfully')
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

    // Use correct regional API endpoint based on marketplace
    const apiEndpoint = getRegionalApiEndpoint(connection.marketplace_id) 
    console.log(`Using API endpoint for ${connection.marketplace_id}:`, apiEndpoint)
    
    // Update connection with correct endpoint if different
    if (connection.advertising_api_endpoint !== apiEndpoint) {
      await supabase
        .from('amazon_connections')
        .update({ advertising_api_endpoint: apiEndpoint })
        .eq('id', connectionId)
    }

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

    // Fetch performance data using multiple approaches
    let totalMetricsUpdated = 0
    
    if (campaignIds.length > 0) {
      console.log('Fetching performance data using extended endpoint...')
      
      try {
        // First, try to get performance data from the extended endpoint
        const extendedPerformanceData = await fetchCampaignPerformanceData(
          apiEndpoint,
          accessToken,
          clientId,
          connection.profile_id,
          campaignIds,
          requestQueue
        )
        
        console.log(`Retrieved ${extendedPerformanceData.length} extended performance records`)
        
        // Process extended performance data if available
        if (extendedPerformanceData.length > 0) {
          for (const perfData of extendedPerformanceData) {
            if (!perfData.campaignId) {
              console.warn('Skipping performance data without campaignId:', perfData)
              continue
            }
            
            // Enhanced metrics calculation with proper data types - handle both old and new format
            const impressions = Math.max(0, parseInt(perfData.impressions || perfData.serving?.impressions || '0') || 0)
            const clicks = Math.max(0, parseInt(perfData.clicks || perfData.serving?.clicks || '0') || 0)
            const spend = Math.max(0, parseFloat(perfData.cost || perfData.serving?.cost || '0') || 0)
            const sales_14d = Math.max(0, parseFloat(perfData.sales14d || perfData.performance?.sales14d || '0') || 0)
            const orders_14d = Math.max(0, parseInt(perfData.orders14d || perfData.performance?.orders14d || '0') || 0)
            const sales_7d = Math.max(0, parseFloat(perfData.sales7d || perfData.performance?.sales7d || '0') || 0)
            const orders_7d = Math.max(0, parseInt(perfData.orders7d || perfData.performance?.orders7d || '0') || 0)
            
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
        } else {
          // Fallback to reporting API for historical data
          console.log('No extended data available, trying reporting API...')
          
          const reportPerformanceData = await fetchCampaignPerformanceReport(
            apiEndpoint,
            accessToken,
            clientId,
            connection.profile_id,
            reportStartDate,
            reportEndDate,
            requestQueue
          )
          
          console.log(`Retrieved ${reportPerformanceData.length} report performance records`)
          
          // Process reporting API data
          for (const perfData of reportPerformanceData) {
            if (!perfData.campaignId) {
              console.warn('Skipping performance data without campaignId:', perfData)
              continue
            }
            
            // Handle reporting API format
            const impressions = Math.max(0, parseInt(perfData.impressions || '0') || 0)
            const clicks = Math.max(0, parseInt(perfData.clicks || '0') || 0)
            const spend = Math.max(0, parseFloat(perfData.cost || '0') || 0)
            const sales_14d = Math.max(0, parseFloat(perfData.sales14d || '0') || 0)
            const orders_14d = Math.max(0, parseInt(perfData.orders14d || '0') || 0)
            const sales_7d = Math.max(0, parseFloat(perfData.sales7d || '0') || 0)
            const orders_7d = Math.max(0, parseInt(perfData.orders7d || '0') || 0)
            
            // Calculate derived metrics
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
            const cpc = clicks > 0 ? spend / clicks : 0
            const conversionRate_14d = clicks > 0 ? (orders_14d / clicks) * 100 : 0
            const conversionRate_7d = clicks > 0 ? (orders_7d / clicks) * 100 : 0
            const acos_14d = sales_14d > 0 ? (spend / sales_14d) * 100 : null
            const roas_14d = spend > 0 ? sales_14d / spend : null
            const acos_7d = sales_7d > 0 ? (spend / sales_7d) * 100 : null
            const roas_7d = spend > 0 ? sales_7d / spend : null
            
            console.log(`Updating campaign ${perfData.campaignId} from report: spend=${spend}, sales_14d=${sales_14d}`)

            const updateData = {
              last_updated: new Date().toISOString(),
              impressions: impressions,
              clicks: clicks,
              spend: spend,
              sales: sales_14d,
              orders: orders_14d,
              acos: acos_14d,
              roas: roas_14d,
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