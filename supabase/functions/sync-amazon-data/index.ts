
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
    console.log('=== Starting Amazon Data Sync ===')
    console.log('Connection ID:', connectionId)
    console.log('User ID:', user.id)

    // Get the connection details
    const connection = await getConnection(connectionId, user.id, supabase)

    // Validate connection
    try {
      validateConnection(connection)
    } catch (error) {
      console.error('Connection validation failed:', error.message)
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw error
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Amazon Client ID not configured')
    }

    console.log('Using profile ID:', connection.profile_id)
    console.log('Marketplace:', connection.marketplace_id)

    // Handle token refresh if needed
    const accessToken = await refreshTokenIfNeeded(connection, clientId, supabase)

    // Sync campaigns - try different API regions
    let campaignsData = []
    let successfulRegion = null
    let totalRegionsTried = 0
    let authErrors = 0

    console.log('=== Fetching Campaigns ===')
    for (const region of REGIONS) {
      totalRegionsTried++
      console.log(`Trying region ${totalRegionsTried}/${REGIONS.length}: ${region}`)
      
      const result = await fetchCampaignsFromRegion(
        accessToken,
        clientId,
        connection.profile_id,
        region
      )

      if (result && result.campaigns.length > 0) {
        campaignsData = result.campaigns
        successfulRegion = result.region
        console.log(`✓ Successfully fetched ${campaignsData.length} campaigns from ${region} region`)
        break
      } else if (result && result.campaigns.length === 0) {
        console.log(`⚠ ${region} region returned 0 campaigns - profile may not have campaigns in this region`)
      } else {
        console.log(`✗ Failed to fetch from ${region} region`)
        authErrors++
      }
    }

    // Provide detailed feedback based on results
    if (!successfulRegion && campaignsData.length === 0) {
      const errorDetails = [];
      
      if (authErrors === REGIONS.length) {
        errorDetails.push('All regions returned authorization errors - the profile ID may be invalid or expired');
      } else if (authErrors > 0) {
        errorDetails.push(`${authErrors}/${REGIONS.length} regions had authorization issues`);
      }
      
      if (totalRegionsTried === REGIONS.length) {
        errorDetails.push('All available regions have been tried');
      }
      
      const detailedMessage = `No campaigns found in any region. ${errorDetails.join('. ')}. This could mean: 1) The Amazon Advertising account has no active campaigns, 2) The profile ID is for a region not covered by our API endpoints, 3) The account lacks proper advertising permissions, or 4) The access token has expired or been revoked.`;
      
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error(detailedMessage)
    }

    // Store campaigns only if we have them
    let campaignsStored = 0
    let campaignIds: string[] = []
    
    if (campaignsData.length > 0) {
      console.log('=== Storing Campaigns ===')
      const { stored, campaignIds: ids } = await storeCampaigns(
        campaignsData,
        connectionId,
        supabase
      )
      campaignsStored = stored
      campaignIds = ids
      console.log(`✓ Stored ${campaignsStored} campaigns`)
    } else {
      console.log('⚠ No campaigns to store')
    }

    // Fetch and update performance metrics
    console.log('=== Fetching Performance Metrics ===')
    let metricsUpdated = 0;
    
    if (campaignIds.length > 0) {
      try {
        console.log(`Fetching metrics for ${campaignIds.length} campaigns...`)
        const baseUrl = getBaseUrl(successfulRegion!)
        const metricsData = await fetchCampaignReports(
          accessToken,
          clientId,
          connection.profile_id,
          baseUrl,
          campaignIds
        )
        
        if (metricsData.length > 0) {
          console.log(`Processing ${metricsData.length} metrics records...`)
          await updateCampaignMetrics(supabase, connectionId, metricsData)
          metricsUpdated = metricsData.length;
          console.log(`✓ Updated metrics for ${metricsUpdated} campaigns`)
        } else {
          console.warn('No metrics data received from API - using campaign data as baseline')
        }
      } catch (error) {
        console.error('Error in metrics update process:', error)
        // Don't fail the entire sync for metrics errors
      }
    } else {
      console.log('No campaigns available for metrics update')
    }

    // Sync ad groups for each campaign
    console.log('=== Syncing Ad Groups ===')
    let adGroupsStored = 0
    if (successfulRegion && campaignsStored > 0) {
      adGroupsStored = await syncAdGroups(
        accessToken,
        clientId,
        connection.profile_id,
        successfulRegion,
        connectionId,
        supabase
      )
      console.log(`✓ Stored ${adGroupsStored} ad groups`)
    } else {
      console.log('Skipping ad groups sync - no campaigns found')
    }

    // Update last sync time and status
    await updateLastSyncTime(connectionId, supabase)
    await updateConnectionStatus(connectionId, 'active', supabase)

    console.log('=== Sync Completed Successfully ===')

    // Provide detailed success message
    const message = campaignsStored > 0 
      ? `Data sync completed successfully. Imported ${campaignsStored} campaigns, updated metrics for ${metricsUpdated} campaigns, and ${adGroupsStored} ad groups from ${successfulRegion} region.`
      : `Connection verified but no campaigns found. The Amazon Advertising account may be empty or campaigns may be in a different region. Profile ID ${connection.profile_id} is valid for ${successfulRegion} region.`

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        details: {
          campaignsStored,
          metricsUpdated,
          adGroupsStored,
          region: successfulRegion,
          regionsAttempted: totalRegionsTried,
          hasRealData: campaignsStored > 0 && metricsUpdated > 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== Sync Error ===')
    console.error('Error details:', error)
    console.error('Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more information. Common issues: expired tokens, invalid profile IDs, accounts without campaigns, or insufficient permissions.'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
