
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

    console.log('=== Fetching Campaigns ===')
    for (const region of REGIONS) {
      console.log(`Trying region: ${region}`)
      const result = await fetchCampaignsFromRegion(
        accessToken,
        clientId,
        connection.profile_id,
        region
      )

      if (result) {
        campaignsData = result.campaigns
        successfulRegion = result.region
        console.log(`✓ Successfully fetched ${campaignsData.length} campaigns from ${region} region`)
        break
      }
    }

    if (!successfulRegion) {
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error('Failed to fetch campaigns from all regions. This may indicate an invalid profile ID or insufficient permissions. Please try reconnecting your Amazon account.')
    }

    // Store campaigns
    console.log('=== Storing Campaigns ===')
    const { stored: campaignsStored, campaignIds } = await storeCampaigns(
      campaignsData,
      connectionId,
      supabase
    )
    console.log(`✓ Stored ${campaignsStored} campaigns`)

    // Fetch and update performance metrics
    console.log('=== Fetching Performance Metrics ===')
    const baseUrl = getBaseUrl(successfulRegion)
    let metricsUpdated = 0;
    
    if (campaignIds.length > 0) {
      try {
        console.log(`Fetching metrics for ${campaignIds.length} campaigns...`)
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
          console.warn('No metrics data received from API')
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
    const adGroupsStored = await syncAdGroups(
      accessToken,
      clientId,
      connection.profile_id,
      successfulRegion,
      connectionId,
      supabase
    )
    console.log(`✓ Stored ${adGroupsStored} ad groups`)

    // Update last sync time and status
    await updateLastSyncTime(connectionId, supabase)
    await updateConnectionStatus(connectionId, 'active', supabase)

    console.log('=== Sync Completed Successfully ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Data sync completed successfully. Imported ${campaignsStored} campaigns, updated metrics for ${metricsUpdated} campaigns, and ${adGroupsStored} ad groups.`,
        details: {
          campaignsStored,
          metricsUpdated,
          adGroupsStored,
          region: successfulRegion
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
        details: 'Check the function logs for more information'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
