
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchCampaignReports } from './reports.ts'
import { updateCampaignMetrics } from './metricsUpdater.ts'
import { refreshTokenIfNeeded } from './auth.ts'
import { fetchCampaignsFromRegion, storeCampaigns } from './campaigns.ts'
import { syncAdGroups } from './adgroups.ts'
import { validateConnection, validateProfileId } from './validation.ts'
import { getConnection, updateConnectionStatus, updateLastSyncTime } from './database.ts'
import { REGIONS, getBaseUrl } from './types.ts'

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
    console.log('=== AMAZON DATA SYNC STARTED ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Connection ID:', connectionId)
    console.log('User ID:', user.id)

    // Mark sync as starting
    await updateConnectionStatus(connectionId, 'active', supabase)

    // Get the connection details
    const connection = await getConnection(connectionId, user.id, supabase)

    // Enhanced connection validation
    try {
      validateConnection(connection)
    } catch (error) {
      console.error('=== CONNECTION VALIDATION FAILED ===')
      console.error('Error:', error.message)
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw error
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Amazon Client ID not configured in environment')
    }

    console.log('=== CONNECTION DETAILS ===')
    console.log('Profile ID:', connection.profile_id)
    console.log('Marketplace:', connection.marketplace_id)
    console.log('Status:', connection.status)
    console.log('Last sync:', connection.last_sync_at)

    // Handle token refresh with enhanced error handling
    console.log('=== TOKEN REFRESH CHECK ===')
    let accessToken;
    try {
      accessToken = await refreshTokenIfNeeded(connection, clientId, supabase)
    } catch (error) {
      console.error('Token refresh failed:', error.message)
      await updateConnectionStatus(connectionId, 'expired', supabase)
      throw new Error(`Token refresh failed: ${error.message}`)
    }

    // Enhanced campaign fetching with detailed region analysis
    let campaignsData = []
    let successfulRegion = null
    let regionResults = []

    console.log('=== FETCHING CAMPAIGNS FROM AMAZON API ===')
    for (const region of REGIONS) {
      console.log(`\n--- Trying region: ${region} ---`)
      
      const result = await fetchCampaignsFromRegion(
        accessToken,
        clientId,
        connection.profile_id,
        region
      )

      const regionResult = {
        region,
        success: false,
        campaignCount: 0,
        error: null
      }

      if (result && result.campaigns.length > 0) {
        campaignsData = result.campaigns
        successfulRegion = result.region
        regionResult.success = true
        regionResult.campaignCount = result.campaigns.length
        regionResults.push(regionResult)
        
        console.log(`✓ SUCCESS: Found ${campaignsData.length} campaigns in ${region} region`)
        break
      } else if (result && result.campaigns.length === 0) {
        console.log(`⚠ ${region} region returned 0 campaigns`)
        regionResult.error = 'No campaigns found'
      } else {
        console.log(`✗ ${region} region failed completely`)
        regionResult.error = 'API request failed'
      }
      
      regionResults.push(regionResult)
    }

    // Enhanced error reporting
    if (!successfulRegion || campaignsData.length === 0) {
      console.log('=== CAMPAIGN FETCH ANALYSIS ===')
      regionResults.forEach(result => {
        console.log(`${result.region}: ${result.success ? `✓ ${result.campaignCount} campaigns` : `✗ ${result.error}`}`)
      })
      
      const authErrors = regionResults.filter(r => r.error?.includes('auth') || r.error?.includes('UNAUTHORIZED')).length
      const noDataErrors = regionResults.filter(r => r.error === 'No campaigns found').length
      
      let errorMessage = 'No campaigns found in any region. '
      
      if (authErrors === REGIONS.length) {
        errorMessage += 'All regions returned authorization errors. This suggests: 1) The profile ID may be invalid or for a different marketplace, 2) The account lacks Amazon Advertising permissions, 3) The access token has expired, or 4) The profile is not set up for advertising in any of our supported regions.'
      } else if (noDataErrors > 0) {
        errorMessage += `Found advertising access in ${noDataErrors} region(s) but no campaigns exist. This is normal for new advertising accounts or accounts that haven't created campaigns yet.`
      } else {
        errorMessage += 'All API requests failed due to technical issues. This could be temporary Amazon API issues, network problems, or configuration issues.'
      }
      
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error(errorMessage)
    }

    // Store campaigns with enhanced logging
    console.log('=== STORING CAMPAIGNS ===')
    const { stored, campaignIds } = await storeCampaigns(
      campaignsData,
      connectionId,
      supabase
    )
    console.log(`✓ Stored ${stored} campaigns successfully`)

    // Fetch performance metrics with enhanced real data detection
    console.log('=== FETCHING PERFORMANCE METRICS ===')
    let metricsUpdated = 0
    let hasRealApiData = false
    
    if (campaignIds.length > 0) {
      try {
        const baseUrl = getBaseUrl(successfulRegion!)
        console.log(`Fetching metrics for ${campaignIds.length} campaigns from ${baseUrl}`)
        
        const metricsData = await fetchCampaignReports(
          accessToken,
          clientId,
          connection.profile_id,
          baseUrl,
          campaignIds
        )
        
        if (metricsData.length > 0) {
          // Check if we got real API data
          hasRealApiData = metricsData.some(metric => metric.fromAPI === true)
          
          console.log(`Processing ${metricsData.length} metrics records...`)
          console.log(`Real API data available: ${hasRealApiData}`)
          
          await updateCampaignMetrics(supabase, connectionId, metricsData)
          metricsUpdated = metricsData.length
          
          console.log(`✓ Updated metrics for ${metricsUpdated} campaigns`)
        } else {
          console.warn('No metrics data received from any Amazon API endpoint')
        }
      } catch (error) {
        console.error('=== METRICS UPDATE ERROR ===')
        console.error('Error details:', error)
        // Don't fail the entire sync for metrics errors
      }
    }

    // Sync ad groups
    console.log('=== SYNCING AD GROUPS ===')
    let adGroupsStored = 0
    if (successfulRegion && stored > 0) {
      try {
        adGroupsStored = await syncAdGroups(
          accessToken,
          clientId,
          connection.profile_id,
          successfulRegion,
          connectionId,
          supabase
        )
        console.log(`✓ Stored ${adGroupsStored} ad groups`)
      } catch (error) {
        console.error('Ad groups sync failed:', error)
        // Don't fail entire sync for ad group errors
      }
    }

    // Update sync completion
    await updateLastSyncTime(connectionId, supabase)
    await updateConnectionStatus(connectionId, 'active', supabase)

    console.log('=== SYNC COMPLETED SUCCESSFULLY ===')
    console.log('Summary:')
    console.log(`- Campaigns: ${stored}`)
    console.log(`- Metrics updated: ${metricsUpdated}`)
    console.log(`- Ad groups: ${adGroupsStored}`)
    console.log(`- Region: ${successfulRegion}`)
    console.log(`- Real API data: ${hasRealApiData}`)

    // Enhanced success response
    const message = stored > 0 
      ? `Sync completed successfully! Imported ${stored} campaigns and updated metrics for ${metricsUpdated} campaigns from ${successfulRegion} region.${hasRealApiData ? ' Real Amazon API data was successfully retrieved.' : ' Note: Only simulated data was available - this may indicate API limitations or account permissions.'}`
      : `Connection verified but no campaigns found. The Amazon Advertising account may be empty or campaigns may be in a different region. Profile ID ${connection.profile_id} is valid for ${successfulRegion} region.`

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        details: {
          campaignsStored: stored,
          metricsUpdated,
          adGroupsStored,
          region: successfulRegion,
          hasRealData: hasRealApiData,
          regionResults: regionResults.map(r => ({
            region: r.region,
            success: r.success,
            campaignCount: r.campaignCount
          }))
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== SYNC FAILED ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Sync failed. Check the function logs for detailed error information. Common issues: expired tokens, invalid profile IDs, accounts without campaigns, or insufficient Amazon Advertising permissions.',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
