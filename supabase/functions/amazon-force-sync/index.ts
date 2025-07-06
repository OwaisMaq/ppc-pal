
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { connectionId } = await req.json()
    
    console.log('=== Amazon Force Sync Started ===')
    console.log('Connection ID:', connectionId)

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Connection ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get connection details
    const { data: connection, error: fetchError } = await supabaseClient
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      console.error('Connection not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== Enhanced Profile Detection Started ===')
    console.log('Current profile_id:', connection.profile_id)
    console.log('Current status:', connection.status)

    // Check if token is expired
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()
    
    if (tokenExpiry <= now) {
      console.error('Token expired for connection:', connectionId)
      
      await supabaseClient
        .from('amazon_connections')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      return new Response(
        JSON.stringify({ 
          error: 'Access token has expired',
          details: 'Please reconnect your Amazon account to continue',
          requiresReconnection: true
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      console.error('Missing Amazon client ID')
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon client credentials not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced profile detection with multiple strategies
    console.log('=== Attempting Enhanced Profile Detection ===')
    let profiles = []
    let detectionStrategy = 'unknown'
    let lastError = null

    // Strategy 1: Standard profiles endpoint with multiple regions
    const profileEndpoints = [
      'https://advertising-api.amazon.com/v2/profiles',
      'https://advertising-api-eu.amazon.com/v2/profiles',
      'https://advertising-api-fe.amazon.com/v2/profiles'
    ]

    for (const endpoint of profileEndpoints) {
      try {
        console.log(`Trying profiles endpoint: ${endpoint}`)
        
        const profilesResponse = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json',
          },
        })

        if (profilesResponse.ok) {
          const profilesData = await profilesResponse.json()
          console.log(`Profiles found via ${endpoint}:`, profilesData?.length || 0)
          
          if (profilesData && Array.isArray(profilesData) && profilesData.length > 0) {
            profiles = profilesData
            detectionStrategy = `standard_api_${endpoint.includes('-eu') ? 'eu' : endpoint.includes('-fe') ? 'fe' : 'na'}`
            break
          }
        } else {
          const errorText = await profilesResponse.text()
          console.log(`Endpoint ${endpoint} failed:`, profilesResponse.status, errorText)
          lastError = { endpoint, status: profilesResponse.status, text: errorText }
        }
      } catch (error) {
        console.log(`Endpoint ${endpoint} error:`, error.message)
        lastError = { endpoint, error: error.message }
      }
    }

    // Strategy 2: Try campaigns endpoint to detect active profiles
    if (profiles.length === 0) {
      console.log('=== Attempting Profile Detection via Campaigns ===')
      
      const campaignEndpoints = [
        'https://advertising-api.amazon.com/v2/campaigns',
        'https://advertising-api-eu.amazon.com/v2/campaigns',
        'https://advertising-api-fe.amazon.com/v2/campaigns'
      ]

      for (const endpoint of campaignEndpoints) {
        try {
          // Try without profile scope first to see if we get profile info in error
          const campaignsResponse = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Amazon-Advertising-API-ClientId': clientId,
              'Content-Type': 'application/json',
            },
          })

          if (campaignsResponse.status === 400) {
            const errorData = await campaignsResponse.text()
            console.log(`Campaigns endpoint error (checking for profile hints):`, errorData)
            
            // Look for profile ID hints in error messages
            if (errorData.includes('profileId') || errorData.includes('profile')) {
              console.log('Found profile hints in campaigns error response')
              // Extract any profile information if available
            }
          }
        } catch (error) {
          console.log(`Campaigns endpoint ${endpoint} error:`, error.message)
        }
      }
    }

    // Strategy 3: Try manager accounts endpoint
    if (profiles.length === 0) {
      console.log('=== Attempting Manager Accounts Detection ===')
      
      try {
        const managerResponse = await fetch('https://advertising-api.amazon.com/v2/manager/accounts', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json',
          },
        })

        if (managerResponse.ok) {
          const managerData = await managerResponse.json()
          console.log('Manager accounts response:', managerData)
          
          if (managerData && Array.isArray(managerData) && managerData.length > 0) {
            // Convert manager accounts to profile format
            profiles = managerData.map(account => ({
              profileId: account.accountId || account.id,
              countryCode: account.countryCode || 'US',
              currencyCode: account.currencyCode || 'USD',
              accountInfo: {
                marketplaceStringId: account.marketplaceId,
                name: account.name || `Account ${account.accountId || account.id}`
              }
            }))
            detectionStrategy = 'manager_accounts'
          }
        }
      } catch (error) {
        console.log('Manager accounts detection error:', error.message)
      }
    }

    // Enhanced profile processing and validation
    let finalProfileId = 'setup_required_no_profiles_found'
    let finalProfileName = 'No profiles found - Setup Required'
    let finalMarketplaceId = null
    let profilesFound = 0
    let activeProfilesFound = 0

    if (profiles && profiles.length > 0) {
      console.log('=== Processing Found Profiles ===')
      profilesFound = profiles.length
      
      // Filter and validate profiles
      const validProfiles = profiles.filter(profile => {
        const hasValidId = profile.profileId && profile.profileId.toString().length > 0
        const hasMarketplace = profile.accountInfo?.marketplaceStringId || profile.countryCode
        console.log(`Profile ${profile.profileId}: valid=${hasValidId}, marketplace=${hasMarketplace}`)
        return hasValidId && hasMarketplace
      })

      activeProfilesFound = validProfiles.length
      console.log(`Valid profiles found: ${activeProfilesFound} out of ${profilesFound}`)

      if (validProfiles.length > 0) {
        // Sort profiles by preference (active status, marketplace, etc.)
        const sortedProfiles = validProfiles.sort((a, b) => {
          // Prefer profiles with marketplace info
          const aHasMarketplace = !!(a.accountInfo?.marketplaceStringId)
          const bHasMarketplace = !!(b.accountInfo?.marketplaceStringId)
          if (aHasMarketplace !== bHasMarketplace) {
            return bHasMarketplace ? 1 : -1
          }
          
          // Prefer US marketplace
          const aIsUS = (a.countryCode === 'US' || (a.accountInfo?.marketplaceStringId || '').includes('US'))
          const bIsUS = (b.countryCode === 'US' || (b.accountInfo?.marketplaceStringId || '').includes('US'))
          if (aIsUS !== bIsUS) {
            return bIsUS ? 1 : -1
          }
          
          return 0
        })

        const selectedProfile = sortedProfiles[0]
        finalProfileId = selectedProfile.profileId.toString()
        finalProfileName = selectedProfile.accountInfo?.name || 
                         `${selectedProfile.countryCode || 'Unknown'} Profile ${selectedProfile.profileId}`
        finalMarketplaceId = selectedProfile.accountInfo?.marketplaceStringId || 
                           selectedProfile.countryCode || 'US'
        
        console.log('Selected profile:', {
          profileId: finalProfileId,
          profileName: finalProfileName,
          marketplaceId: finalMarketplaceId,
          detectionStrategy
        })
      }
    }

    // Update connection with enhanced profile information
    const connectionStatus = activeProfilesFound > 0 ? 'setup_required' : 'warning'
    const statusReason = activeProfilesFound > 0 ? 'needs_sync' : 'no_advertising_profiles'

    console.log('=== Updating Connection ===')
    console.log('New status:', connectionStatus)
    console.log('Status reason:', statusReason)

    const { error: updateError } = await supabaseClient
      .from('amazon_connections')
      .update({
        profile_id: finalProfileId,
        profile_name: finalProfileName,
        marketplace_id: finalMarketplaceId,
        status: connectionStatus,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Failed to update connection:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update connection',
          details: updateError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Attempt to sync campaigns if profiles were found
    let campaignsSynced = 0
    let syncAttempted = false
    let syncError = null

    if (activeProfilesFound > 0 && finalProfileId !== 'setup_required_no_profiles_found') {
      console.log('=== Attempting Campaign Sync ===')
      syncAttempted = true
      
      try {
        const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': finalProfileId,
            'Content-Type': 'application/json',
          },
        })

        if (campaignsResponse.ok) {
          const campaigns = await campaignsResponse.json()
          console.log('Campaigns found:', campaigns?.length || 0)
          
          if (campaigns && campaigns.length > 0) {
            // Process and upsert campaigns
            const campaignInserts = campaigns.map(campaign => ({
              connection_id: connectionId,
              amazon_campaign_id: campaign.campaignId.toString(),
              name: campaign.name,
              campaign_type: campaign.campaignType || null,
              targeting_type: campaign.targetingType || null,
              status: campaign.state?.toLowerCase() === 'enabled' ? 'enabled' : 
                      campaign.state?.toLowerCase() === 'paused' ? 'paused' : 'archived',
              budget: campaign.budget ? parseFloat(campaign.budget) : null,
              daily_budget: campaign.dailyBudget ? parseFloat(campaign.dailyBudget) : null,
              start_date: campaign.startDate || null,
              end_date: campaign.endDate || null,
              data_source: 'amazon_api',
              last_updated: new Date().toISOString()
            }))

            const { error: campaignError } = await supabaseClient
              .from('campaigns')
              .upsert(campaignInserts, {
                onConflict: 'amazon_campaign_id,connection_id',
                ignoreDuplicates: false
              })

            if (!campaignError) {
              campaignsSynced = campaigns.length
              
              // Update connection to active status
              await supabaseClient
                .from('amazon_connections')
                .update({ 
                  status: 'active',
                  updated_at: new Date().toISOString()
                })
                .eq('id', connectionId)
            } else {
              syncError = campaignError.message
            }
          }
        } else {
          const errorText = await campaignsResponse.text()
          syncError = `Campaign sync failed: ${campaignsResponse.status} - ${errorText}`
        }
      } catch (error) {
        syncError = `Campaign sync error: ${error.message}`
      }
    }

    // Prepare detailed response
    const result = {
      success: true,
      profilesFound,
      activeProfilesFound,
      detectionStrategy,
      campaignsSynced,
      syncAttempted,
      message: '',
      details: '',
      recommendations: []
    }

    if (activeProfilesFound > 0) {
      if (campaignsSynced > 0) {
        result.message = `Successfully found ${activeProfilesFound} advertising profile(s) and synced ${campaignsSynced} campaigns.`
        result.details = `Your Amazon Advertising account is now fully connected and operational. Detection method: ${detectionStrategy}.`
      } else if (syncAttempted && syncError) {
        result.message = `Found ${activeProfilesFound} advertising profile(s) but campaign sync failed.`
        result.details = `Profile detection successful using ${detectionStrategy}, but encountered issues syncing campaigns: ${syncError}`
        result.recommendations.push('Try running a regular sync operation')
        result.recommendations.push('Check if your advertising campaigns are properly set up in Amazon')
      } else {
        result.message = `Found ${activeProfilesFound} advertising profile(s). Ready for campaign sync.`
        result.details = `Profile detection successful using ${detectionStrategy}. You can now run a regular sync to import your campaigns.`
        result.recommendations.push('Run a regular sync to import your campaigns')
      }
    } else if (profilesFound > 0) {
      result.message = `Found ${profilesFound} profile(s) but none are suitable for advertising.`
      result.details = 'Profiles were detected but they may not have advertising capabilities enabled.'
      result.recommendations.push('Ensure Amazon Advertising is set up for your account')
      result.recommendations.push('Check that you have active advertising campaigns')
      result.recommendations.push('Verify your account has the necessary permissions')
    } else {
      result.success = false
      result.message = 'Still no advertising profiles found after enhanced detection.'
      result.details = `Attempted multiple detection strategies but no profiles were discovered. Last error: ${lastError ? JSON.stringify(lastError) : 'None'}`
      result.recommendations.push('Verify you have an Amazon Advertising account at advertising.amazon.com')
      result.recommendations.push('Ensure you have created at least one advertising campaign')
      result.recommendations.push('Check that your account has the proper permissions')
      result.recommendations.push('Try reconnecting your Amazon account')
    }

    console.log('=== Force Sync Completed ===')
    console.log('Result:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== Force Sync Error ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during force sync',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
