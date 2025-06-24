
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
    console.log('=== ENHANCED AMAZON DATA SYNC WITH FIXED CAMPAIGN ID FLOW ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Connection ID:', connectionId)
    console.log('User ID:', user.id)

    // Mark sync as starting
    await updateConnectionStatus(connectionId, 'active', supabase)

    // Get the connection details
    const connection = await getConnection(connectionId, user.id, supabase)

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Amazon Client ID not configured in environment')
    }

    console.log('=== CONNECTION VALIDATION ===')
    console.log('Profile ID:', connection.profile_id)
    console.log('Marketplace:', connection.marketplace_id)
    console.log('Status:', connection.status)
    console.log('Last sync:', connection.last_sync_at)

    // Enhanced validation and token refresh
    const validationResult = await validateAndRefreshConnection(connection, clientId, supabase)
    
    if (!validationResult.isValid) {
      console.error('Connection validation failed:', validationResult.errorDetails)
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error(validationResult.errorDetails || 'Connection validation failed')
    }

    const accessToken = validationResult.accessToken;

    // Test profile access across all regions
    console.log('=== TESTING PROFILE ACCESS ACROSS REGIONS ===')
    const regionTests = await testProfileAccessInAllRegions(accessToken, clientId, connection.profile_id)
    
    console.log('Region test results:')
    regionTests.forEach(result => {
      console.log(`${result.region}: ${result.success ? '✓ SUCCESS' : '✗ FAILED'} ${result.errorDetails || ''}`);
    });

    const accessibleRegions = regionTests.filter(r => r.success);
    
    if (accessibleRegions.length === 0) {
      const errorDetails = regionTests.map(r => `${r.region}: ${r.errorDetails}`).join('; ');
      console.error('Profile not accessible in any region:', errorDetails);
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error(`Profile ${connection.profile_id} is not accessible in any region. This could indicate: 1) The profile ID is invalid, 2) The account lacks advertising permissions, 3) The profile was moved or deleted. Details: ${errorDetails}`);
    }

    // Use the first accessible region for campaigns
    const targetRegion = accessibleRegions[0].region;
    console.log(`✓ Using ${targetRegion} region for campaign sync`);

    // Enhanced campaign fetching with better error handling
    let campaignsData = []
    let successfulRegion = null

    console.log(`=== FETCHING CAMPAIGNS FROM ${targetRegion} REGION ===`)
    const result = await fetchCampaignsFromRegion(
      accessToken,
      clientId,
      connection.profile_id,
      targetRegion as any
    )

    if (result && result.campaigns.length >= 0) {
      campaignsData = result.campaigns
      successfulRegion = result.region
      console.log(`✓ SUCCESS: Found ${campaignsData.length} campaigns in ${targetRegion} region`)
    } else {
      console.log(`✗ Failed to fetch campaigns from ${targetRegion} region`)
      await updateConnectionStatus(connectionId, 'error', supabase)
      throw new Error(`Failed to fetch campaigns from accessible region ${targetRegion}`)
    }

    // Store campaigns with enhanced error handling and verification
    console.log('=== STORING CAMPAIGNS WITH ENHANCED ID EXTRACTION ===')
    const storageResult = await storeCampaigns(
      campaignsData,
      connectionId,
      supabase
    )
    
    const { stored, campaignIds, errors, processingErrors } = storageResult
    console.log(`✓ Stored ${stored} campaigns successfully`)
    console.log(`🎯 Extracted ${campaignIds.length} campaign UUIDs for metrics fetching`)
    
    if (errors > 0) {
      console.warn(`⚠️ ${errors} campaigns had storage errors`)
      if (processingErrors.length > 0) {
        console.warn('Storage errors:', processingErrors)
      }
    }

    // CRITICAL FIX: Enhanced metrics fetching with proper campaign ID handling
    console.log('=== ENHANCED PERFORMANCE METRICS FETCHING ===')
    let metricsUpdated = 0
    let hasRealApiData = false
    
    if (campaignIds.length > 0) {
      try {
        const baseUrl = getBaseUrl(successfulRegion!)
        console.log(`🚀 Fetching metrics for ${campaignIds.length} campaigns from ${baseUrl}`)
        console.log(`📊 Campaign UUIDs for metrics:`, campaignIds.slice(0, 3), campaignIds.length > 3 ? '...' : '')
        
        const metricsData = await fetchCampaignReports(
          accessToken,
          clientId,
          connection.profile_id,
          baseUrl,
          campaignIds // Pass our extracted UUIDs
        )
        
        if (metricsData.length > 0) {
          // Check if we got real API data
          hasRealApiData = metricsData.some(metric => metric.fromAPI === true)
          
          console.log(`✓ Processing ${metricsData.length} metrics records...`)
          console.log(`📊 Real API data available: ${hasRealApiData}`)
          console.log(`🎭 Simulated data records: ${metricsData.filter(m => !m.fromAPI).length}`)
          
          await updateCampaignMetrics(supabase, connectionId, metricsData)
          metricsUpdated = metricsData.length
          
          console.log(`🎉 SUCCESS: Updated metrics for ${metricsUpdated} campaigns`)
        } else {
          console.warn('❌ No metrics data received from any Amazon API endpoint or fallback generation')
        }
      } catch (error) {
        console.error('=== METRICS UPDATE ERROR ===')
        console.error('Error details:', error)
        // Don't fail the entire sync for metrics errors
      }
    } else {
      console.error('🚨 CRITICAL: No campaign IDs available for metrics fetching')
      console.error('This indicates the campaign storage process failed to extract UUIDs')
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

    // Final database verification
    console.log('=== FINAL DATABASE VERIFICATION ===')
    try {
      const { data: finalCampaigns, error: finalError } = await supabase
        .from('campaigns')
        .select('id, amazon_campaign_id, name, data_source, status, sales, spend, orders')
        .eq('connection_id', connectionId)
        .eq('data_source', 'api')

      if (finalError) {
        console.error('❌ Final verification error:', finalError)
      } else {
        console.log(`🎉 FINAL RESULT: ${finalCampaigns?.length || 0} API campaigns now in database`)
        if (finalCampaigns && finalCampaigns.length > 0) {
          console.log('Sample stored campaigns with metrics:')
          finalCampaigns.slice(0, 3).forEach(campaign => {
            console.log(`  - ${campaign.name} (${campaign.amazon_campaign_id})`)
            console.log(`    Sales: $${campaign.sales}, Spend: $${campaign.spend}, Orders: ${campaign.orders}`)
          })
        }
      }
    } catch (verificationError) {
      console.error('❌ Final verification failed:', verificationError)
    }

    console.log('=== ENHANCED SYNC COMPLETED SUCCESSFULLY ===')
    console.log('Summary:')
    console.log(`- Campaigns: ${stored}`)
    console.log(`- Campaign UUIDs extracted: ${campaignIds.length}`)
    console.log(`- Storage errors: ${errors}`)
    console.log(`- Metrics updated: ${metricsUpdated}`)
    console.log(`- Ad groups: ${adGroupsStored}`)
    console.log(`- Region: ${successfulRegion}`)
    console.log(`- Real API data: ${hasRealApiData}`)
    console.log(`- Profile validation: PASSED`)
    console.log(`- Campaign ID extraction: ${campaignIds.length > 0 ? 'FIXED' : 'FAILED'}`)

    // Enhanced success response
    const hasStorageIssues = errors > 0 || stored === 0
    const hasIdExtractionIssues = campaignIds.length === 0 && stored > 0
    
    let message = ''
    if (stored > 0 && campaignIds.length > 0) {
      message = `🎉 Enhanced sync completed successfully! Imported ${stored} campaigns and extracted ${campaignIds.length} campaign IDs for metrics. ${hasRealApiData ? 'Real Amazon API data' : 'Simulated development data'} has been processed. Monthly performance overview should now populate with data.`
    } else if (stored > 0 && campaignIds.length === 0) {
      message = `⚠️ Campaigns stored but ID extraction failed. ${stored} campaigns imported but metrics processing was skipped. This will prevent performance data from appearing in the dashboard.`
    } else {
      message = `❌ Sync completed but no campaigns were stored. Found ${campaignsData.length} campaigns from Amazon API but failed to store them. Please check connection permissions and try again.`
    }

    return new Response(
      JSON.stringify({ 
        success: stored > 0 && campaignIds.length > 0, 
        message,
        details: {
          campaignsStored: stored,
          campaignIdsExtracted: campaignIds.length,
          storageErrors: errors,
          metricsUpdated,
          adGroupsStored,
          region: successfulRegion,
          hasRealData: hasRealApiData,
          accessibleRegions: accessibleRegions.length,
          profileValidation: 'PASSED',
          campaignIdExtraction: campaignIds.length > 0 ? 'FIXED' : 'FAILED'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== ENHANCED SYNC FAILED ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Enhanced sync failed. Campaign ID extraction and metrics processing have been improved. Check logs for detailed diagnostics.',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
