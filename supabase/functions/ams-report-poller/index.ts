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
    dateRange?: { startDate: string; endDate: string }
    timeUnit?: string
    columns?: string[]
    entityIds?: string[]
    entityType: string
    api_endpoint?: string
    profile_id?: string
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
 * Process search term report data - upsert into fact_search_term_daily
 */
async function processSearchTermReport(
  supabase: any,
  reportData: any[],
  profileId: string
): Promise<number> {
  console.log(`📊 [SEARCH_TERM_DEBUG] Processing ${reportData.length} search term records for profile ${profileId}`)
  
  // Debug: Log if report is empty
  if (!reportData || reportData.length === 0) {
    console.log(`⚠️ [SEARCH_TERM_DEBUG] Search term report is EMPTY - no data to process for profile ${profileId}`)
    return 0
  }
  
  // Debug: Log sample record structure to verify field mapping
  console.log(`🔍 [SEARCH_TERM_DEBUG] Sample record (first of ${reportData.length}):`, JSON.stringify(reportData[0], null, 2))
  console.log(`🔍 [SEARCH_TERM_DEBUG] Available fields in first record:`, Object.keys(reportData[0]))
  
  const BATCH_SIZE = 500
  let totalUpserted = 0

  for (let i = 0; i < reportData.length; i += BATCH_SIZE) {
    const batch = reportData.slice(i, i + BATCH_SIZE)
    
    // Debug: Log first batch transformation
    if (i === 0) {
      console.log(`🔍 [SEARCH_TERM_DEBUG] Processing first batch of ${batch.length} records`)
    }
    
    const records = batch.map((record: any) => ({
      date: record.date,
      profile_id: profileId,
      campaign_id: record.campaignId || '',
      ad_group_id: record.adGroupId || '',
      keyword_id: record.keywordId || null,
      keyword_text: record.keyword || null,
      search_term: record.searchTerm || '',
      match_type: record.matchType || 'UNKNOWN',
      targeting: record.targeting || null,
      impressions: record.impressions || 0,
      clicks: record.clicks || 0,
      cost_micros: Math.round((record.cost || 0) * 1000000),
      attributed_conversions_1d: record.purchases1d || 0,
      attributed_conversions_7d: record.purchases7d || 0,
      attributed_sales_7d_micros: Math.round((record.sales7d || 0) * 1000000)
    }))

    // Debug: Log first transformed batch
    if (i === 0 && records.length > 0) {
      console.log(`🔍 [SEARCH_TERM_DEBUG] First transformed record:`, JSON.stringify(records[0], null, 2))
    }

    const { error, count } = await supabase
      .from('fact_search_term_daily')
      .upsert(records, {
        onConflict: 'date,profile_id,campaign_id,ad_group_id,search_term,match_type'
      })

    if (error) {
      console.error(`❌ [SEARCH_TERM_DEBUG] Batch upsert error at index ${i}:`, error.message, error.details, error.hint)
      console.error(`❌ [SEARCH_TERM_DEBUG] Failed batch sample record:`, JSON.stringify(records[0], null, 2))
    } else {
      totalUpserted += records.length
      console.log(`✅ [SEARCH_TERM_DEBUG] Batch ${i / BATCH_SIZE + 1} upserted ${records.length} records successfully`)
    }
  }

  console.log(`✅ [SEARCH_TERM_DEBUG] Total upserted: ${totalUpserted} search term records for profile ${profileId}`)
  return totalUpserted
}

/**
 * Process conversion path report data - upsert into conversion_paths_daily and time_lag_daily
 */
async function processConversionPathReport(
  supabase: any,
  reportData: any[],
  profileId: string
): Promise<number> {
  console.log(`📊 Processing ${reportData.length} conversion path records`)
  
  // Group by date and campaign/adgroup to create path structures
  const pathsByDateAndCampaign: Map<string, any> = new Map()
  
  for (const record of reportData) {
    const key = `${record.date}_${record.campaignId}_${record.adGroupId || ''}`
    
    if (!pathsByDateAndCampaign.has(key)) {
      pathsByDateAndCampaign.set(key, {
        date: record.date,
        campaignId: record.campaignId,
        adGroupId: record.adGroupId,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        sales: 0
      })
    }
    
    const existing = pathsByDateAndCampaign.get(key)!
    existing.impressions += record.impressions || 0
    existing.clicks += record.clicks || 0
    existing.cost += record.cost || 0
    existing.conversions += record.purchases7d || 0
    existing.sales += record.sales7d || 0
  }

  // Transform into conversion_paths_daily format
  const paths: any[] = []
  
  for (const [key, data] of pathsByDateAndCampaign) {
    if (data.conversions === 0) continue // Skip non-converting paths
    
    // Build path structure based on clicks/views
    const pathJson: any[] = []
    
    if (data.impressions > 0 && data.clicks === 0) {
      // View-only path
      pathJson.push({
        type: 'sp',
        interaction: 'view',
        campaign_id: data.campaignId,
        ad_group_id: data.adGroupId
      })
    } else if (data.clicks > 0) {
      // Click path (may have views before)
      if (data.impressions > data.clicks) {
        pathJson.push({
          type: 'sp',
          interaction: 'view',
          campaign_id: data.campaignId,
          ad_group_id: data.adGroupId
        })
      }
      pathJson.push({
        type: 'sp',
        interaction: 'click',
        campaign_id: data.campaignId,
        ad_group_id: data.adGroupId
      })
    }
    
    if (pathJson.length === 0) continue
    
    const pathFingerprint = generatePathFingerprint(pathJson)
    
    paths.push({
      date: data.date,
      source: 'v3',
      profile_id: profileId,
      marketplace: 'ATVPDKIKX0DER',
      path_fingerprint: pathFingerprint,
      path_json: pathJson,
      conversions: data.conversions,
      sales_micros: Math.round(data.sales * 1000000),
      clicks: data.clicks,
      views: data.impressions,
      touch_count: pathJson.length
    })
  }

  if (paths.length === 0) {
    console.log(`No converting paths found in report data`)
    return 0
  }

  // Aggregate paths by date and fingerprint
  const aggregatedPaths = aggregatePathsByFingerprint(paths)
  
  console.log(`📊 Aggregated into ${aggregatedPaths.length} unique paths`)

  // Upsert to conversion_paths_daily
  const { error: pathsError } = await supabase
    .from('conversion_paths_daily')
    .upsert(aggregatedPaths, {
      onConflict: 'date,source,profile_id,path_fingerprint'
    })

  if (pathsError) {
    console.error(`❌ Failed to upsert conversion paths:`, pathsError)
    return 0
  }

  // Compute and upsert time lag data (estimated distribution)
  const timeLagData = computeTimeLagFromPaths(paths, profileId)
  
  if (timeLagData.length > 0) {
    const { error: lagError } = await supabase
      .from('time_lag_daily')
      .upsert(timeLagData, {
        onConflict: 'date,source,profile_id,bucket'
      })

    if (lagError) {
      console.error(`❌ Failed to upsert time lag data:`, lagError)
    }
  }

  console.log(`✅ Upserted ${aggregatedPaths.length} conversion paths`)
  return aggregatedPaths.length
}

/**
 * Aggregate paths with the same fingerprint on the same date
 */
function aggregatePathsByFingerprint(paths: any[]): any[] {
  const aggregated: Map<string, any> = new Map()
  
  for (const path of paths) {
    const key = `${path.date}_${path.profile_id}_${path.path_fingerprint}`
    
    if (!aggregated.has(key)) {
      aggregated.set(key, { ...path })
    } else {
      const existing = aggregated.get(key)!
      existing.conversions += path.conversions
      existing.sales_micros += path.sales_micros
      existing.clicks += path.clicks
      existing.views += path.views
    }
  }
  
  return Array.from(aggregated.values())
}

/**
 * Compute time lag buckets from paths (estimated distribution)
 */
function computeTimeLagFromPaths(paths: any[], profileId: string): any[] {
  const buckets = ['0-1d', '2-3d', '4-7d', '8-14d']
  const bucketWeights = [0.45, 0.25, 0.20, 0.10]
  
  // Group by date
  const byDate: Map<string, { conversions: number; sales: number }> = new Map()
  
  for (const path of paths) {
    if (!byDate.has(path.date)) {
      byDate.set(path.date, { conversions: 0, sales: 0 })
    }
    const existing = byDate.get(path.date)!
    existing.conversions += path.conversions
    existing.sales += path.sales_micros
  }
  
  const timeLagData: any[] = []
  
  for (const [date, data] of byDate) {
    buckets.forEach((bucket, index) => {
      const conversions = Math.round(data.conversions * bucketWeights[index])
      const salesMicros = Math.round(data.sales * bucketWeights[index])
      
      if (conversions > 0) {
        timeLagData.push({
          date,
          source: 'v3',
          profile_id: profileId,
          bucket,
          conversions,
          sales_micros: salesMicros
        })
      }
    })
  }
  
  return timeLagData
}

/**
 * Generate a fingerprint for a conversion path
 */
function generatePathFingerprint(pathJson: any[]): string {
  const pathString = JSON.stringify(pathJson.map(step => ({
    type: step.type,
    interaction: step.interaction
  })))
  
  let hash = 0
  for (let i = 0; i < pathString.length; i++) {
    const char = pathString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
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
  const entityType = report.configuration.entityType
  console.log(`📊 Processing ${reportData.length} records for ${report.report_type}, entityType: ${entityType}`)
  console.log(`🔍 DEBUG: First 3 records sample:`, reportData.slice(0, 3))
  
  // Handle search terms separately
  if (entityType === 'searchTerms') {
    return await processSearchTermReport(supabase, reportData, profileId)
  }

  // Handle conversion paths separately
  if (entityType === 'conversionPaths') {
    return await processConversionPathReport(supabase, reportData, profileId)
  }

  const timeUnit = report.configuration.timeUnit
  let updated = 0
  let notFound = 0
  let errors = 0

  for (const record of reportData) {
    try {
      switch (entityType) {
        case 'campaigns': {
          const updateData: any = {
            // Update both legacy and attribution-windowed fields
            impressions: record.impressions || 0,
            impressions_7d: record.impressions || 0,
            impressions_14d: record.impressions || 0,
            clicks: record.clicks || 0,
            clicks_7d: record.clicks || 0,
            clicks_14d: record.clicks || 0,
            cost_legacy: record.cost || 0,
            cost_7d: record.cost || 0,
            cost_14d: record.cost || 0,
            attributed_sales_legacy: record.sales7d || 0,
            attributed_sales_7d: record.sales7d || 0,
            attributed_sales_14d: record.sales7d || 0,
            attributed_conversions_legacy: record.purchases7d || 0,
            attributed_conversions_7d: record.purchases7d || 0,
            attributed_conversions_14d: record.purchases7d || 0,
            updated_at: new Date().toISOString()
          }

          // First check if the campaign exists
          const { data: existing, error: checkError } = await supabase
            .from('campaigns')
            .select('id, amazon_campaign_id')
            .eq('amazon_campaign_id', record.campaignId)
            .eq('profile_id', profileId)
            .maybeSingle()

          if (!existing) {
            notFound++
            if (notFound <= 5) {
              console.warn(`⚠️ Campaign not found: amazon_campaign_id=${record.campaignId}, profile_id=${profileId}`)
            }
            break
          }

          const { data: updateResult, error, count } = await supabase
            .from('campaigns')
            .update(updateData)
            .eq('amazon_campaign_id', record.campaignId)
            .eq('profile_id', profileId)
            .select('id')

          if (error) {
            errors++
            if (errors <= 5) {
              console.error(`❌ Update failed for campaign ${record.campaignId}:`, error)
            }
          } else if (updateResult && updateResult.length > 0) {
            updated++
          }
          
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

            // Insert into campaign_performance_history for historical charts
            // This powers the Historical Performance Chart in Command Center
            if (existing?.id) {
              const spend = record.cost || 0
              const sales = record.sales7d || 0
              const clicks = record.clicks || 0
              const impressions = record.impressions || 0
              const orders = record.purchases7d || 0

              const { error: historyError } = await supabase
                .from('campaign_performance_history')
                .upsert({
                  campaign_id: existing.id,
                  date: record.date,
                  attribution_window: '7d',
                  impressions,
                  clicks,
                  spend,
                  sales,
                  orders,
                  acos: sales > 0 ? (spend / sales) * 100 : null,
                  roas: spend > 0 ? sales / spend : null,
                  ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
                  cpc: clicks > 0 ? spend / clicks : null,
                  conversion_rate: clicks > 0 ? (orders / clicks) * 100 : null
                }, {
                  onConflict: 'campaign_id,date,attribution_window'
                })

              if (historyError) {
                console.warn(`⚠️ Failed to upsert campaign_performance_history for ${existing.id}:`, historyError.message)
              }
            }
          }
          break
        }

        case 'adGroups': {
          // First check if the adgroup exists
          const { data: existingAdgroup, error: checkError } = await supabase
            .from('ad_groups')
            .select('id, amazon_adgroup_id')
            .eq('amazon_adgroup_id', record.adGroupId)
            .eq('profile_id', profileId)
            .maybeSingle()

          if (!existingAdgroup) {
            notFound++
            if (notFound <= 5) {
              console.warn(`⚠️ Ad group not found: amazon_adgroup_id=${record.adGroupId}, profile_id=${profileId}`)
            }
            break
          }

          const updateData: any = {
            // Update both legacy and attribution-windowed fields
            impressions: record.impressions || 0,
            impressions_7d: record.impressions || 0,
            impressions_14d: record.impressions || 0,
            clicks: record.clicks || 0,
            clicks_7d: record.clicks || 0,
            clicks_14d: record.clicks || 0,
            spend: record.cost || 0,
            spend_7d: record.cost || 0,
            spend_14d: record.cost || 0,
            sales: record.sales7d || 0,
            sales_7d: record.sales7d || 0,
            sales_14d: record.sales7d || 0,
            orders: record.purchases7d || 0,
            orders_7d: record.purchases7d || 0,
            orders_14d: record.purchases7d || 0,
            updated_at: new Date().toISOString()
          }

          const { error } = await supabase
            .from('ad_groups')
            .update(updateData)
            .eq('amazon_adgroup_id', record.adGroupId)
            .eq('profile_id', profileId)

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

            // Insert into adgroup_performance_history for historical data
            const spend = record.cost || 0
            const sales = record.sales7d || 0
            const clicks = record.clicks || 0
            const impressions = record.impressions || 0
            const orders = record.purchases7d || 0

            const { error: historyError } = await supabase
              .from('adgroup_performance_history')
              .upsert({
                adgroup_id: existingAdgroup.id,
                date: record.date,
                attribution_window: '7d',
                impressions,
                clicks,
                spend,
                sales,
                orders,
                acos: sales > 0 ? (spend / sales) * 100 : null,
                roas: spend > 0 ? sales / spend : null,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
                cpc: clicks > 0 ? spend / clicks : null,
                conversion_rate: clicks > 0 ? (orders / clicks) * 100 : null
              }, {
                onConflict: 'adgroup_id,date,attribution_window'
              })

            if (historyError) {
              console.warn(`⚠️ Failed to upsert adgroup_performance_history for ${existingAdgroup.id}:`, historyError.message)
            }
          }
          break
        }

        case 'targets': {
          const updateData: any = {
            // Update both legacy and attribution-windowed fields
            impressions: record.impressions || 0,
            impressions_7d: record.impressions || 0,
            impressions_14d: record.impressions || 0,
            clicks: record.clicks || 0,
            clicks_7d: record.clicks || 0,
            clicks_14d: record.clicks || 0,
            spend: record.cost || 0,
            spend_7d: record.cost || 0,
            spend_14d: record.cost || 0,
            sales: record.sales7d || 0,
            sales_7d: record.sales7d || 0,
            sales_14d: record.sales7d || 0,
            orders: record.purchases7d || 0,
            orders_7d: record.purchases7d || 0,
            orders_14d: record.purchases7d || 0,
            updated_at: new Date().toISOString()
          }

          const { error } = await supabase
            .from('targets')
            .update(updateData)
            .eq('amazon_target_id', record.targetId)
            .eq('profile_id', profileId)

          if (!error) updated++

          // Insert into fact_target_daily for historical data
          if (timeUnit === 'DAILY' && record.date) {
            const { error: historyError } = await supabase
              .from('fact_target_daily')
              .upsert({
                date: record.date,
                profile_id: profileId,
                campaign_id: record.campaignId || '',
                ad_group_id: record.adGroupId || '',
                target_id: record.targetId,
                target_type: record.targetingType || 'UNKNOWN',
                expression: record.targetingExpression ? { value: record.targetingExpression } : null,
                impressions: record.impressions || 0,
                clicks: record.clicks || 0,
                cost_micros: Math.round((record.cost || 0) * 1000000),
                attributed_conversions_7d: record.purchases7d || 0,
                attributed_sales_7d_micros: Math.round((record.sales7d || 0) * 1000000)
              }, {
                onConflict: 'date,profile_id,target_id'
              })

            if (historyError) {
              console.warn(`⚠️ Failed to upsert fact_target_daily for ${record.targetId}:`, historyError.message)
            }
          }
          break
        }

        case 'keywords': {
          const keywordId = record.keywordId || record.targetId // v3 API uses targetId for keywords
          
          // First check if the keyword exists
          const { data: existingKeyword, error: checkError } = await supabase
            .from('keywords')
            .select('id, amazon_keyword_id')
            .eq('amazon_keyword_id', keywordId)
            .eq('profile_id', profileId)
            .maybeSingle()

          if (!existingKeyword) {
            notFound++
            if (notFound <= 5) {
              console.warn(`⚠️ Keyword not found: amazon_keyword_id=${keywordId}, profile_id=${profileId}`)
            }
            break
          }

          const updateData: any = {
            // Update both legacy and attribution-windowed fields
            impressions: record.impressions || 0,
            impressions_7d: record.impressions || 0,
            impressions_14d: record.impressions || 0,
            clicks: record.clicks || 0,
            clicks_7d: record.clicks || 0,
            clicks_14d: record.clicks || 0,
            spend: record.cost || 0,
            spend_7d: record.cost || 0,
            spend_14d: record.cost || 0,
            sales: record.sales7d || 0,
            sales_7d: record.sales7d || 0,
            sales_14d: record.sales7d || 0,
            orders: record.purchases7d || 0,
            orders_7d: record.purchases7d || 0,
            orders_14d: record.purchases7d || 0,
            updated_at: new Date().toISOString()
          }

          const { error } = await supabase
            .from('keywords')
            .update(updateData)
            .eq('amazon_keyword_id', keywordId)
            .eq('profile_id', profileId)

          if (!error) updated++

          // Insert into keyword_performance_history for historical data
          if (timeUnit === 'DAILY' && record.date) {
            const spend = record.cost || 0
            const sales = record.sales7d || 0
            const clicks = record.clicks || 0
            const impressions = record.impressions || 0
            const orders = record.purchases7d || 0

            const { error: historyError } = await supabase
              .from('keyword_performance_history')
              .upsert({
                keyword_id: existingKeyword.id,
                date: record.date,
                attribution_window: '7d',
                impressions,
                clicks,
                spend,
                sales,
                orders,
                acos: sales > 0 ? (spend / sales) * 100 : null,
                roas: spend > 0 ? sales / spend : null,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
                cpc: clicks > 0 ? spend / clicks : null,
                conversion_rate: clicks > 0 ? (orders / clicks) * 100 : null
              }, {
                onConflict: 'keyword_id,date,attribution_window'
              })

            if (historyError) {
              console.warn(`⚠️ Failed to upsert keyword_performance_history for ${existingKeyword.id}:`, historyError.message)
            }
          }
          break
        }
      }
    } catch (error) {
      console.warn(`Failed to process record:`, error)
    }
  }

  console.log(`✅ Updated ${updated} of ${reportData.length} ${entityType} records`)
  console.log(`📊 DEBUG Summary: updated=${updated}, notFound=${notFound}, errors=${errors}`)
  
  if (notFound > 0) {
    console.warn(`⚠️ ${notFound} records had no matching entities - check if entity sync has completed`)
  }
  
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

        // Get profile_id from configuration (for search terms) or from connection
        let profileId = report.configuration?.profile_id
        let apiEndpoint = report.configuration?.api_endpoint

        // Fetch connection details if not in configuration
        if (!profileId || !apiEndpoint) {
          const { data: connection, error: connError } = await supabase
            .from('amazon_connections')
            .select('profile_id, advertising_api_endpoint')
            .eq('id', report.connection_id)
            .single()

          if (connError || !connection) {
            throw new Error('Failed to get connection details')
          }

          profileId = profileId || connection.profile_id
          apiEndpoint = apiEndpoint || connection.advertising_api_endpoint || 'https://advertising-api.amazon.com'
        }

        // Get access token - try to refresh if needed
        const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
        if (!encryptionKey) {
          throw new Error('ENCRYPTION_KEY not configured')
        }

        let accessToken: string
        let tokenData = await supabase.rpc('get_tokens_with_key', {
          p_profile_id: profileId,
          p_encryption_key: encryptionKey
        })

        if (tokenData.error || !tokenData.data || tokenData.data.length === 0) {
          throw new Error('Failed to get access token')
        }

        accessToken = tokenData.data[0].access_token

        // Check report status - will retry with token refresh if 401
        let reportStatus: ReportStatus
        try {
          reportStatus = await pollReportStatus(
            accessToken,
            profileId,
            report.report_id,
            apiEndpoint
          )
        } catch (error) {
          // If 401, try refreshing the token
          if (error instanceof Error && error.message.includes('401')) {
            console.log('🔄 Token expired, refreshing...')
            
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            
            const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/refresh-amazon-token`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ profileId: profileId })
            })
            
            if (!refreshResponse.ok) {
              const refreshError = await refreshResponse.text()
              throw new Error(`Token refresh failed: ${refreshError}`)
            }

            // Get new token
            tokenData = await supabase.rpc('get_tokens_with_key', {
              p_profile_id: profileId,
              p_encryption_key: encryptionKey
            })

            if (tokenData.error || !tokenData.data || tokenData.data.length === 0) {
              throw new Error('Failed to get refreshed token')
            }

            accessToken = tokenData.data[0].access_token

            // Retry with new token
            reportStatus = await pollReportStatus(
              accessToken,
              profileId,
              report.report_id,
              apiEndpoint
            )
          } else {
            throw error
          }
        }

        // Amazon v3 API returns 'COMPLETED' instead of 'SUCCESS'
        if ((reportStatus.status === 'SUCCESS' || reportStatus.status === 'COMPLETED') && reportStatus.url) {
          console.log(`✅ Report ${report.report_id} ready, downloading from ${reportStatus.url}`)
          
          // Download and process report
          const reportData = await downloadAndParseReport(reportStatus.url)
          console.log(`📥 Downloaded ${reportData.length} records for ${report.report_type}`)
          
          // Process the data
          const recordsUpdated = await processCompletedReport(
            supabase,
            report,
            reportData,
            report.connection_id,
            profileId
          )
          console.log(`✅ Updated ${recordsUpdated} records in database`)

          // Mark as completed
          const { error: completeError } = await supabase
            .from('pending_amazon_reports')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              download_url: reportStatus.url
            })
            .eq('id', report.id)

          if (completeError) {
            console.error(`Failed to mark report ${report.report_id} as completed:`, completeError)
          } else {
            console.log(`✅ Marked report ${report.report_id} as completed`)
          }

          results.push({ reportId: report.report_id, status: 'completed', records: reportData.length })
        } else if (reportStatus.status === 'FAILURE' || reportStatus.status === 'FATAL') {
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
