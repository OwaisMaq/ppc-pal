
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
    
    console.log('=== Amazon Sync Started ===')
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

    console.log('Connection details:', {
      profile_id: connection.profile_id,
      status: connection.status,
      profile_name: connection.profile_name
    })

    // Check if token is expired
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()
    
    if (tokenExpiry <= now) {
      console.error('Token expired for connection:', connectionId)
      
      // Update connection status to expired
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
          details: 'Please reconnect your Amazon account'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle special case where no profiles were found initially
    if (connection.profile_id === 'setup_required_no_profiles_found') {
      console.log('Attempting to fetch profiles for connection with no initial profiles...')
      
      const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID') ?? '',
          'Content-Type': 'application/json',
        },
      })

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json()
        console.log('Profiles found on retry:', profiles.length)

        if (profiles && profiles.length > 0) {
          const firstProfile = profiles[0]
          const profileId = firstProfile.profileId.toString()
          const profileName = firstProfile.countryCode || `Profile ${firstProfile.profileId}`
          const marketplaceId = firstProfile.marketplaceStringId || firstProfile.countryCode

          // Update connection with found profile
          await supabaseClient
            .from('amazon_connections')
            .update({
              profile_id: profileId,
              profile_name: profileName,
              marketplace_id: marketplaceId,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionId)

          // Update local connection object for campaign sync
          connection.profile_id = profileId
          connection.profile_name = profileName
          connection.marketplace_id = marketplaceId
          
          console.log('Updated connection with profile:', { profileId, profileName })
        } else {
          console.log('Still no profiles found')
          return new Response(
            JSON.stringify({ 
              error: 'No advertising profiles found',
              details: 'Please set up Amazon Advertising first, then try again'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        console.error('Failed to fetch profiles:', profilesResponse.status)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to access Amazon Advertising API',
            details: 'Please ensure your Amazon Advertising account is properly set up'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fetch campaigns from Amazon API
    console.log('Fetching campaigns from Amazon API...')
    const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Amazon-Advertising-API-ClientId': Deno.env.get('AMAZON_CLIENT_ID') ?? '',
        'Amazon-Advertising-API-Scope': connection.profile_id,
        'Content-Type': 'application/json',
      },
    })

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text()
      console.error('Failed to fetch campaigns:', campaignsResponse.status, errorText)
      
      // Update connection status to error
      await supabaseClient
        .from('amazon_connections')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch campaigns from Amazon',
          details: errorText
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const campaigns = await campaignsResponse.json()
    console.log('Campaigns fetched:', campaigns.length)

    if (!campaigns || campaigns.length === 0) {
      console.log('No campaigns found')
      
      // Update sync timestamp even if no campaigns
      await supabaseClient
        .from('amazon_connections')
        .update({ 
          last_sync_at: new Date().toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Sync completed but no campaigns found',
          campaignCount: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process and upsert campaigns
    console.log('Processing campaigns...')
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

    // Upsert campaigns
    const { error: campaignError } = await supabaseClient
      .from('campaigns')
      .upsert(campaignInserts, {
        onConflict: 'amazon_campaign_id,connection_id',
        ignoreDuplicates: false
      })

    if (campaignError) {
      console.error('Error upserting campaigns:', campaignError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save campaigns to database',
          details: campaignError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update connection status and sync timestamp
    await supabaseClient
      .from('amazon_connections')
      .update({ 
        status: 'active',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    console.log('=== Amazon Sync Completed Successfully ===')
    console.log('Campaigns synced:', campaigns.length)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${campaigns.length} campaigns from Amazon`,
        campaignCount: campaigns.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== Amazon Sync Error ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during sync',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
