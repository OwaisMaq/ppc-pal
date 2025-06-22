
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
    console.log('Syncing data for connection:', connectionId)

    // Get the connection details
    const connection = await getConnection(connectionId, user.id, supabase)

    // Validate connection
    try {
      validateConnection(connection)
    } catch (error) {
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw error
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Amazon Client ID not configured')
    }

    console.log('Using profile ID:', connection.profile_id)

    // Handle token refresh if needed
    const accessToken = await refreshTokenIfNeeded(connection, clientId, supabase)

    // Sync campaigns - try different API regions
    let campaignsData = []
    let successfulRegion = null

    for (const region of REGIONS) {
      const result = await fetchCampaignsFromRegion(
        accessToken,
        clientId,
        connection.profile_id,
        region
      )

      if (result) {
        campaignsData = result.campaigns
        successfulRegion = result.region
        break
      }
    }

    if (!successfulRegion) {
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error('Failed to fetch campaigns from all regions. This may indicate an invalid profile ID or insufficient permissions. Please try reconnecting your Amazon account.')
    }

    // Store campaigns
    const { stored: campaignsStored, campaignIds } = await storeCampaigns(
      campaignsData,
      connectionId,
      supabase
    )

    // Fetch and update performance metrics
    const baseUrl = getBaseUrl(successfulRegion)
    
    if (campaignIds.length > 0) {
      try {
        console.log('Fetching performance metrics for campaigns...')
        const metricsData = await fetchCampaignReports(
          accessToken,
          clientId,
          connection.profile_id,
          baseUrl,
          campaignIds
        )
        
        if (metricsData.length > 0) {
          await updateCampaignMetrics(supabase, connectionId, metricsData)
          console.log(`Updated metrics for ${metricsData.length} campaigns`)
        }
      } catch (error) {
        console.error('Error fetching campaign metrics:', error)
      }
    }

    // Sync ad groups for each campaign
    const adGroupsStored = await syncAdGroups(
      accessToken,
      clientId,
      connection.profile_id,
      successfulRegion,
      connectionId,
      supabase
    )

    // Update last sync time and status
    await updateLastSyncTime(connectionId, supabase)

    console.log('Data sync completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Data sync completed successfully. Imported ${campaignsStored} campaigns and ${adGroupsStored} ad groups with performance metrics.`,
        campaignsStored,
        adGroupsStored
      }),
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
