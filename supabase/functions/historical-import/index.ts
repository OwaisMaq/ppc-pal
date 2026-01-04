import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HistoricalImportRequest {
  profileId: string
  startDate: string
  endDate: string
  reportTypes?: string[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { profileId, startDate, endDate, reportTypes = ['campaign', 'adgroup', 'keyword', 'target'] }: HistoricalImportRequest = await req.json()

    console.log(`📥 Historical import request from user ${user.id} for profile ${profileId}, dates: ${startDate} to ${endDate}`)

    // Create service role client for admin operations (before RLS-protected queries)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user owns this profile using service role client
    const { data: connection, error: connError } = await supabaseAdmin
      .from('amazon_connections')
      .select('id, profile_id, access_token_encrypted, advertising_api_endpoint, reporting_api_version, user_id')
      .eq('profile_id', profileId)
      .eq('user_id', user.id)
      .single()

    if (connError || !connection) {
      console.error('Connection lookup error:', connError)
      return new Response(
        JSON.stringify({ error: 'Profile not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate date range (max 365 days)
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff > 365) {
      return new Response(
        JSON.stringify({ error: 'Date range cannot exceed 365 days' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (daysDiff < 0) {
      return new Response(
        JSON.stringify({ error: 'End date must be after start date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service role client already created above

    // Get encryption key
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: 'ENCRYPTION_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get decrypted Amazon access token using RPC
    const { data: tokensArray, error: tokenError } = await supabaseAdmin
      .rpc('get_tokens_with_key', {
        p_profile_id: profileId,
        p_encryption_key: encryptionKey
      })

    if (tokenError || !tokensArray || tokensArray.length === 0) {
      console.error('Token retrieval error:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Amazon credentials not available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokens = tokensArray[0]
    if (!tokens?.access_token) {
      return new Response(
        JSON.stringify({ error: 'No valid access token found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = tokens.access_token
    const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api.amazon.com'
    const apiVersion = connection.reporting_api_version || 'v3'

    // Create report requests for each report type
    const reportRequests = []
    
    // Amazon Ads API v3 report configuration
    const reportConfigs: Record<string, { reportTypeId: string; groupBy: string[]; columns: string[] }> = {
      campaign: {
        reportTypeId: 'spCampaigns',
        groupBy: ['campaign'],
        columns: ['impressions', 'clicks', 'cost', 'purchases7d', 'sales7d', 'campaignId', 'campaignName', 'campaignStatus', 'date']
      },
      adgroup: {
        reportTypeId: 'spAdvertisedProduct',
        groupBy: ['advertiser'],
        columns: ['impressions', 'clicks', 'cost', 'purchases7d', 'sales7d', 'campaignId', 'adGroupId', 'adGroupName', 'date']
      },
      keyword: {
        reportTypeId: 'spSearchTerm',
        groupBy: ['searchTerm'],
        columns: ['impressions', 'clicks', 'cost', 'purchases7d', 'sales7d', 'campaignId', 'adGroupId', 'keywordId', 'searchTerm', 'date']
      },
      target: {
        reportTypeId: 'spTargeting',
        groupBy: ['targeting'],
        columns: ['impressions', 'clicks', 'cost', 'purchases7d', 'sales7d', 'campaignId', 'adGroupId', 'targeting', 'keywordType', 'date']
      }
    }

    // Map report types to entityType values expected by ams-report-poller
    const entityTypeMap: Record<string, string> = {
      campaign: 'campaigns',
      adgroup: 'adGroups',
      keyword: 'searchTerms', // keyword report is actually search terms
      target: 'targets'
    }

    for (const reportType of reportTypes) {
      const config = reportConfigs[reportType]
      if (!config) {
        console.warn(`Unknown report type: ${reportType}`)
        continue
      }

      const entityType = entityTypeMap[reportType]
      console.log(`📊 Creating ${reportType} performance report (entityType: ${entityType}) for ${startDate} to ${endDate}`)

      const reportBody = {
        startDate,
        endDate,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          groupBy: config.groupBy,
          columns: config.columns,
          reportTypeId: config.reportTypeId,
          timeUnit: 'DAILY',
          format: 'GZIP_JSON'
        }
      }

      // Request report from Amazon Ads API
      const reportResponse = await fetch(
        `${apiEndpoint}/reporting/reports`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID') || '',
            'Amazon-Advertising-API-Scope': profileId,
            'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
          },
          body: JSON.stringify(reportBody)
        }
      )

      if (!reportResponse.ok) {
        const errorText = await reportResponse.text()
        console.error(`❌ Failed to create ${reportType} report:`, errorText)
        continue
      }

      const reportData = await reportResponse.json()
      console.log(`✅ Created ${reportType} report:`, reportData.reportId)

      // Store report request in pending_amazon_reports with full configuration
      // This is critical for ams-report-poller to process correctly
      const { error: insertError } = await supabaseAdmin
        .from('pending_amazon_reports')
        .insert({
          report_id: reportData.reportId,
          report_type: `${reportType}_performance`,
          connection_id: connection.id,
          status: 'pending',
          configuration: {
            startDate,
            endDate,
            historical: true,
            entityType, // Required by ams-report-poller
            timeUnit: 'DAILY', // Required for daily data processing
            columns: config.columns, // Track which columns were requested
            profile_id: profileId
          }
        })

      if (insertError) {
        console.error(`❌ Failed to store report request:`, insertError)
      } else {
        reportRequests.push({
          reportType,
          reportId: reportData.reportId,
          status: reportData.status
        })
      }
    }

    console.log(`✅ Created ${reportRequests.length} historical report requests`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Historical import started for ${daysDiff} days`,
        reportsCreated: reportRequests.length,
        reports: reportRequests,
        dateRange: {
          startDate,
          endDate,
          days: daysDiff
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Historical import error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to start historical import',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
