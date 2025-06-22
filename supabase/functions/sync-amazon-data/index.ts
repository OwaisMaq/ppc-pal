
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchCampaignReports, updateCampaignMetrics } from './reporting.ts'

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
    const { data: connection, error: connectionError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      console.error('Connection error:', connectionError)
      throw new Error('Connection not found')
    }

    // Check for invalid profile IDs
    if (connection.profile_id === 'needs_setup' || 
        connection.profile_id.startsWith('profile_') || 
        connection.profile_id === 'unknown') {
      console.error('Invalid profile ID detected:', connection.profile_id)
      
      // Update connection status to indicate it needs reconnection
      await supabase
        .from('amazon_connections')
        .update({ 
          status: 'error',
          last_sync_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      throw new Error('This connection has an invalid profile ID and needs to be reconnected. Please disconnect and reconnect your Amazon account.')
    }

    if (connection.status !== 'active') {
      throw new Error('Connection is not active')
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Amazon Client ID not configured')
    }

    console.log('Using profile ID:', connection.profile_id)

    // Check if token needs refresh
    const now = new Date()
    const expiresAt = new Date(connection.token_expires_at)
    
    let accessToken = connection.access_token
    
    if (now >= expiresAt) {
      console.log('Token expired, attempting refresh...')
      
      if (!connection.refresh_token) {
        await supabase
          .from('amazon_connections')
          .update({ status: 'expired' })
          .eq('id', connectionId)
        throw new Error('Token expired and no refresh token available')
      }

      // Try to refresh the token
      const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: clientId,
          client_secret: Deno.env.get('AMAZON_CLIENT_SECRET') ?? '',
        }),
      })

      if (!refreshResponse.ok) {
        console.error('Token refresh failed:', await refreshResponse.text())
        await supabase
          .from('amazon_connections')
          .update({ status: 'expired' })
          .eq('id', connectionId)
        throw new Error('Failed to refresh token, please reconnect your account')
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Update the connection with new token
      await supabase
        .from('amazon_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || connection.refresh_token,
          token_expires_at: new Date(Date.now() + ((refreshData.expires_in || 3600) * 1000)).toISOString(),
        })
        .eq('id', connectionId)

      console.log('Token refreshed successfully')
    }

    // Sync campaigns - try different API regions
    const regions = ['na', 'eu', 'fe'] // North America, Europe, Far East
    let campaignsData = []
    let successfulRegion = null

    for (const region of regions) {
      const baseUrl = `https://advertising-api${region === 'na' ? '' : '-' + region}.amazon.com`
      
      console.log(`Trying to fetch campaigns from ${region} region: ${baseUrl}`)
      
      try {
        const campaignsResponse = await fetch(`${baseUrl}/v2/campaigns`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': connection.profile_id,
            'Content-Type': 'application/json',
          },
        })

        console.log(`Campaigns response status for ${region}:`, campaignsResponse.status)

        if (campaignsResponse.ok) {
          campaignsData = await campaignsResponse.json()
          successfulRegion = region
          console.log(`Successfully retrieved ${campaignsData.length} campaigns from ${region} region`)
          break
        } else {
          const errorText = await campaignsResponse.text()
          console.log(`Failed to fetch from ${region}:`, errorText)
          
          // Check for invalid scope error specifically
          if (errorText.includes('Invalid scope')) {
            console.error('Invalid scope error detected - profile ID is likely invalid')
            await supabase
              .from('amazon_connections')
              .update({ 
                status: 'error',
                last_sync_at: new Date().toISOString()
              })
              .eq('id', connectionId)
            throw new Error('Invalid Amazon profile scope. This connection needs to be reconnected with a valid Amazon Advertising profile.')
          }
        }
      } catch (error) {
        console.log(`Error fetching from ${region}:`, error.message)
        continue
      }
    }

    if (!successfulRegion) {
      // Mark connection as having errors
      await supabase
        .from('amazon_connections')
        .update({ 
          status: 'error',
          last_sync_at: new Date().toISOString()
        })
        .eq('id', connectionId)
      
      throw new Error('Failed to fetch campaigns from all regions. This may indicate an invalid profile ID or insufficient permissions. Please try reconnecting your Amazon account.')
    }

    // Store campaigns
    let campaignsStored = 0
    const campaignIds = []
    
    for (const campaign of campaignsData) {
      try {
        const { error: campaignError } = await supabase
          .from('campaigns')
          .upsert({
            connection_id: connectionId,
            amazon_campaign_id: campaign.campaignId.toString(),
            name: campaign.name,
            campaign_type: campaign.campaignType,
            targeting_type: campaign.targetingType,
            status: campaign.state.toLowerCase(),
            daily_budget: campaign.dailyBudget,
            start_date: campaign.startDate,
            end_date: campaign.endDate,
            impressions: 0,
            clicks: 0,
            spend: 0,
            sales: 0,
            orders: 0,
          }, {
            onConflict: 'connection_id, amazon_campaign_id'
          })

        if (!campaignError) {
          campaignsStored++
          campaignIds.push(campaign.campaignId.toString())
        } else {
          console.error('Error storing campaign:', campaignError)
        }
      } catch (error) {
        console.error('Error processing campaign:', error)
      }
    }

    console.log(`Stored ${campaignsStored} campaigns successfully`)

    // Fetch and update performance metrics
    const baseUrl = `https://advertising-api${successfulRegion === 'na' ? '' : '-' + successfulRegion}.amazon.com`
    
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
    const { data: storedCampaigns } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id')
      .eq('connection_id', connectionId)

    let adGroupsStored = 0

    for (const campaign of storedCampaigns || []) {
      try {
        console.log('Fetching ad groups for campaign:', campaign.amazon_campaign_id)
        
        const adGroupsResponse = await fetch(`${baseUrl}/v2/adGroups?campaignIdFilter=${campaign.amazon_campaign_id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': connection.profile_id,
            'Content-Type': 'application/json',
          },
        })

        if (adGroupsResponse.ok) {
          const adGroupsData = await adGroupsResponse.json()
          
          for (const adGroup of adGroupsData) {
            const { error: adGroupError } = await supabase
              .from('ad_groups')
              .upsert({
                campaign_id: campaign.id,
                amazon_adgroup_id: adGroup.adGroupId.toString(),
                name: adGroup.name,
                status: adGroup.state.toLowerCase(),
                default_bid: adGroup.defaultBid,
                impressions: 0,
                clicks: 0,
                spend: 0,
                sales: 0,
                orders: 0,
              }, {
                onConflict: 'campaign_id, amazon_adgroup_id'
              })

            if (!adGroupError) {
              adGroupsStored++
            }
          }
        }
      } catch (error) {
        console.error('Error fetching ad groups for campaign:', campaign.amazon_campaign_id, error)
      }
    }

    console.log(`Stored ${adGroupsStored} ad groups successfully`)

    // Update last sync time and status
    await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', connectionId)

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
