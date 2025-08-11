
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { connectionId } = await req.json()
    console.log('Syncing data for connection:', connectionId)

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
    if (!clientId) {
      throw new Error('Amazon Client ID not configured')
    }

    // Check if token needs refresh
    const now = new Date()
    const expiresAt = new Date(connection.token_expires_at)
    
    let accessToken = connection.access_token
    
    // If token expires within 5 minutes, try to refresh it
    const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds
    if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
      console.log('Token expired or expiring soon, attempting refresh...')
      
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
      
      if (!clientSecret) {
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'error',
            setup_required_reason: 'Missing Amazon client secret'
          })
          .eq('id', connectionId)
        
        throw new Error('Amazon client secret not configured')
      }

      try {
        console.log('Attempting token refresh...')
        
        const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: connection.refresh_token,
            client_id: clientId!,
            client_secret: clientSecret,
          }),
        })

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json()
          const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
          
          // Update connection with new tokens
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
        
        // Mark as expired if refresh fails
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

    // Use region-specific API endpoint
    const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api.amazon.com'
    console.log('Using API endpoint:', apiEndpoint)

    // Helper utilities for Reporting v3
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    const createReport = async (payload: Record<string, unknown>) => {
      const resp = await fetch(`${apiEndpoint}/reporting/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (resp.status === 403) {
        // Permission issue for this product/report
        const errText = await resp.text()
        console.warn('Permission issue creating report:', errText)
        await supabase
          .from('amazon_connections')
          .update({ status: 'warning', setup_required_reason: 'Insufficient permissions for requested report. Please ensure Sponsored Products reporting access.' })
          .eq('id', connectionId)
        return null
      }

      if (resp.status === 425) {
        // Duplicate request - extract the existing reportId from response and reuse it
        const errText = await resp.text()
        let reportId = ''
        try {
          const parsed = JSON.parse(errText)
          const detail: string = parsed?.detail || ''
          const match = detail.match(/duplicate of\s*:\s*([a-f0-9-]+)/i)
          if (match?.[1]) reportId = match[1]
        } catch {
          const match = errText.match(/duplicate of\s*:\s*([a-f0-9-]+)/i)
          if (match?.[1]) reportId = match[1]
        }
        if (reportId) {
          console.warn('Duplicate report request detected. Reusing reportId:', reportId)
          return { reportId, reused: true }
        }
        throw new Error(`Failed to create report: 425 ${errText}`)
      }

      if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(`Failed to create report: ${resp.status} ${errText}`)
      }

      const json = await resp.json()
      return json
    }

    const pollReport = async (reportId: string, timeoutMs = 360000, intervalMs = 5000) => {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        const statusResp = await fetch(`${apiEndpoint}/reporting/reports/${reportId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': connection.profile_id,
          },
        })
        if (!statusResp.ok) {
          const errText = await statusResp.text()
          throw new Error(`Failed to poll report: ${statusResp.status} ${errText}`)
        }
        const statusData = await statusResp.json()
        const status = statusData.status
        if (status === 'SUCCESS') {
          const location = statusData.location || statusData.url
          if (!location) throw new Error('Report success but no download location provided')
          return location
        }
        if (status === 'FAILURE') {
          throw new Error(`Report generation failed: ${JSON.stringify(statusData)}`)
        }
        // Occasional debug logging
        if ((Date.now() - start) % (intervalMs * 6) < intervalMs) {
          console.log(`Polling report ${reportId} - status: ${status}`)
        }
        await sleep(intervalMs)
      }
      throw new Error('Report polling timed out')
    }

    const downloadReportJson = async (downloadUrl: string) => {
      const reportResp = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
        },
      })
      if (!reportResp.ok) {
        const errText = await reportResp.text()
        throw new Error(`Failed to download report: ${reportResp.status} ${errText}`)
      }

      // Most reports are GZIP_JSON; handle both gzip and plain JSON
      const encoding = reportResp.headers.get('content-encoding') || ''
      const contentType = reportResp.headers.get('content-type') || ''

      if (encoding.includes('gzip') || contentType.includes('gzip')) {
        const body = reportResp.body
        if (!body) throw new Error('Empty report body')
        // Decompress via DecompressionStream
        const ds = new DecompressionStream('gzip')
        const stream = body.pipeThrough(ds)
        const text = await new Response(stream).text()
        return JSON.parse(text)
      } else {
        // Plain JSON
        const text = await reportResp.text()
        try {
          return JSON.parse(text)
        } catch (e) {
          console.error('Report parse error, content:', text.slice(0, 500))
          throw e
        }
      }
    }

    // Prepare date range for performance data (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const reportStartDate = startDate.toISOString().split('T')[0]
    const reportEndDate = endDate.toISOString().split('T')[0]

    // Build SP reports (Campaigns, Ad Groups, Keywords)
    // Note: We are focusing on SP first; extendable to SB/SD similarly
    const spCampaignPayload = {
      startDate: reportStartDate,
      endDate: reportEndDate,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          reportTypeId: 'spCampaigns',
          timeUnit: 'SUMMARY',
          format: 'GZIP_JSON',
          groupBy: ['campaign'],
          columns: [
            'impressions', 'clicks', 'spend',
            'sales14d', 'purchases14d'
          ],
        },
    }

    const spAdGroupPayload = {
      startDate: reportStartDate,
      endDate: reportEndDate,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          reportTypeId: 'spAdGroups',
          timeUnit: 'SUMMARY',
          format: 'GZIP_JSON',
          groupBy: ['campaign', 'adGroup'],
          columns: [
            'impressions', 'clicks', 'spend',
            'sales14d', 'purchases14d'
          ],
        },
    }

    const spKeywordPayload = {
      startDate: reportStartDate,
      endDate: reportEndDate,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          reportTypeId: 'spKeywords',
          timeUnit: 'SUMMARY',
          format: 'GZIP_JSON',
          groupBy: ['campaign', 'adGroup', 'keyword'],
          columns: [
            'impressions', 'clicks', 'spend',
            'sales14d', 'purchases14d'
          ],
        },
    }

    console.log('Creating SP Campaign report...')
    const spCampaignCreate = await createReport(spCampaignPayload)

    let spCampaignRows: any[] = []
    if (spCampaignCreate?.reportId) {
      const location = await pollReport(spCampaignCreate.reportId)
      spCampaignRows = await downloadReportJson(location)
      console.log('SP Campaign rows:', spCampaignRows.length)
    } else {
      console.warn('SP Campaign report not created (permissions?) — skipping')
    }

    console.log('Creating SP Ad Group report...')
    const spAdGroupCreate = await createReport(spAdGroupPayload)

    let spAdGroupRows: any[] = []
    if (spAdGroupCreate?.reportId) {
      const location = await pollReport(spAdGroupCreate.reportId)
      spAdGroupRows = await downloadReportJson(location)
      console.log('SP Ad Group rows:', spAdGroupRows.length)
    } else {
      console.warn('SP Ad Group report not created (permissions?) — skipping')
    }

    console.log('Creating SP Keyword report...')
    const spKeywordCreate = await createReport(spKeywordPayload)

    let spKeywordRows: any[] = []
    if (spKeywordCreate?.reportId) {
      const location = await pollReport(spKeywordCreate.reportId)
      spKeywordRows = await downloadReportJson(location)
      console.log('SP Keyword rows:', spKeywordRows.length)
    } else {
      console.warn('SP Keyword report not created (permissions?) — skipping')
    }

    // Upsert campaigns first
    const campaignUpserts = (spCampaignRows || []).map((r: any) => {
      const c = r.campaign || {};
      const campaignId = (c.id ?? r.campaignId)?.toString() || '';
      const campaignName = c.name ?? r.campaignName ?? (campaignId ? `Campaign ${campaignId}` : 'Unknown Campaign');
      return {
        connection_id: connectionId,
        amazon_campaign_id: campaignId,
        name: campaignName,
        campaign_type: 'SPONSORED_PRODUCTS',
        targeting_type: null,
        status: 'enabled',
        daily_budget: null,
        start_date: null,
        end_date: null,
        impressions: parseInt((r.impressions ?? '0').toString()),
        clicks: parseInt((r.clicks ?? '0').toString()),
        spend: parseFloat((r.spend ?? r.cost ?? '0').toString()),
        sales: parseFloat((r.sales14d ?? r.attributedSales14d ?? '0').toString()),
        orders: parseInt((r.purchases14d ?? r.attributedUnitsOrdered14d ?? '0').toString()),
        last_updated: new Date().toISOString(),
      }
    }).filter((r: any) => !!r.amazon_campaign_id)

    let campaignMap = new Map<string, string>() // amazon_campaign_id -> id
    if (campaignUpserts.length > 0) {
      const { data: upsertedCampaigns, error: upsertCampaignsError } = await supabase
        .from('campaigns')
        .upsert(campaignUpserts, { onConflict: 'connection_id, amazon_campaign_id' })
        .select('id, amazon_campaign_id')
      if (upsertCampaignsError) {
        console.error('Upsert campaigns error:', upsertCampaignsError)
      } else {
        for (const c of upsertedCampaigns || []) {
          campaignMap.set(String(c.amazon_campaign_id), c.id)
        }
      }
    }

    // Upsert ad groups using campaign map
    const adGroupUpserts = (spAdGroupRows || []).map((r: any) => {
      const c = r.campaign || {};
      const ag = r.adGroup || {};
      const campaignAmazonId = (c.id ?? r.campaignId)?.toString() || '';
      const adGroupAmazonId = (ag.id ?? r.adGroupId)?.toString() || '';
      return {
        campaign_id: campaignMap.get(campaignAmazonId) || null,
        amazon_adgroup_id: adGroupAmazonId,
        name: ag.name ?? r.adGroupName ?? (adGroupAmazonId ? `Ad Group ${adGroupAmazonId}` : 'Unknown Ad Group'),
        status: 'enabled',
        default_bid: null,
        impressions: parseInt((r.impressions ?? '0').toString()),
        clicks: parseInt((r.clicks ?? '0').toString()),
        spend: parseFloat((r.spend ?? r.cost ?? '0').toString()),
        sales: parseFloat((r.sales14d ?? r.attributedSales14d ?? '0').toString()),
        orders: parseInt((r.purchases14d ?? r.attributedUnitsOrdered14d ?? '0').toString()),
        last_updated: new Date().toISOString(),
      }
    }).filter((r: any) => r.campaign_id)

    let adGroupMap = new Map<string, string>() // amazon_adgroup_id -> id
    if (adGroupUpserts.length > 0) {
      const { data: upsertedAdGroups, error: upsertAdGroupsError } = await supabase
        .from('ad_groups')
        .upsert(adGroupUpserts, { onConflict: 'campaign_id, amazon_adgroup_id' })
        .select('id, amazon_adgroup_id')
      if (upsertAdGroupsError) {
        console.error('Upsert ad groups error:', upsertAdGroupsError)
      } else {
        for (const ag of upsertedAdGroups || []) {
          adGroupMap.set(String(ag.amazon_adgroup_id), ag.id)
        }
      }
    }

    // Upsert keywords using ad group map
    const keywordUpserts = (spKeywordRows || []).map((r: any) => {
      const ag = r.adGroup || {};
      const k = r.keyword || {};
      const adGroupAmazonId = (ag.id ?? r.adGroupId)?.toString() || '';
      const keywordAmazonId = (k.id ?? r.keywordId)?.toString() || '';
      const keywordText = k.text ?? r.keywordText ?? (keywordAmazonId ? `Keyword ${keywordAmazonId}` : 'Unknown Keyword');
      const matchType = (k.matchType ?? r.matchType ?? 'exact').toString().toLowerCase();
      return {
        adgroup_id: adGroupMap.get(adGroupAmazonId) || null,
        amazon_keyword_id: keywordAmazonId,
        keyword_text: keywordText,
        match_type: matchType,
        bid: null,
        status: 'enabled',
        impressions: parseInt((r.impressions ?? '0').toString()),
        clicks: parseInt((r.clicks ?? '0').toString()),
        spend: parseFloat((r.spend ?? r.cost ?? '0').toString()),
        sales: parseFloat((r.sales14d ?? r.attributedSales14d ?? '0').toString()),
        orders: parseInt((r.purchases14d ?? r.attributedUnitsOrdered14d ?? '0').toString()),
        last_updated: new Date().toISOString(),
      }
    }).filter((r: any) => r.adgroup_id)

    if (keywordUpserts.length > 0) {
      const { error: upsertKeywordsError } = await supabase
        .from('keywords')
        .upsert(keywordUpserts, { onConflict: 'adgroup_id, amazon_keyword_id' })
      if (upsertKeywordsError) {
        console.error('Upsert keywords error:', upsertKeywordsError)
      }
    }

    // If no reports could be created due to permissions, provide clear signal
    if (spCampaignCreate === null && spAdGroupCreate === null && spKeywordCreate === null) {
      throw new Error('No SP reports could be created due to insufficient permissions.')
    }


    // Update last sync time
    await supabase
      .from('amazon_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connectionId)

    console.log('Data sync completed successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Data sync completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
