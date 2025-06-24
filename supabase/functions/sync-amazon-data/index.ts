
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchCampaignReports } from './reports.ts'
import { updateCampaignMetrics } from './metricsUpdater.ts'
import { fetchCampaignsFromRegion, storeCampaigns } from './campaigns.ts'
import { syncAdGroups } from './adgroups.ts'
import { validateConnection, validateProfileId } from './validation.ts'
import { getConnection, updateConnectionStatus, updateLastSyncTime } from './database.ts'
import { validateAndRefreshConnection, testProfileAccessInAllRegions } from './enhanced-validation.ts'
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
    console.log('=== ENHANCED AMAZON DATA SYNC WITH COMPREHENSIVE DEBUGGING ===')
    console.log('🚀 Sync initiated with enhanced logging and diagnostics')
    console.log('⏰ Timestamp:', new Date().toISOString())
    console.log('🔑 Connection ID:', connectionId)
    console.log('👤 User ID:', user.id)
    console.log('🏷️ Request ID:', req.headers.get('x-request-id') || 'Unknown')

    // Mark sync as starting
    await updateConnectionStatus(connectionId, 'active', supabase)

    // Get the connection details
    const connection = await getConnection(connectionId, user.id, supabase)

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Amazon Client ID not configured in environment')
    }

    console.log('=== CONNECTION VALIDATION WITH ENHANCED DIAGNOSTICS ===')
    console.log('📊 Connection details:', {
      profileId: connection.profile_id,
      marketplaceId: connection.marketplace_id,
      status: connection.status,
      lastSync: connection.last_sync_at,
      tokenExpiry: connection.token_expires_at
    })

    // Enhanced validation and token refresh
    const validationResult = await validateAndRefreshConnection(connection, clientId, supabase)
    
    if (!validationResult.isValid) {
      console.error('❌ Connection validation failed:', validationResult.errorDetails)
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error(validationResult.errorDetails || 'Connection validation failed')
    }

    console.log('✅ Connection validation passed successfully')
    const accessToken = validationResult.accessToken;

    // Test profile access across all regions
    console.log('=== TESTING PROFILE ACCESS ACROSS REGIONS ===')
    const regionTests = await testProfileAccessInAllRegions(accessToken, clientId, connection.profile_id)
    
    console.log('🌍 Region test results:')
    regionTests.forEach(result => {
      console.log(`   ${result.region}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} ${result.errorDetails || ''}`);
    });

    const accessibleRegions = regionTests.filter(r => r.success);
    
    if (accessibleRegions.length === 0) {
      const errorDetails = regionTests.map(r => `${r.region}: ${r.errorDetails}`).join('; ');
      console.error('🚨 Profile not accessible in any region:', errorDetails);
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error(`Profile ${connection.profile_id} is not accessible in any region. Details: ${errorDetails}`);
    }

    // Use the first accessible region for campaigns
    const targetRegion = accessibleRegions[0].region;
    console.log(`🎯 Using ${targetRegion} region for campaign sync (${accessibleRegions.length} regions available)`);

    // Enhanced campaign fetching with comprehensive logging
    let campaignsData = []
    let successfulRegion = null

    console.log(`=== FETCHING CAMPAIGNS FROM ${targetRegion} REGION ===`)
    console.log(`🔍 API Base URL: ${getBaseUrl(targetRegion as any)}`)
    
    const result = await fetchCampaignsFromRegion(
      accessToken,
      clientId,
      connection.profile_id,
      targetRegion as any
    )

    if (result && result.campaigns.length >= 0) {
      campaignsData = result.campaigns
      successfulRegion = result.region
      console.log(`✅ SUCCESS: Retrieved ${campaignsData.length} campaigns from ${targetRegion} region`)
      
      if (campaignsData.length > 0) {
        console.log('📊 Sample campaigns retrieved:')
        campaignsData.slice(0, 3).forEach((campaign, index) => {
          console.log(`   ${index + 1}. ${campaign.name} (ID: ${campaign.campaignId}, Status: ${campaign.state})`)
        })
      } else {
        console.log('⚠️ WARNING: No campaigns found in Amazon account')
        console.log('🔍 This could mean:')
        console.log('   - Account has no advertising campaigns')
        console.log('   - Profile lacks campaign access permissions')
        console.log('   - Campaigns exist in a different marketplace/region')
      }
    } else {
      console.error(`❌ Failed to fetch campaigns from ${targetRegion} region`)
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error(`Failed to fetch campaigns from accessible region ${targetRegion}`)
    }

    // Store campaigns with enhanced error handling and verification
    console.log('=== STORING CAMPAIGNS WITH ENHANCED DIAGNOSTICS ===')
    const storageResult = await storeCampaigns(
      campaignsData,
      connectionId,
      supabase
    )
    
    const { stored, campaignIds, errors, processingErrors } = storageResult
    console.log(`📊 Storage results:`, {
      stored,
      campaignIdsExtracted: campaignIds.length,
      errors,
      successRate: stored > 0 ? `${((stored / campaignsData.length) * 100).toFixed(1)}%` : '0%'
    })
    
    if (errors > 0) {
      console.warn(`⚠️ ${errors} campaigns had storage errors`)
      if (processingErrors.length > 0) {
        console.warn('Storage errors detail:')
        processingErrors.forEach((error, index) => {
          console.warn(`   ${index + 1}. ${error}`)
        })
      }
    }

    // ENHANCED: Performance metrics fetching with comprehensive debugging
    console.log('=== ENHANCED PERFORMANCE METRICS FETCHING WITH FULL DIAGNOSTICS ===')
    let metricsUpdated = 0
    let hasRealApiData = false
    let metricsErrors = []
    
    if (campaignIds.length > 0) {
      try {
        const baseUrl = getBaseUrl(successfulRegion!)
        console.log(`🚀 Starting metrics fetch process:`)
        console.log(`   📊 Campaign UUIDs: ${campaignIds.length}`)
        console.log(`   🌐 Base URL: ${baseUrl}`)
        console.log(`   🔑 Profile ID: ${connection.profile_id}`)
        console.log(`   ⏰ Fetch time: ${new Date().toISOString()}`)
        
        const metricsData = await fetchCampaignReports(
          accessToken,
          clientId,
          connection.profile_id,
          baseUrl,
          campaignIds // Pass our extracted UUIDs
        )
        
        console.log(`📈 Metrics fetch completed:`)
        console.log(`   📊 Records returned: ${metricsData.length}`)
        console.log(`   🎯 Expected records: ${campaignIds.length}`)
        
        if (metricsData.length > 0) {
          // Analyze data sources
          hasRealApiData = metricsData.some(metric => metric.fromAPI === true)
          const realDataRecords = metricsData.filter(m => m.fromAPI === true)
          const simulatedRecords = metricsData.filter(m => m.fromAPI !== true)
          
          console.log(`📊 Data source analysis:`)
          console.log(`   🎯 Real API data records: ${realDataRecords.length}`)
          console.log(`   🎭 Simulated data records: ${simulatedRecords.length}`)
          console.log(`   📈 Data quality: ${hasRealApiData ? 'REAL AMAZON DATA' : 'SIMULATED FOR DEVELOPMENT'}`)
          
          if (hasRealApiData) {
            console.log(`🎉 BREAKTHROUGH: Real Amazon API data successfully retrieved!`)
            console.log(`📊 Sample real data:`, realDataRecords[0])
          }
          
          console.log(`🔄 Starting metrics update process...`)
          await updateCampaignMetrics(supabase, connectionId, metricsData)
          metricsUpdated = metricsData.length
          
          console.log(`✅ Metrics update completed successfully`)
        } else {
          console.warn('⚠️ No metrics data received from Amazon API or fallback generation')
          console.warn('🔍 This indicates:')
          console.warn('   - All API endpoints failed to return data')
          console.warn('   - Fallback metric generation also failed')
          console.warn('   - Possible configuration or permission issues')
          metricsErrors.push('No metrics data generated')
        }
      } catch (error) {
        console.error('=== METRICS PROCESSING ERROR ===')
        console.error('💥 Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack?.substring(0, 500)
        })
        metricsErrors.push(error.message)
        // Don't fail the entire sync for metrics errors
      }
    } else {
      console.error('🚨 CRITICAL: No campaign IDs available for metrics fetching')
      console.error('🔍 Root cause analysis:')
      console.error('   - Campaign storage succeeded but ID extraction failed')
      console.error('   - This prevents metrics processing from working')
      console.error('   - Check campaign storage and ID extraction logic')
      metricsErrors.push('No campaign IDs extracted for metrics processing')
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
        console.log(`✅ Stored ${adGroupsStored} ad groups`)
      } catch (error) {
        console.error('⚠️ Ad groups sync failed:', error)
        // Don't fail entire sync for ad group errors
      }
    }

    // Update sync completion
    await updateLastSyncTime(connectionId, supabase)
    await updateConnectionStatus(connectionId, 'active', supabase)

    // Comprehensive final verification
    console.log('=== COMPREHENSIVE FINAL VERIFICATION ===')
    try {
      const { data: finalCampaigns, error: finalError } = await supabase
        .from('campaigns')
        .select('id, amazon_campaign_id, name, data_source, status, sales, spend, orders, last_updated')
        .eq('connection_id', connectionId)
        .order('last_updated', { ascending: false })

      if (finalError) {
        console.error('❌ Final verification error:', finalError)
      } else {
        const apiCampaigns = finalCampaigns?.filter(c => c.data_source === 'api') || []
        const simulatedCampaigns = finalCampaigns?.filter(c => c.data_source === 'simulated') || []
        
        console.log(`🎊 FINAL VERIFICATION RESULTS:`)
        console.log(`   📊 Total campaigns in database: ${finalCampaigns?.length || 0}`)
        console.log(`   🎯 API campaigns: ${apiCampaigns.length}`)
        console.log(`   🎭 Simulated campaigns: ${simulatedCampaigns.length}`)
        console.log(`   💰 Campaigns with sales data: ${finalCampaigns?.filter(c => (c.sales || 0) > 0).length || 0}`)
        console.log(`   📈 Campaigns with metrics: ${finalCampaigns?.filter(c => (c.sales || 0) > 0 || (c.spend || 0) > 0).length || 0}`)
        
        if (apiCampaigns.length > 0) {
          console.log('📊 Sample API campaigns with metrics:')
          apiCampaigns.slice(0, 3).forEach((campaign, index) => {
            console.log(`   ${index + 1}. ${campaign.name} (${campaign.amazon_campaign_id})`)
            console.log(`      Sales: $${campaign.sales || 0}, Spend: $${campaign.spend || 0}, Orders: ${campaign.orders || 0}`)
            console.log(`      Last updated: ${campaign.last_updated}`)
          })
        }
      }
    } catch (verificationError) {
      console.error('❌ Final verification failed:', verificationError)
    }

    console.log('=== ENHANCED SYNC COMPLETED SUCCESSFULLY ===')
    const syncSummary = {
      campaignsStored: stored,
      campaignIdsExtracted: campaignIds.length,
      storageErrors: errors,
      metricsUpdated,
      metricsErrors: metricsErrors.length,
      adGroupsStored,
      region: successfulRegion,
      hasRealData: hasRealApiData,
      accessibleRegions: accessibleRegions.length,
      profileValidation: 'PASSED',
      campaignIdExtraction: campaignIds.length > 0 ? 'SUCCESS' : 'FAILED',
      dataQuality: hasRealApiData ? 'REAL_API_DATA' : 'SIMULATED_DATA'
    }
    
    console.log('📊 COMPREHENSIVE SYNC SUMMARY:', syncSummary)

    // Enhanced success response with detailed diagnostics
    const hasStorageIssues = errors > 0 || stored === 0
    const hasIdExtractionIssues = campaignIds.length === 0 && stored > 0
    const hasMetricsIssues = metricsErrors.length > 0
    
    let message = ''
    let statusLevel = 'success'
    
    if (stored > 0 && campaignIds.length > 0 && hasRealApiData && metricsErrors.length === 0) {
      message = `🎉 COMPLETE SUCCESS! Enhanced sync completed with real Amazon API data! Imported ${stored} campaigns, extracted ${campaignIds.length} campaign IDs, and successfully processed ${metricsUpdated} metrics with REAL Amazon API data. Your performance dashboard should now display actual Amazon performance metrics.`
      statusLevel = 'success'
    } else if (stored > 0 && campaignIds.length > 0 && metricsUpdated > 0) {
      message = `✅ Sync completed successfully! Imported ${stored} campaigns and processed ${metricsUpdated} metrics. ${hasRealApiData ? 'Real Amazon API data' : 'Simulated development data'} has been processed. Performance dashboard should now show data.`
      statusLevel = 'success'
    } else if (stored > 0 && campaignIds.length === 0) {
      message = `⚠️ Partial success: ${stored} campaigns imported but ID extraction failed. This prevents metrics processing. Dashboard may not show performance data until this is resolved.`
      statusLevel = 'warning'
    } else {
      message = `❌ Sync issues detected: Found ${campaignsData.length} campaigns from Amazon API but only stored ${stored}. Metrics processing ${metricsErrors.length > 0 ? 'had errors' : 'completed'}. Check logs for details.`
      statusLevel = 'error'
    }

    return new Response(
      JSON.stringify({ 
        success: stored > 0 && campaignIds.length > 0, 
        message,
        statusLevel,
        details: syncSummary,
        diagnostics: {
          metricsErrors,
          storageIssues: hasStorageIssues,
          idExtractionIssues: hasIdExtractionIssues,
          metricsIssues: hasMetricsIssues,
          troubleshooting: hasMetricsIssues || hasIdExtractionIssues || hasStorageIssues ? [
            'Check Amazon API permissions for reporting data',
            'Verify campaigns have recent activity (last 24-48 hours)',
            'Ensure token includes required scopes for advertising APIs',
            'Check if campaigns exist in the correct marketplace/region'
          ] : []
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== ENHANCED SYNC FAILED ===')
    console.error('💥 Fatal error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Enhanced sync failed with comprehensive diagnostics. Check function logs for detailed analysis.',
        timestamp: new Date().toISOString(),
        troubleshooting: [
          'Verify Amazon connection and token validity',
          'Check campaign and profile permissions',
          'Ensure API access includes required scopes',
          'Confirm profile exists in correct region'
        ]
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
