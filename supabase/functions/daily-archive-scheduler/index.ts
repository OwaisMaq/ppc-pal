import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Daily Archive Scheduler
 * 
 * This function runs daily (via cron) to ensure all historical data is captured
 * before it falls out of Amazon's 60-95 day retention window.
 * 
 * It requests performance reports for the maximum retention window for all entity types
 * and updates the archive_status table to track data coverage.
 */

const REPORT_CONFIGS = [
  {
    entityType: 'campaigns',
    reportType: 'campaign_performance',
    columns: [
      'campaignId', 'date', 'impressions', 'clicks', 'cost',
      'purchases7d', 'sales7d', 'purchases14d', 'sales14d'
    ]
  },
  {
    entityType: 'adGroups',
    reportType: 'adgroup_performance',
    columns: [
      'adGroupId', 'campaignId', 'date', 'impressions', 'clicks', 'cost',
      'purchases7d', 'sales7d', 'purchases14d', 'sales14d'
    ]
  },
  {
    entityType: 'keywords',
    reportType: 'keyword_performance',
    columns: [
      'keywordId', 'adGroupId', 'campaignId', 'date', 'impressions', 'clicks', 'cost',
      'purchases7d', 'sales7d', 'purchases14d', 'sales14d'
    ]
  },
  {
    entityType: 'targets',
    reportType: 'target_performance',
    columns: [
      'targetId', 'adGroupId', 'campaignId', 'date', 'impressions', 'clicks', 'cost',
      'purchases7d', 'sales7d', 'purchases14d', 'sales14d', 'targetingType', 'targetingExpression'
    ]
  }
]

// Amazon's typical data retention is ~60-95 days, we'll request 60 days to be safe
const ARCHIVE_WINDOW_DAYS = 60

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Get date range for archiving (last 60 days, ending yesterday to ensure data is complete)
function getArchiveDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() - 1) // Yesterday
  
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - ARCHIVE_WINDOW_DAYS)
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
}

// Chunk date range into smaller periods (max 31 days per API call)
function chunkDateRange(startDate: string, endDate: string, maxDays: number = 31): Array<{ startDate: string; endDate: string }> {
  const chunks: Array<{ startDate: string; endDate: string }> = []
  let currentStart = new Date(startDate)
  const end = new Date(endDate)
  
  while (currentStart < end) {
    const chunkEnd = new Date(currentStart)
    chunkEnd.setDate(chunkEnd.getDate() + maxDays - 1)
    
    if (chunkEnd > end) {
      chunkEnd.setTime(end.getTime())
    }
    
    chunks.push({
      startDate: formatDate(currentStart),
      endDate: formatDate(chunkEnd)
    })
    
    currentStart = new Date(chunkEnd)
    currentStart.setDate(currentStart.getDate() + 1)
  }
  
  return chunks
}

async function createReportRequest(
  accessToken: string,
  profileId: string,
  apiEndpoint: string,
  config: typeof REPORT_CONFIGS[0],
  dateRange: { startDate: string; endDate: string }
): Promise<string | null> {
  const clientId = Deno.env.get('AMAZON_CLIENT_ID')
  
  const requestBody = {
    name: `Daily Archive - ${config.entityType} - ${dateRange.startDate} to ${dateRange.endDate}`,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    configuration: {
      adProduct: 'SPONSORED_PRODUCTS',
      groupBy: [config.entityType === 'campaigns' ? 'campaign' : 
                config.entityType === 'adGroups' ? 'adGroup' :
                config.entityType === 'keywords' ? 'targeting' : 'targeting'],
      columns: config.columns,
      reportTypeId: 'spCampaigns',
      timeUnit: 'DAILY',
      format: 'GZIP_JSON'
    }
  }

  try {
    const response = await fetch(`${apiEndpoint}/reporting/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId!,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.createasyncreportrequest.v3+json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Failed to create ${config.entityType} report: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()
    console.log(`✅ Created ${config.entityType} report: ${data.reportId}`)
    return data.reportId
  } catch (error) {
    console.error(`❌ Error creating ${config.entityType} report:`, error)
    return null
  }
}

async function updateArchiveStatus(
  supabase: any,
  profileId: string
): Promise<void> {
  // Update archive_status for each entity type based on actual data in history tables
  const entityQueries = [
    {
      entityType: 'campaigns',
      query: `
        SELECT 
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          COUNT(*) as total_records
        FROM campaign_performance_history cph
        JOIN campaigns c ON cph.campaign_id = c.id
        WHERE c.profile_id = '${profileId}'
      `
    },
    {
      entityType: 'adGroups', 
      query: `
        SELECT 
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          COUNT(*) as total_records
        FROM adgroup_performance_history aph
        JOIN ad_groups ag ON aph.adgroup_id = ag.id
        WHERE ag.profile_id = '${profileId}'
      `
    },
    {
      entityType: 'keywords',
      query: `
        SELECT 
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          COUNT(*) as total_records
        FROM keyword_performance_history kph
        JOIN keywords k ON kph.keyword_id = k.id
        WHERE k.profile_id = '${profileId}'
      `
    },
    {
      entityType: 'targets',
      query: `
        SELECT 
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          COUNT(*) as total_records
        FROM fact_target_daily
        WHERE profile_id = '${profileId}'
      `
    },
    {
      entityType: 'searchTerms',
      query: `
        SELECT 
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          COUNT(*) as total_records
        FROM fact_search_term_daily
        WHERE profile_id = '${profileId}'
      `
    }
  ]

  for (const { entityType, query } of entityQueries) {
    try {
      // Use a simpler approach - query the history tables directly
      let earliestDate = null
      let latestDate = null
      let totalRecords = 0

      if (entityType === 'campaigns') {
        const { data } = await supabase
          .from('campaign_performance_history')
          .select('date, campaign_id')
          .order('date', { ascending: true })
          .limit(1)
        
        const { data: latest } = await supabase
          .from('campaign_performance_history')
          .select('date')
          .order('date', { ascending: false })
          .limit(1)

        const { count } = await supabase
          .from('campaign_performance_history')
          .select('id', { count: 'exact', head: true })

        earliestDate = data?.[0]?.date
        latestDate = latest?.[0]?.date
        totalRecords = count || 0
      } else if (entityType === 'searchTerms') {
        const { data } = await supabase
          .from('fact_search_term_daily')
          .select('date')
          .eq('profile_id', profileId)
          .order('date', { ascending: true })
          .limit(1)
        
        const { data: latest } = await supabase
          .from('fact_search_term_daily')
          .select('date')
          .eq('profile_id', profileId)
          .order('date', { ascending: false })
          .limit(1)

        const { count } = await supabase
          .from('fact_search_term_daily')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId)

        earliestDate = data?.[0]?.date
        latestDate = latest?.[0]?.date
        totalRecords = count || 0
      } else if (entityType === 'targets') {
        const { data } = await supabase
          .from('fact_target_daily')
          .select('date')
          .eq('profile_id', profileId)
          .order('date', { ascending: true })
          .limit(1)
        
        const { data: latest } = await supabase
          .from('fact_target_daily')
          .select('date')
          .eq('profile_id', profileId)
          .order('date', { ascending: false })
          .limit(1)

        const { count } = await supabase
          .from('fact_target_daily')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId)

        earliestDate = data?.[0]?.date
        latestDate = latest?.[0]?.date
        totalRecords = count || 0
      }

      // Upsert archive status
      await supabase
        .from('archive_status')
        .upsert({
          profile_id: profileId,
          entity_type: entityType,
          earliest_date: earliestDate,
          latest_date: latestDate,
          total_records: totalRecords,
          last_archived_at: new Date().toISOString()
        }, {
          onConflict: 'profile_id,entity_type'
        })

      console.log(`📊 Updated archive_status for ${entityType}: ${totalRecords} records from ${earliestDate} to ${latestDate}`)
    } catch (error) {
      console.error(`❌ Failed to update archive_status for ${entityType}:`, error)
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')!

    console.log('🗓️ Daily Archive Scheduler starting...')

    // Parse request body for optional filtering
    let targetProfileId: string | null = null
    let updateStatusOnly = false
    
    try {
      const body = await req.json()
      targetProfileId = body.profileId || null
      updateStatusOnly = body.updateStatusOnly || false
    } catch {
      // No body provided, will process all profiles
    }

    // Fetch all active Amazon connections
    let query = supabase
      .from('amazon_connections')
      .select('id, profile_id, user_id, advertising_api_endpoint')
      .eq('status', 'active')

    if (targetProfileId) {
      query = query.eq('profile_id', targetProfileId)
    }

    const { data: connections, error: connectionsError } = await query

    if (connectionsError) {
      throw new Error(`Failed to fetch connections: ${connectionsError.message}`)
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active connections to archive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📂 Processing ${connections.length} connections for archiving`)

    const results: any[] = []
    const dateRange = getArchiveDateRange()
    const dateChunks = chunkDateRange(dateRange.startDate, dateRange.endDate)

    console.log(`📅 Archive date range: ${dateRange.startDate} to ${dateRange.endDate} (${dateChunks.length} chunks)`)

    for (const connection of connections) {
      try {
        const profileId = connection.profile_id
        const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api.amazon.com'

        console.log(`\n🔄 Processing profile: ${profileId}`)

        // Always update archive status to reflect current data
        await updateArchiveStatus(supabase, profileId)

        if (updateStatusOnly) {
          results.push({ profileId, status: 'status_updated' })
          continue
        }

        // Get access token
        const { data: tokenData, error: tokenError } = await supabase.rpc('get_tokens_with_key', {
          p_profile_id: profileId,
          p_encryption_key: encryptionKey
        })

        if (tokenError || !tokenData || tokenData.length === 0) {
          console.error(`❌ Failed to get token for profile ${profileId}`)
          results.push({ profileId, error: 'Failed to get access token' })
          continue
        }

        const accessToken = tokenData[0].access_token
        let reportsCreated = 0

        // Create reports for each entity type and date chunk
        for (const config of REPORT_CONFIGS) {
          for (const chunk of dateChunks) {
            const reportId = await createReportRequest(
              accessToken,
              profileId,
              apiEndpoint,
              config,
              chunk
            )

            if (reportId) {
              // Insert into pending_amazon_reports for processing by ams-report-poller
              const { error: insertError } = await supabase
                .from('pending_amazon_reports')
                .insert({
                  connection_id: connection.id,
                  report_id: reportId,
                  report_type: config.reportType,
                  status: 'pending',
                  configuration: {
                    entityType: config.entityType,
                    dateRange: chunk,
                    timeUnit: 'DAILY',
                    columns: config.columns,
                    api_endpoint: apiEndpoint,
                    profile_id: profileId,
                    source: 'daily_archive'
                  }
                })

              if (insertError) {
                console.error(`❌ Failed to insert pending report:`, insertError)
              } else {
                reportsCreated++
              }
            }
          }
        }

        console.log(`✅ Created ${reportsCreated} archive reports for profile ${profileId}`)
        results.push({ profileId, reportsCreated })

      } catch (error) {
        console.error(`❌ Error processing connection ${connection.id}:`, error)
        results.push({ 
          profileId: connection.profile_id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    const summary = {
      processedProfiles: results.length,
      totalReportsCreated: results.reduce((sum, r) => sum + (r.reportsCreated || 0), 0),
      errors: results.filter(r => r.error).length,
      dateRange,
      results
    }

    console.log('\n📊 Archive Summary:', JSON.stringify(summary, null, 2))

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Daily Archive Scheduler error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
