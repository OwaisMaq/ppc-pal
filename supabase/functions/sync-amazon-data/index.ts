
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
    
    // If token expires within 5 minutes, try to refresh it
    const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds
    if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
      console.log('Token expired or expiring soon, attempting refresh...')
      
      const clientId = Deno.env.get('AMAZON_CLIENT_ID')
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
      
      if (!clientSecret) {
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'error',
            setup_required_reason: 'Missing Amazon client secret'
          })
          .eq('id', connectionId)
        
        throw new Error('Amazon client secret not configured')
      }

      try {
        console.log('Attempting token refresh...')
        
        const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: connection.refresh_token,
            client_id: clientId!,
            client_secret: clientSecret,
          }),
        })

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json()
          const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
          
          // Update connection with new tokens
          await supabase
            .from('amazon_connections')
            .update({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token || connection.refresh_token,
              token_expires_at: newExpiresAt.toISOString(),
              status: 'active',
              setup_required_reason: null
            })
            .eq('id', connectionId)
          
          accessToken = tokenData.access_token
          console.log('Token refreshed successfully')
        } else {
          throw new Error('Token refresh failed')
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        
        // Mark as expired if refresh fails
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'expired',
            setup_required_reason: 'Token refresh failed - please reconnect'
          })
          .eq('id', connectionId)
        
        throw new Error('Token expired and refresh failed, please reconnect your account')
      }
    }

    // Use region-specific API endpoint
    const apiEndpoint = connection.advertising_api_endpoint || 'https://advertising-api.amazon.com'
    console.log('Using API endpoint:', apiEndpoint)

    // Sync campaigns with performance data
    console.log('Fetching campaigns...')
    const campaignsResponse = await fetch(`${apiEndpoint}/v2/campaigns`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': connection.profile_id,
      },
    })

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text()
      console.error('Campaigns API error:', campaignsResponse.status, errorText)
      throw new Error(`Failed to fetch campaigns: ${campaignsResponse.status} ${errorText}`)
    }

    const campaignsData = await campaignsResponse.json()
    console.log('Retrieved campaigns:', campaignsData.length)

    // Prepare date range for performance data (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    const reportStartDate = startDate.toISOString().split('T')[0]
    const reportEndDate = endDate.toISOString().split('T')[0]

    // Store campaigns with basic data first
    const campaignIds: string[] = []
    for (const campaign of campaignsData) {
      if (!campaign.campaignId || !campaign.name) {
        console.warn('Skipping invalid campaign:', campaign)
        continue
      }

      campaignIds.push(campaign.campaignId.toString())
      
      const { error: campaignError } = await supabase
        .from('campaigns')
        .upsert({
          connection_id: connectionId,
          amazon_campaign_id: campaign.campaignId.toString(),
          name: campaign.name,
          campaign_type: campaign.campaignType,
          targeting_type: campaign.targetingType,
          status: campaign.state ? campaign.state.toLowerCase() : 'unknown',
          daily_budget: campaign.dailyBudget || null,
          start_date: campaign.startDate || null,
          end_date: campaign.endDate || null,
          impressions: 0,
          clicks: 0,
          spend: 0,
          sales: 0,
          orders: 0,
        }, {
          onConflict: 'connection_id, amazon_campaign_id'
        })

      if (campaignError) {
        console.error('Error storing campaign:', campaign.campaignId, campaignError)
      }
    }

    // Fetch performance data for campaigns
    if (campaignIds.length > 0) {
      console.log('Fetching campaign performance data...')
      
      // Process campaigns in batches of 100
      const batchSize = 100
      for (let i = 0; i < campaignIds.length; i += batchSize) {
        const batch = campaignIds.slice(i, i + batchSize)
        
        try {
          const reportPayload = {
            startDate: reportStartDate,
            endDate: reportEndDate,
            configuration: {
              adProduct: 'SPONSORED_PRODUCTS',
              columns: [
                'campaignId',
                'impressions',
                'clicks',
                'cost',
                'attributedSales30d',
                'attributedUnitsOrdered30d'
              ],
              reportTypeId: 'spCampaigns',
              timeUnit: 'SUMMARY',
              format: 'GZIP_JSON'
            },
            campaignIdFilter: batch
          }

          const reportResponse = await fetch(`${apiEndpoint}/reporting/reports`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Amazon-Advertising-API-ClientId': clientId,
              'Amazon-Advertising-API-Scope': connection.profile_id,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(reportPayload)
          })

          if (reportResponse.ok) {
            const reportData = await reportResponse.json()
            console.log(`Retrieved performance data for ${reportData.length} campaigns in batch ${i/batchSize + 1}`)
            
            // Update campaigns with performance data
            for (const perfData of reportData) {
              if (!perfData.campaignId) continue
              
              const { error: updateError } = await supabase
                .from('campaigns')
                .update({
                  impressions: parseInt(perfData.impressions || '0'),
                  clicks: parseInt(perfData.clicks || '0'),
                  spend: parseFloat(perfData.cost || '0'),
                  sales: parseFloat(perfData.attributedSales30d || '0'),
                  orders: parseInt(perfData.attributedUnitsOrdered30d || '0'),
                  last_updated: new Date().toISOString()
                })
                .eq('connection_id', connectionId)
                .eq('amazon_campaign_id', perfData.campaignId.toString())

              if (updateError) {
                console.error('Error updating campaign performance:', perfData.campaignId, updateError)
              }
            }
          } else {
            const errorText = await reportResponse.text()
            console.error(`Performance data API error for batch ${i/batchSize + 1}:`, reportResponse.status, errorText)
          }
        } catch (batchError) {
          console.error(`Error processing batch ${i/batchSize + 1}:`, batchError)
        }
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < campaignIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    // Sync ad groups for each campaign
    const { data: storedCampaigns } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id')
      .eq('connection_id', connectionId)

    for (const campaign of storedCampaigns || []) {
      console.log('Fetching ad groups for campaign:', campaign.amazon_campaign_id)
      
      const adGroupsResponse = await fetch(`${apiEndpoint}/v2/adGroups?campaignIdFilter=${campaign.amazon_campaign_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
        },
      })

      if (adGroupsResponse.ok) {
        const adGroupsData = await adGroupsResponse.json()
        
        for (const adGroup of adGroupsData) {
          const { data: storedAdGroup } = await supabase
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
            .select('id')
            .single()

          if (storedAdGroup) {
            // Fetch keywords for this ad group
            console.log('Fetching keywords for ad group:', adGroup.adGroupId)
            
            const keywordsResponse = await fetch(`${apiEndpoint}/v2/keywords?adGroupIdFilter=${adGroup.adGroupId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': connection.profile_id,
              },
            })

            if (keywordsResponse.ok) {
              const keywordsData = await keywordsResponse.json()
              console.log(`Retrieved ${keywordsData.length} keywords for ad group ${adGroup.adGroupId}`)
              
              for (const keyword of keywordsData) {
                if (!keyword.keywordId || !keyword.keywordText) {
                  console.warn('Skipping invalid keyword:', keyword)
                  continue
                }

                await supabase
                  .from('keywords')
                  .upsert({
                    adgroup_id: storedAdGroup.id,
                    amazon_keyword_id: keyword.keywordId.toString(),
                    keyword_text: keyword.keywordText,
                    match_type: keyword.matchType || 'exact',
                    bid: keyword.bid || null,
                    status: keyword.state ? keyword.state.toLowerCase() : 'enabled',
                    impressions: 0,
                    clicks: 0,
                    spend: 0,
                    sales: 0,
                    orders: 0,
                  }, {
                    onConflict: 'adgroup_id, amazon_keyword_id'
                  })
              }
            } else {
              const errorText = await keywordsResponse.text()
              console.error(`Keywords API error for ad group ${adGroup.adGroupId}:`, keywordsResponse.status, errorText)
            }
          }
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
