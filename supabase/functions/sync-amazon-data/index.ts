
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateConnection } from './validation.ts'
import { fetchCampaignsFromRegion, storeCampaigns } from './campaigns.ts'
import { fetchCampaignReports } from './reports.ts'
import { updateCampaignMetrics } from './metricsUpdater.ts'
import { Region } from './types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { connectionId, debugMode = false } = await req.json()
    
    console.log('=== AMAZON SYNC STARTED ===')
    console.log('Connection ID:', connectionId)
    console.log('Debug Mode:', debugMode)
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Get and validate connection
    console.log('🔍 Step 1: Fetching connection details...')
    const { data: connection, error: connectionError } = await supabaseClient
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connectionError) {
      console.error('❌ Connection fetch error:', connectionError)
      throw new Error(`Connection not found: ${connectionError.message}`)
    }

    console.log('✅ Connection found:', {
      profileId: connection.profile_id,
      profileName: connection.profile_name,
      marketplace: connection.marketplace_id,
      status: connection.status
    })

    // Step 2: Validate connection credentials
    console.log('🔍 Step 2: Validating connection...')
    const validationResult = await validateConnection(connection)
    
    if (!validationResult.isValid) {
      console.error('❌ Connection validation failed:', validationResult.error)
      throw new Error(`Connection invalid: ${validationResult.error}`)
    }

    console.log('✅ Connection validated successfully')

    // Step 3: Determine region and fetch campaigns with enhanced debugging
    console.log('🔍 Step 3: Fetching campaigns from Amazon API...')
    
    const region: Region = connection.marketplace_id?.startsWith('EU') ? 'EU' : 
                          connection.marketplace_id?.startsWith('FE') ? 'FE' : 'NA'
    
    console.log(`📍 Using region: ${region} for marketplace: ${connection.marketplace_id}`)
    
    const campaignResult = await fetchCampaignsFromRegion(
      connection.access_token,
      Deno.env.get('AMAZON_CLIENT_ID') ?? '',
      connection.profile_id,
      region
    )

    console.log('📊 Campaign fetch result:', {
      region: campaignResult.region,
      totalCampaigns: campaignResult.campaigns.length,
      successfulEndpoint: campaignResult.endpoint
    })

    if (debugMode) {
      console.log('🐛 DEBUG: Raw campaign data sample:', 
        campaignResult.campaigns.slice(0, 2).map(c => ({
          campaignId: c.campaignId,
          name: c.name,
          state: c.state,
          sourceEndpoint: c.sourceEndpoint
        }))
      )
    }

    // Step 4: Store campaigns in database
    console.log('🔍 Step 4: Storing campaigns in database...')
    
    const storageResult = await storeCampaigns(
      campaignResult.campaigns,
      connectionId,
      supabaseClient
    )

    console.log('💾 Storage result:', {
      stored: storageResult.stored,
      errors: storageResult.errors,
      campaignUUIDs: storageResult.campaignIds.length
    })

    // Step 5: Fetch and update performance metrics
    console.log('🔍 Step 5: Fetching performance metrics...')
    
    if (storageResult.campaignIds.length > 0) {
      const region_base_url = region === 'EU' ? 'https://advertising-api-eu.amazon.com' :
                             region === 'FE' ? 'https://advertising-api-fe.amazon.com' :
                             'https://advertising-api.amazon.com'

      const metricsData = await fetchCampaignReports(
        connection.access_token,
        Deno.env.get('AMAZON_CLIENT_ID') ?? '',
        connection.profile_id,
        region_base_url,
        storageResult.campaignIds
      )

      console.log('📈 Metrics fetch result:', {
        totalMetrics: metricsData.length,
        realApiMetrics: metricsData.filter(m => m.fromAPI === true).length,
        simulatedMetrics: metricsData.filter(m => m.fromAPI !== true).length
      })

      // Update campaign metrics in database
      if (metricsData.length > 0) {
        const updateResult = await updateCampaignMetrics(metricsData, supabaseClient)
        console.log('📊 Metrics update result:', updateResult)
      }
    } else {
      console.log('⚠️ No campaign UUIDs to fetch metrics for')
    }

    // Step 6: Update connection sync timestamp
    console.log('🔍 Step 6: Updating sync timestamp...')
    
    const { error: updateError } = await supabaseClient
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('⚠️ Failed to update sync timestamp:', updateError)
    }

    const finalResult = {
      success: true,
      connectionId,
      profileId: connection.profile_id,
      region,
      campaignsFetched: campaignResult.campaigns.length,
      campaignsStored: storageResult.stored,
      storageErrors: storageResult.errors,
      campaignUUIDs: storageResult.campaignIds.length,
      debugInfo: debugMode ? {
        connectionDetails: {
          profileId: connection.profile_id,
          profileName: connection.profile_name,
          marketplace: connection.marketplace_id
        },
        campaignSample: campaignResult.campaigns.slice(0, 3),
        storageDetails: storageResult
      } : undefined
    }

    console.log('🎉 SYNC COMPLETED SUCCESSFULLY')
    console.log('Final Result:', finalResult)

    return new Response(
      JSON.stringify(finalResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('💥 SYNC FAILED:', error)
    
    const errorResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(errorResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
