import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { gunzipSync } from 'node:zlib'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PendingReport {
  id: string
  connection_id: string
  sync_job_id: string | null
  report_id: string
  report_type: string
  status: string
  configuration: {
    dateRange: { startDate: string; endDate: string }
    timeUnit: string
    columns: string[]
    entityIds: string[]
    entityType: string
  }
  poll_count: number
  created_at: string
}

interface ReportStatus {
  reportId: string
  status: string
  url?: string
  fileSize?: number
  expiration?: number
}

/**
 * Poll Amazon for report status
 */
async function pollReportStatus(
  accessToken: string,
  profileId: string,
  reportId: string,
  apiEndpoint: string
): Promise<ReportStatus> {
  const url = `${apiEndpoint}/reporting/reports/${reportId}`
  const clientId = Deno.env.get('AMAZON_CLIENT_ID')
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId': clientId!,
      'Amazon-Advertising-API-Scope': profileId,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Report status check failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data
}

/**
 * Download and decompress gzipped report
 */
async function downloadAndParseReport(url: string): Promise<any[]> {
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Report download failed: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const compressed = new Uint8Array(arrayBuffer)
  const decompressed = gunzipSync(compressed)
  const text = new TextDecoder().decode(decompressed)
  
  // Parse JSON lines
  return text
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
}

/**
 * Get decrypted access token for a connection
 */
async function getAccessToken(supabase: any, connectionId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_tokens', {
    p_profile_id: connectionId
  })

  if (error || !data || data.length === 0) {
    throw new Error('Failed to retrieve access token')
  }

  return data[0].access_token
}

/**
 * Process completed report and update entities
 */
async function processCompletedReport(
  supabase: any,
  report: PendingReport,
  reportData: any[],
  connectionId: string,
  profileId: string
) {
  console.log(`📊 Processing ${reportData.length} records for ${report.report_type}`)
  
  const { timeUnit, entityType } = report.configuration
  let updated = 0

  for (const record of reportData) {
    try {
      switch (entityType) {
        case 'campaigns': {
          const updateData: any = {
            impressions: record.impressions || 0,
            clicks: record.clicks || 0,
            cost_legacy: record.cost || 0,
            attributed_sales_legacy: record.sales7d || 0,
            attributed_conversions_legacy: record.purchases7d || 0,
            updated_at: new Date().toISOString()
          }

          const { error } = await supabase
            .from('campaigns')
            .update(updateData)
            .eq('amazon_campaign_id', record.campaignId)
            .eq('connection_id', connectionId)

          if (!error) updated++
          
          // Insert into streaming tables for daily data
          if (timeUnit === 'DAILY' && record.date) {
            await supabase
              .from('ams_messages_sp_traffic')
              .insert({
                profile_id: profileId,
                campaign_id: record.campaignId,
                hour_start: new Date(record.date + 'T12:00:00Z'),
                impressions: record.impressions || 0,
                clicks: record.clicks || 0,
                cost: record.cost || 0,
                connection_id: connectionId,
                payload: {}
              })

            if (record.sales7d || record.purchases7d) {
              await supabase
                .from('ams_messages_sp_conversion')
                .insert({
                  profile_id: profileId,
                  campaign_id: record.campaignId,
                  hour_start: new Date(record.date + 'T12:00:00Z'),
                  attributed_sales: record.sales7d || 0,
                  attributed_conversions: record.purchases7d || 0,
                  connection_id: connectionId,
                  payload: {}
                })
            }
          }
          break
        }

        case 'adGroups': {
          const updateData: any = {
            impressions: record.impressions || 0,
            clicks: record.clicks || 0,
            spend: record.cost || 0,
            sales: record.sales7d || 0,
            orders: record.purchases7d || 0,
            updated_at: new Date().toISOString()
          }

          const { error } = await supabase
            .from('ad_groups')
            .update(updateData)
            .eq('amazon_adgroup_id', record.adGroupId)
            .eq('connection_id', connectionId)

          if (!error) updated++
          
          // Insert into streaming tables
          if (timeUnit === 'DAILY' && record.date) {
            await supabase
              .from('ams_messages_sp_traffic')
              .insert({
                profile_id: profileId,
                campaign_id: record.campaignId,
                ad_group_id: record.adGroupId,
                hour_start: new Date(record.date + 'T12:00:00Z'),
                impressions: record.impressions || 0,
                clicks: record.clicks || 0,
                cost: record.cost || 0,
                connection_id: connectionId,
                payload: {}
              })

            if (record.sales7d || record.purchases7d) {
              await supabase
                .from('ams_messages_sp_conversion')
                .insert({
                  profile_id: profileId,
                  campaign_id: record.campaignId,
                  ad_group_id: record.adGroupId,
                  hour_start: new Date(record.date + 'T12:00:00Z'),
                  attributed_sales: record.sales7d || 0,
                  attributed_conversions: record.purchases7d || 0,
                  connection_id: connectionId,
                  payload: {}
                })
            }
          }
          break
        }

        case 'targets': {
          const updateData: any = {
            impressions: record.impressions || 0,
            clicks: record.clicks || 0,
            spend: record.cost || 0,
            sales: record.sales7d || 0,
            orders: record.purchases7d || 0,
            updated_at: new Date().toISOString()
          }

          const { error } = await supabase
            .from('targets')
            .update(updateData)
            .eq('amazon_target_id', record.targetId)
            .eq('connection_id', connectionId)

          if (!error) updated++
          break
        }

        case 'keywords': {
          const keywordId = record.keywordId || record.targetId // v3 API uses targetId for keywords
          const updateData: any = {
            impressions: record.impressions || 0,
            clicks: record.clicks || 0,
            spend: record.cost || 0,
            sales: record.sales7d || 0,
            orders: record.purchases7d || 0,
            sales_7d: record.sales7d || 0,
            orders_7d: record.purchases7d || 0,
            updated_at: new Date().toISOString()
          }

          const { error } = await supabase
            .from('keywords')
            .update(updateData)
            .eq('amazon_keyword_id', keywordId)
            .eq('connection_id', connectionId)

          if (!error) updated++
          break
        }
      }
    } catch (error) {
      console.warn(`Failed to process record:`, error)
    }
  }

  console.log(`✅ Updated ${updated} ${entityType}`)
  return updated
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch pending reports (not completed or failed, and not polled too recently)
    const { data: pendingReports, error: fetchError } = await supabase
      .from('pending_amazon_reports')
      .select('*')
      .in('status', ['pending', 'processing'])
      .or(`last_polled_at.is.null,last_polled_at.lt.${new Date(Date.now() - 10000).toISOString()}`) // At least 10s since last poll
      .lt('poll_count', 100) // Max 100 polls (~15 minutes)
      .limit(10)

    if (fetchError) {
      throw fetchError
    }

    if (!pendingReports || pendingReports.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending reports to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Processing ${pendingReports.length} pending reports`)
    const results = []

    for (const report of pendingReports) {
      try {
        // Update last polled timestamp and increment count
        await supabase
          .from('pending_amazon_reports')
          .update({
            last_polled_at: new Date().toISOString(),
            poll_count: report.poll_count + 1,
            status: 'processing'
          })
          .eq('id', report.id)

        // Fetch connection details
        const { data: connection, error: connError } = await supabase
          .from('amazon_connections')
          .select('profile_id, advertising_api_endpoint')
          .eq('id', report.connection_id)
          .single()

        if (connError || !connection) {
          throw new Error('Failed to get connection details')
        }

        // Get access token - try to refresh if needed
        let accessToken: string
        let tokenData = await supabase.rpc('get_tokens', {
          p_profile_id: connection.profile_id
        })

        if (tokenData.error || !tokenData.data || tokenData.data.length === 0) {
          throw new Error('Failed to get access token')
        }

        accessToken = tokenData.data[0].access_token
        const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api.amazon.com'

        // Check report status - will retry with token refresh if 401
        let reportStatus: ReportStatus
        try {
          reportStatus = await pollReportStatus(
            accessToken,
            connection.profile_id,
            report.report_id,
            apiEndpoint
          )
        } catch (error) {
          // If 401, try refreshing the token
          if (error instanceof Error && error.message.includes('401')) {
            console.log('🔄 Token expired, refreshing...')
            
            const { error: refreshError } = await supabase.functions.invoke('refresh-amazon-token', {
              body: { profileId: connection.profile_id }
            })

            if (refreshError) {
              throw new Error(`Token refresh failed: ${refreshError.message}`)
            }

            // Get new token
            tokenData = await supabase.rpc('get_tokens', {
              p_profile_id: connection.profile_id
            })

            if (tokenData.error || !tokenData.data || tokenData.data.length === 0) {
              throw new Error('Failed to get refreshed token')
            }

            accessToken = tokenData.data[0].access_token

            // Retry with new token
            reportStatus = await pollReportStatus(
              accessToken,
              connection.profile_id,
              report.report_id,
              apiEndpoint
            )
          } else {
            throw error
          }
        }

        if (reportStatus.status === 'SUCCESS' && reportStatus.url) {
          // Download and process report
          const reportData = await downloadAndParseReport(reportStatus.url)
          
          // Process the data
          await processCompletedReport(
            supabase,
            report,
            reportData,
            report.connection_id,
            connection.profile_id
          )

          // Mark as completed
          await supabase
            .from('pending_amazon_reports')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              download_url: reportStatus.url
            })
            .eq('id', report.id)

          results.push({ reportId: report.report_id, status: 'completed', records: reportData.length })
        } else if (reportStatus.status === 'FAILURE') {
          // Mark as failed
          await supabase
            .from('pending_amazon_reports')
            .update({
              status: 'failed',
              error_details: 'Report generation failed on Amazon side'
            })
            .eq('id', report.id)

          results.push({ reportId: report.report_id, status: 'failed' })
        } else {
          // Still processing
          results.push({ reportId: report.report_id, status: reportStatus.status })
        }
      } catch (error) {
        console.error(`Error processing report ${report.report_id}:`, error)
        
        // Mark as failed after too many retries
        if (report.poll_count >= 99) {
          await supabase
            .from('pending_amazon_reports')
            .update({
              status: 'failed',
              error_details: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', report.id)
        }

        results.push({ reportId: report.report_id, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Report poller error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
