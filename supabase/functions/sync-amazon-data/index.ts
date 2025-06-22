
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
    console.log('=== ENHANCED AMAZON DATA SYNC STARTED ===')
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

    console.log('=== ENHANCED CONNECTION VALIDATION ===')
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

    console.log('=== ENHANCED SYNC COMPLETED SUCCESSFULLY ===')
    console.log('Summary:')
    console.log(`- Campaigns: ${stored}`)
    console.log(`- Metrics updated: ${metricsUpdated}`)
    console.log(`- Ad groups: ${adGroupsStored}`)
    console.log(`- Region: ${successfulRegion}`)
    console.log(`- Real API data: ${hasRealApiData}`)
    console.log(`- Profile validation: PASSED`)

    // Enhanced success response
    const message = stored > 0 
      ? `Enhanced sync completed successfully! Imported ${stored} campaigns and updated metrics for ${metricsUpdated} campaigns from ${successfulRegion} region. Profile validation passed in ${accessibleRegions.length} region(s).${hasRealApiData ? ' Real Amazon API data was successfully retrieved.' : ' Note: Only simulated data was available - this may indicate API limitations or account permissions.'}`
      : `Enhanced connection verification completed! Profile ID ${connection.profile_id} is valid and accessible in ${accessibleRegions.length} region(s), but no campaigns were found. The Amazon Advertising account may be empty or campaigns may be in a different state.`

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
          accessibleRegions: accessibleRegions.length,
          profileValidation: 'PASSED'
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
        details: 'Enhanced sync failed. The error has been logged with detailed diagnostics. Common issues: expired tokens, invalid profile IDs, accounts without campaigns, insufficient Amazon Advertising permissions, or regional access problems.',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
