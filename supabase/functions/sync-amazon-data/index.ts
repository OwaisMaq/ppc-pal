
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateConnection } from './validation.ts'
import { refreshTokenIfNeeded } from './auth.ts'
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
    
    console.log('=== AMAZON SYNC STARTED WITH TOKEN REFRESH & REAL METRICS API ===')
    console.log('Connection ID:', connectionId)
    console.log('Debug Mode:', debugMode)
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Get connection details
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

    // Step 2: Validate connection and refresh token if needed
    console.log('🔍 Step 2: Validating connection and refreshing token if needed...')
    
    let validationResult = validateConnection(connection)
    console.log('Initial validation result:', validationResult)
    
    // If token is expired, attempt to refresh it
    if (!validationResult.isValid && validationResult.error?.includes('expired')) {
      console.log('🔄 Token expired, attempting refresh...')
      
      try {
        const refreshedToken = await refreshTokenIfNeeded(
          connection,
          Deno.env.get('AMAZON_CLIENT_ID') ?? '',
          supabaseClient
        )
        
        console.log('✅ Token refresh successful')
        
        // Re-fetch connection with updated token
        const { data: refreshedConnection, error: refetchError } = await supabaseClient
          .from('amazon_connections')
          .select('*')
          .eq('id', connectionId)
          .single()
        
        if (refetchError) {
          console.error('❌ Failed to refetch connection after token refresh:', refetchError)
          throw new Error('Failed to refetch connection after token refresh')
        }
        
        // Re-validate with refreshed connection
        validationResult = validateConnection(refreshedConnection)
        connection.access_token = refreshedToken
        
        console.log('✅ Connection re-validated after token refresh:', validationResult)
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)
        
        // Mark connection as expired
        await supabaseClient
          .from('amazon_connections')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId)
        
        throw new Error(`Token refresh failed: ${refreshError.message}. Please reconnect your Amazon account.`)
      }
    }
    
    // Final validation check
    if (!validationResult.isValid) {
      console.error('❌ Final validation failed:', validationResult.error)
      throw new Error(`Connection validation failed: ${validationResult.error}`)
    }

    console.log('✅ Connection validated and ready for API calls')

    // Step 3: Determine region and fetch campaigns
    console.log('🔍 Step 3: Fetching campaigns from Amazon API...')
    
    const region: Region = connection.marketplace_id?.startsWith('EU') ? 'EU' : 
                          connection.marketplace_id?.startsWith('FE') ? 'FE' : 'NA'
    
    console.log(`📍 Using region: ${region} for marketplace: ${connection.marketplace_id}`)
    
    let campaignResult;
    try {
      campaignResult = await fetchCampaignsFromRegion(
        connection.access_token,
        Deno.env.get('AMAZON_CLIENT_ID') ?? '',
        connection.profile_id,
        region
      )
      console.log('✅ Campaign fetch successful')
    } catch (campaignError) {
      console.error('❌ Campaign fetch failed:', campaignError)
      throw new Error(`Failed to fetch campaigns: ${campaignError.message}`)
    }

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
    
    let storageResult;
    try {
      storageResult = await storeCampaigns(
        campaignResult.campaigns,
        connectionId,
        supabaseClient
      )
      console.log('✅ Campaign storage successful')
    } catch (storageError) {
      console.error('❌ Campaign storage failed:', storageError)
      throw new Error(`Failed to store campaigns: ${storageError.message}`)
    }

    console.log('💾 Storage result:', {
      stored: storageResult.stored,
      errors: storageResult.errors,
      campaignUUIDs: storageResult.campaignIds.length
    })

    // Step 5: Fetch REAL performance metrics from Amazon Reports API
    console.log('🔍 Step 5: Fetching REAL performance metrics from Amazon Reports API...')
    
    if (storageResult.campaignIds.length > 0) {
      const region_base_url = region === 'EU' ? 'https://advertising-api-eu.amazon.com' :
                             region === 'FE' ? 'https://advertising-api-fe.amazon.com' :
                             'https://advertising-api.amazon.com'

      console.log('📊 Initiating Amazon Reports API call for real metrics...')
      console.log('🔒 API Headers will include:')
      console.log(`   - Authorization: Bearer ${connection.access_token.substring(0, 20)}...`)
      console.log(`   - Amazon-Advertising-API-Scope: ${connection.profile_id}`)
      console.log(`   - Base URL: ${region_base_url}`)
      
      let metricsData;
      try {
        metricsData = await fetchCampaignReports(
          connection.access_token,
          Deno.env.get('AMAZON_CLIENT_ID') ?? '',
          connection.profile_id,
          region_base_url,
          storageResult.campaignIds
        )
        console.log('✅ Metrics fetch successful')
      } catch (metricsError) {
        console.error('❌ Metrics fetch failed:', metricsError)
        console.error('❌ Full error details:', {
          message: metricsError.message,
          stack: metricsError.stack,
          cause: metricsError.cause
        })
        throw new Error(`Failed to fetch metrics: ${metricsError.message}`)
      }

      console.log('📈 Real metrics fetch result:', {
        totalMetrics: metricsData.length,
        realApiMetrics: metricsData.filter(m => m.fromAPI === true).length,
        placeholderMetrics: metricsData.filter(m => m.fromAPI !== true).length,
        dataSource: 'amazon-reports-api-v3'
      })

      // Update campaign metrics in database
      if (metricsData.length > 0) {
        try {
          const updateResult = await updateCampaignMetrics(metricsData, supabaseClient)
          console.log('📊 Real metrics update result:', updateResult)
        } catch (updateError) {
          console.error('❌ Metrics update failed:', updateError)
          // Don't throw here, as we still want to return success for campaign sync
          console.warn('⚠️ Continuing despite metrics update failure')
        }
      }
    } else {
      console.log('⚠️ No campaign UUIDs to fetch metrics for')
    }

    // Step 6: Update connection sync timestamp and status
    console.log('🔍 Step 6: Updating sync timestamp and connection status...')
    
    const { error: updateError } = await supabaseClient
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString()
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
      metricsSource: 'amazon-reports-api-v3',
      tokenRefreshed: validationResult.error?.includes('expired') ? true : false,
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

    console.log('🎉 SYNC COMPLETED WITH REAL AMAZON METRICS & TOKEN REFRESH')
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
    console.error('💥 Error stack trace:', error.stack)
    console.error('💥 Error cause:', error.cause)
    
    const errorResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      debugInfo: {
        errorType: error.constructor.name,
        errorStack: error.stack?.substring(0, 500), // Truncate for readability
      }
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
