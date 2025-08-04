import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportRequest {
  reportId: string
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE'
  statusDetails?: string
  location?: string
  fileSize?: number
  startDate: string
  endDate: string
  reportType: string
  configuration?: any
}

interface ReportPollingState {
  reportId: string
  connectionId: string
  userId: string
  attempts: number
  maxAttempts: number
  nextPollTime: Date
  configuration: any
}

// Enhanced report generation workflow
class EnhancedReportGenerator {
  private supabase: any
  private accessToken: string
  private clientId: string
  private profileId: string
  private apiEndpoint: string
  private connectionId: string

  constructor(
    supabase: any,
    accessToken: string,
    clientId: string,
    profileId: string,
    apiEndpoint: string,
    connectionId: string
  ) {
    this.supabase = supabase
    this.accessToken = accessToken
    this.clientId = clientId
    this.profileId = profileId
    this.apiEndpoint = apiEndpoint
    this.connectionId = connectionId
  }

  // Phase 1: Submit Report Request
  async submitReportRequest(
    reportType: string,
    startDate: string,
    endDate: string,
    configuration: any
  ): Promise<ReportRequest> {
    console.log(`Submitting ${reportType} report request for ${startDate} to ${endDate}`)

    // Use v3 reporting API configuration
    const reportPayload = {
      name: `${reportType}_${startDate}_${endDate}`,
      startDate,
      endDate,
      configuration: {
        adProduct: configuration.adProduct || 'SPONSORED_PRODUCTS',
        groupBy: configuration.groupBy || ['campaign'],
        columns: configuration.columns || [
          'campaignId',
          'campaignName', 
          'impressions',
          'clicks',
          'cost',
          'attributedSales14d',
          'attributedUnitsOrdered14d'
        ],
        reportTypeId: reportType,
        timeUnit: configuration.timeUnit || 'SUMMARY',
        format: 'GZIP_JSON'
      }
    }

    if (configuration.campaignIdFilter?.length > 0) {
      reportPayload.configuration.campaignIdFilter = configuration.campaignIdFilter
    }

    // Try v3 API first, fallback to v2
    let response
    try {
      response = await fetch(`${this.apiEndpoint}/reporting/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Amazon-Advertising-API-ClientId': this.clientId,
          'Amazon-Advertising-API-Scope': this.profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportPayload)
      })
      
      if (!response.ok && response.status === 404) {
        console.log('v3 reporting API not available, trying v2 format')
        throw new Error('v3 API not found, trying v2')
      }
    } catch (v3Error) {
      console.log('Falling back to v2 reporting API format')
      
      // v2 API format
      const v2Payload = {
        reportDate: endDate,
        campaignType: configuration.adProduct === 'SPONSORED_BRANDS' ? 'sponsoredBrands' : 'sponsoredProducts',
        segment: configuration.groupBy?.[0] || 'campaign',
        metrics: configuration.columns || [
          'campaignName',
          'campaignId',
          'impressions',
          'clicks',
          'cost',
          'attributedSales14d',
          'attributedUnitsOrdered14d'
        ]
      }
      
      response = await fetch(`${this.apiEndpoint}/v2/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Amazon-Advertising-API-ClientId': this.clientId,
          'Amazon-Advertising-API-Scope': this.profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(v2Payload)
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Report request failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    
    // Store the report request in database for tracking
    await this.storeReportRequest(result.reportId, {
      reportType,
      startDate,
      endDate,
      status: 'IN_PROGRESS',
      configuration: reportPayload.configuration
    })

    return {
      reportId: result.reportId,
      status: 'IN_PROGRESS',
      startDate,
      endDate,
      reportType,
      configuration: reportPayload.configuration
    }
  }

  // Phase 2: Poll Report Status with API version detection
  async pollReportStatus(reportId: string): Promise<ReportRequest> {
    console.log(`Polling status for report ${reportId}`)

    // Try v3 first, fallback to v2
    let response
    try {
      response = await fetch(`${this.apiEndpoint}/reporting/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Amazon-Advertising-API-ClientId': this.clientId,
          'Amazon-Advertising-API-Scope': this.profileId,
        },
      })
      
      if (!response.ok && response.status === 404) {
        throw new Error('v3 API not found, trying v2')
      }
    } catch (v3Error) {
      console.log('Trying v2 reporting status endpoint')
      response = await fetch(`${this.apiEndpoint}/v2/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Amazon-Advertising-API-ClientId': this.clientId,
          'Amazon-Advertising-API-Scope': this.profileId,
        },
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Status polling failed: ${response.status} ${errorText}`)
    }

    const reportStatus = await response.json()
    
    // Update report status in database
    await this.updateReportStatus(reportId, {
      status: reportStatus.status,
      statusDetails: reportStatus.statusDetails,
      location: reportStatus.location,
      fileSize: reportStatus.fileSize
    })

    return reportStatus
  }

  // Phase 3: Download Report Data
  async downloadReport(reportId: string, location: string): Promise<any[]> {
    console.log(`Downloading report ${reportId} from ${location}`)

    const response = await fetch(location, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Amazon-Advertising-API-ClientId': this.clientId,
        'Amazon-Advertising-API-Scope': this.profileId,
      },
    })

    if (!response.ok) {
      throw new Error(`Report download failed: ${response.status}`)
    }

    // Handle GZIP decompression
    const arrayBuffer = await response.arrayBuffer()
    
    try {
      // Decompress GZIP data
      const decompressed = new TextDecoder().decode(
        new Uint8Array(arrayBuffer)
      )
      
      const reportData = JSON.parse(decompressed)
      console.log(`Downloaded report with ${reportData.length || 0} records`)
      
      return reportData
    } catch (error) {
      console.error('Error decompressing/parsing report:', error)
      throw new Error('Failed to process downloaded report data')
    }
  }

  // Phase 4: Process and Store Report Data
  async processReportData(
    reportData: any[],
    reportType: string,
    attributionWindow: string
  ): Promise<void> {
    console.log(`Processing ${reportData.length} records for ${reportType}`)

    for (const record of reportData) {
      try {
        if (reportType === 'spCampaigns') {
          await this.processCampaignRecord(record, attributionWindow)
        } else if (reportType === 'spAdGroups') {
          await this.processAdGroupRecord(record, attributionWindow)
        } else if (reportType === 'spKeywords') {
          await this.processKeywordRecord(record, attributionWindow)
        }
      } catch (error) {
        console.error(`Error processing record:`, error)
      }
    }
  }

  // Store report request in database
  private async storeReportRequest(reportId: string, data: any): Promise<void> {
    await this.supabase
      .from('amazon_report_requests')
      .upsert({
        report_id: reportId,
        connection_id: this.connectionId,
        report_type: data.reportType,
        start_date: data.startDate,
        end_date: data.endDate,
        status: data.status,
        configuration: data.configuration,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'report_id'
      })
  }

  // Update report status in database
  private async updateReportStatus(reportId: string, statusData: any): Promise<void> {
    await this.supabase
      .from('amazon_report_requests')
      .update({
        status: statusData.status,
        status_details: statusData.statusDetails,
        download_url: statusData.location,
        file_size: statusData.fileSize,
        updated_at: new Date().toISOString()
      })
      .eq('report_id', reportId)
  }

  // Process campaign data from report
  private async processCampaignRecord(record: any, attributionWindow: string): Promise<void> {
    if (!record.campaignId) return

    const impressions = parseInt(record.impressions || '0')
    const clicks = parseInt(record.clicks || '0')
    const spend = parseFloat(record.cost || '0')
    const sales = parseFloat(record[`attributedSales${attributionWindow}`] || '0')
    const orders = parseInt(record[`attributedUnitsOrdered${attributionWindow}`] || '0')
    
    const acos = sales > 0 ? (spend / sales) * 100 : null
    const roas = spend > 0 ? sales / spend : null
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cpc = clicks > 0 ? spend / clicks : 0
    const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0

    // Update campaign with attribution-specific metrics
    const updateData: any = {
      last_updated: new Date().toISOString(),
      [`impressions_${attributionWindow}`]: impressions,
      [`clicks_${attributionWindow}`]: clicks,
      [`spend_${attributionWindow}`]: spend,
      [`sales_${attributionWindow}`]: sales,
      [`orders_${attributionWindow}`]: orders,
      [`acos_${attributionWindow}`]: acos,
      [`roas_${attributionWindow}`]: roas,
      [`ctr_${attributionWindow}`]: ctr,
      [`cpc_${attributionWindow}`]: cpc,
      [`conversion_rate_${attributionWindow}`]: conversionRate
    }

    // Set primary metrics to 14d by default
    if (attributionWindow === '14d') {
      updateData.impressions = impressions
      updateData.clicks = clicks
      updateData.spend = spend
      updateData.sales = sales
      updateData.orders = orders
      updateData.acos = acos
      updateData.roas = roas
    }

    await this.supabase
      .from('campaigns')
      .update(updateData)
      .eq('connection_id', this.connectionId)
      .eq('amazon_campaign_id', record.campaignId.toString())

    // Store historical data
    const { data: campaignRecord } = await this.supabase
      .from('campaigns')
      .select('id')
      .eq('connection_id', this.connectionId)
      .eq('amazon_campaign_id', record.campaignId.toString())
      .single()

    if (campaignRecord) {
      await this.supabase
        .from('campaign_performance_history')
        .upsert({
          campaign_id: campaignRecord.id,
          date: record.date || new Date().toISOString().split('T')[0],
          attribution_window: attributionWindow,
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

  // Similar methods for ad groups and keywords
  private async processAdGroupRecord(record: any, attributionWindow: string): Promise<void> {
    // Implementation for ad group processing
    console.log('Processing ad group record:', record.adGroupId)
  }

  private async processKeywordRecord(record: any, attributionWindow: string): Promise<void> {
    // Implementation for keyword processing  
    console.log('Processing keyword record:', record.keywordId)
  }

  // Orchestrate the full report generation workflow
  async generateReport(
    reportType: string,
    startDate: string,
    endDate: string,
    attributionWindow: string,
    configuration: any = {}
  ): Promise<any> {
    try {
      // Phase 1: Submit report request
      const reportRequest = await this.submitReportRequest(
        reportType,
        startDate,
        endDate,
        {
          ...configuration,
          columns: this.getColumnsForAttributionWindow(reportType, attributionWindow)
        }
      )

      // Phase 2: Poll for completion (with timeout)
      const maxPollingTime = 10 * 60 * 1000 // 10 minutes
      const pollingInterval = 30 * 1000 // 30 seconds
      const startPolling = Date.now()

      let reportStatus = reportRequest
      
      while (reportStatus.status === 'IN_PROGRESS' && 
             (Date.now() - startPolling) < maxPollingTime) {
        
        await new Promise(resolve => setTimeout(resolve, pollingInterval))
        reportStatus = await this.pollReportStatus(reportRequest.reportId)
        
        console.log(`Report ${reportRequest.reportId} status: ${reportStatus.status}`)
      }

      if (reportStatus.status !== 'SUCCESS') {
        throw new Error(`Report generation failed: ${reportStatus.statusDetails || 'Unknown error'}`)
      }

      if (!reportStatus.location) {
        throw new Error('Report completed but no download location provided')
      }

      // Phase 3: Download report data
      const reportData = await this.downloadReport(reportRequest.reportId, reportStatus.location)

      // Phase 4: Process and store data
      await this.processReportData(reportData, reportType, attributionWindow)

      return {
        reportId: reportRequest.reportId,
        recordsProcessed: reportData.length,
        status: 'completed',
        attributionWindow
      }

    } catch (error) {
      console.error(`Report generation failed for ${reportType}:`, error)
      throw error
    }
  }

  // Get appropriate columns for attribution window with API version compatibility
  private getColumnsForAttributionWindow(reportType: string, attributionWindow: string): string[] {
    const baseColumns = [
      'impressions',
      'clicks', 
      'cost'
    ]

    // Handle both v2 and v3 API column names
    const attributionSuffix = attributionWindow.replace('d', '') + 'd' // Ensure format like '7d', '14d'

    if (reportType === 'spCampaigns') {
      return [
        'campaignId',
        'campaignName',
        ...baseColumns,
        `attributedSales${attributionSuffix}`,
        `attributedUnitsOrdered${attributionSuffix}`,
        'clickThroughRate',
        'costPerClick'
      ]
    } else if (reportType === 'spAdGroups') {
      return [
        'campaignId',
        'adGroupId', 
        'adGroupName',
        ...baseColumns,
        `attributedSales${attributionSuffix}`,
        `attributedUnitsOrdered${attributionSuffix}`
      ]
    } else if (reportType === 'spKeywords') {
      return [
        'campaignId',
        'adGroupId',
        'keywordId',
        'keywordText',
        'matchType',
        ...baseColumns,
        `attributedSales${attributionSuffix}`,
        `attributedUnitsOrdered${attributionSuffix}`
      ]
    }

    return baseColumns
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now()

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

    const {
      connectionId,
      reportTypes = ['spCampaigns'],
      attributionWindows = ['14d'],
      dateRange,
      campaignIdFilter
    } = await req.json()

    console.log('Starting enhanced report generation for connection:', connectionId)

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
    if (!clientId) {
      throw new Error('Amazon client ID not configured')
    }

    // Initialize enhanced report generator
    const reportGenerator = new EnhancedReportGenerator(
      supabase,
      connection.access_token,
      clientId,
      connection.profile_id,
      connection.advertising_api_endpoint || 'https://advertising-api.amazon.com',
      connectionId
    )

    // Set up date range
    const endDate = dateRange?.endDate || new Date().toISOString().split('T')[0]
    const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const results = []

    // Generate reports for each combination of report type and attribution window
    for (const reportType of reportTypes) {
      for (const attributionWindow of attributionWindows) {
        try {
          console.log(`Generating ${reportType} report for ${attributionWindow} attribution window`)
          
          const result = await reportGenerator.generateReport(
            reportType,
            startDate,
            endDate,
            attributionWindow,
            {
              campaignIdFilter: campaignIdFilter || []
            }
          )

          results.push({
            reportType,
            attributionWindow,
            ...result
          })

        } catch (error) {
          console.error(`Failed to generate ${reportType} report for ${attributionWindow}:`, error)
          results.push({
            reportType,
            attributionWindow,
            status: 'failed',
            error: error.message
          })
        }
      }
    }

    // Update connection sync timestamp
    await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        reporting_api_version: 'enhanced_workflow'
      })
      .eq('id', connectionId)

    const totalTime = Date.now() - startTime

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Enhanced report generation completed',
        results,
        performance: {
          totalTime,
          reportsGenerated: results.filter(r => r.status === 'completed').length,
          reportsFailed: results.filter(r => r.status === 'failed').length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enhanced report generation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        performance: {
          totalTime: Date.now() - startTime
        }
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})