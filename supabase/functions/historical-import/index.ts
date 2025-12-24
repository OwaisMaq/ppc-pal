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

    // Validate date range (max 90 days)
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff > 90) {
      return new Response(
        JSON.stringify({ error: 'Date range cannot exceed 90 days' }),
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
    const metrics = {
      campaign: 'impressions,clicks,cost,purchases7d,sales7d',
      adgroup: 'impressions,clicks,cost,purchases7d,sales7d',
      keyword: 'impressions,clicks,cost,purchases7d,sales7d',
      target: 'impressions,clicks,cost,purchases7d,sales7d'
    }

    for (const reportType of reportTypes) {
      console.log(`📊 Creating ${reportType} performance report for ${startDate} to ${endDate}`)

      const reportBody = {
        startDate,
        endDate,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          groupBy: [reportType === 'campaign' ? 'campaign' : reportType === 'adgroup' ? 'adGroup' : reportType],
          columns: metrics[reportType as keyof typeof metrics]?.split(',') || [],
          reportTypeId: `sp${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`,
          timeUnit: 'SUMMARY',
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

      // Store report request in pending_amazon_reports
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
            historical: true
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
