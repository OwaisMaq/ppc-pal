
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      throw new Error('Connection not found')
    }

    if (connection.status !== 'active') {
      throw new Error('Connection is not active')
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    if (!clientId) {
      throw new Error('Amazon Client ID not configured')
    }

    // Check if token needs refresh
    const now = new Date()
    const expiresAt = new Date(connection.token_expires_at)
    
    let accessToken = connection.access_token
    
    if (now >= expiresAt) {
      console.log('Token expired, refreshing...')
      // Refresh token logic would go here
      // For now, mark as expired
      await supabase
        .from('amazon_connections')
        .update({ status: 'expired' })
        .eq('id', connectionId)
      
      throw new Error('Token expired, please reconnect your account')
    }

    // Sync campaigns
    console.log('Fetching campaigns...')
    const campaignsResponse = await fetch(`https://advertising-api.amazon.com/v2/campaigns`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': connection.profile_id,
      },
    })

    if (!campaignsResponse.ok) {
      throw new Error('Failed to fetch campaigns')
    }

    const campaignsData = await campaignsResponse.json()
    console.log('Retrieved campaigns:', campaignsData.length)

    // Store campaigns
    for (const campaign of campaignsData) {
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

      if (campaignError) {
        console.error('Error storing campaign:', campaignError)
      }
    }

    // Sync ad groups for each campaign
    const { data: storedCampaigns } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id')
      .eq('connection_id', connectionId)

    for (const campaign of storedCampaigns || []) {
      console.log('Fetching ad groups for campaign:', campaign.amazon_campaign_id)
      
      const adGroupsResponse = await fetch(`https://advertising-api.amazon.com/v2/adGroups?campaignIdFilter=${campaign.amazon_campaign_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
        },
      })

      if (adGroupsResponse.ok) {
        const adGroupsData = await adGroupsResponse.json()
        
        for (const adGroup of adGroupsData) {
          await supabase
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
        }
      }
    }

    // Update last sync time
    await supabase
      .from('amazon_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connectionId)

    console.log('Data sync completed successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Data sync completed' }),
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
