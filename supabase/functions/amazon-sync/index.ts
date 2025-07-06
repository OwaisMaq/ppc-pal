
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
    // Enhanced authentication debug
    const authHeader = req.headers.get('authorization')
    console.log('=== Enhanced Authentication Debug ===')
    console.log('Auth header present:', !!authHeader)
    console.log('Auth header format:', authHeader ? 
      (authHeader.startsWith('Bearer ') ? 'Bearer token format' : 'Invalid format') : 'missing')

    // Create Supabase clients
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader || '',
          },
        },
      }
    )

    // Enhanced user verification
    console.log('=== User Authentication Verification ===')
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    
    console.log('Auth verification result:', {
      userExists: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message || 'No user found')
      
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: authError?.message || 'Valid session not found. Please sign in again.',
          requiresReauth: true
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('=== User Authentication Successful ===')

    // Parse request body
    const { connectionId } = await req.json()
    
    console.log('=== Amazon Sync Request Details ===')
    console.log('Connection ID:', connectionId)

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Connection ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced connection verification
    console.log('=== Database Connection Verification ===')
    const { data: connection, error: fetchError } = await supabaseAdmin
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    console.log('Connection query result:', {
      connectionFound: !!connection,
      fetchError: fetchError?.message,
      userIdMatch: connection?.user_id === user.id
    })

    if (fetchError || !connection) {
      console.error('Connection not found or access denied:', fetchError?.message)
      
      return new Response(
        JSON.stringify({ 
          error: 'Connection not found or access denied',
          details: 'The specified Amazon connection was not found or you do not have access to it'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== Connection Details ===')
    console.log('Profile ID:', connection.profile_id)
    console.log('Status:', connection.status)
    console.log('Profile Name:', connection.profile_name)
    console.log('Marketplace ID:', connection.marketplace_id)

    // Enhanced token validation
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()
    const tokenValid = tokenExpiry > now
    
    console.log('=== Token Validation ===')
    console.log('Token expiry:', tokenExpiry.toISOString())
    console.log('Current time:', now.toISOString())
    console.log('Token valid:', tokenValid)
    
    if (!tokenValid) {
      console.error('Token has expired')
      
      await supabaseAdmin
        .from('amazon_connections')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      return new Response(
        JSON.stringify({ 
          error: 'Access token has expired',
          details: 'Please reconnect your Amazon account to refresh the token',
          requiresReconnection: true,
          expiredAt: tokenExpiry.toISOString()
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate Amazon API credentials
    const clientId = Deno.env.get('AMAZON_CLIENT_ID')
    const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET')
    
    console.log('=== Amazon API Credentials Check ===')
    console.log('Client ID configured:', !!clientId)
    console.log('Client Secret configured:', !!clientSecret)
    
    if (!clientId || !clientSecret) {
      console.error('Missing Amazon credentials')
      
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon API credentials not properly configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced profile validation and recovery
    console.log('=== Profile Validation ===')
    let currentProfileId = connection.profile_id
    
    if (!currentProfileId || 
        currentProfileId === 'setup_required_no_profiles_found' || 
        currentProfileId === 'invalid' ||
        currentProfileId.includes('error')) {
      
      console.log('Invalid profile detected, attempting recovery...')
      
      const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      })

      console.log('Profile recovery response:', {
        status: profilesResponse.status,
        ok: profilesResponse.ok
      })

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json()
        console.log('Profiles found during recovery:', profiles.length)

        if (profiles && profiles.length > 0) {
          const firstProfile = profiles[0]
          const profileId = firstProfile.profileId.toString()
          const profileName = firstProfile.countryCode || `Profile ${firstProfile.profileId}`
          const marketplaceId = firstProfile.accountInfo?.marketplaceStringId || firstProfile.countryCode

          // Update connection with recovered profile
          await supabaseAdmin
            .from('amazon_connections')
            .update({
              profile_id: profileId,
              profile_name: profileName,
              marketplace_id: marketplaceId,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionId)

          currentProfileId = profileId
          console.log('Profile recovery successful:', { profileId, profileName })
        } else {
          console.log('No profiles found during recovery')
          
          await supabaseAdmin
            .from('amazon_connections')
            .update({ 
              status: 'setup_required',
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionId)

          return new Response(
            JSON.stringify({ 
              error: 'No advertising profiles found',
              details: 'Please set up Amazon Advertising first at advertising.amazon.com, then try Enhanced Sync',
              requiresSetup: true
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        const errorText = await profilesResponse.text()
        console.error('Profile recovery failed:', profilesResponse.status, errorText)
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to access Amazon Advertising API during profile recovery',
            details: `API returned ${profilesResponse.status}: ${errorText}`,
            requiresReconnection: profilesResponse.status === 401
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Final profile validation
    if (!currentProfileId || !/^\d+$/.test(currentProfileId)) {
      console.error('Invalid profile configuration after recovery')
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid profile configuration',
          details: 'Profile ID is missing or invalid. Please use Enhanced Sync or reconnect your account.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced campaign fetching with proper headers
    console.log('=== Enhanced Campaign Fetch ===')
    console.log('Using profile ID:', currentProfileId)
    
    const campaignHeaders = {
      'Authorization': `Bearer ${connection.access_token}`,
      'Amazon-Advertising-API-ClientId': clientId,
      'Amazon-Advertising-API-Scope': currentProfileId,
      'Content-Type': 'application/json',
    }
    
    console.log('Campaign API headers configured:', {
      hasAuth: !!campaignHeaders['Authorization'],
      hasClientId: !!campaignHeaders['Amazon-Advertising-API-ClientId'],
      hasScope: !!campaignHeaders['Amazon-Advertising-API-Scope'],
      scopeValue: campaignHeaders['Amazon-Advertising-API-Scope']
    })

    let campaigns = []
    let lastError = null

    // Multiple retry attempts with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`=== Campaign Fetch Attempt ${attempt} ===`)
      
      try {
        const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
          headers: campaignHeaders,
        })

        console.log('Campaign API response:', {
          status: campaignsResponse.status,
          statusText: campaignsResponse.statusText,
          ok: campaignsResponse.ok
        })

        if (campaignsResponse.ok) {
          campaigns = await campaignsResponse.json()
          console.log(`Campaign fetch successful (attempt ${attempt}):`, {
            campaignCount: campaigns.length
          })
          break
        } else {
          const errorText = await campaignsResponse.text()
          console.error(`Campaign fetch failed (attempt ${attempt}):`, {
            status: campaignsResponse.status,
            errorBody: errorText
          })
          
          lastError = { 
            status: campaignsResponse.status, 
            statusText: campaignsResponse.statusText,
            text: errorText 
          }
          
          // Handle specific error codes
          if (campaignsResponse.status === 401) {
            console.error('401 Unauthorized - Token or scope invalid')
            
            await supabaseAdmin
              .from('amazon_connections')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionId)

            return new Response(
              JSON.stringify({ 
                error: 'Access token is invalid or expired',
                details: 'Amazon API returned 401 Unauthorized. Please reconnect your Amazon account.',
                requiresReconnection: true,
                apiResponse: errorText
              }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          if (campaignsResponse.status === 403) {
            console.error('403 Forbidden - Access denied or profile scope invalid')
            
            return new Response(
              JSON.stringify({ 
                error: 'Access denied to Amazon Advertising API',
                details: 'Amazon API returned 403 Forbidden. The profile scope may be invalid or you may not have access to this advertising profile.',
                apiResponse: errorText,
                currentProfileId: currentProfileId
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      } catch (fetchError) {
        console.error(`Campaign fetch network error (attempt ${attempt}):`, fetchError.message)
        lastError = { message: fetchError.message, type: 'network_error' }
      }
      
      // Wait before retry with exponential backoff
      if (attempt < 3) {
        const waitTime = 1000 * Math.pow(2, attempt - 1)
        console.log(`Waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    // Handle final failure after all retries
    if (campaigns.length === 0 && lastError) {
      console.error('All campaign fetch attempts failed:', lastError)
      
      await supabaseAdmin
        .from('amazon_connections')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch campaigns from Amazon after multiple attempts',
          details: lastError.text || lastError.message || 'API communication failed',
          lastError: lastError,
          profileId: currentProfileId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle successful API call but no campaigns
    if (!campaigns || campaigns.length === 0) {
      console.log('Successful API call - No campaigns found')
      
      await supabaseAdmin
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
          message: 'Sync completed successfully. No campaigns found in your Amazon Advertising account.',
          campaignCount: 0,
          campaignsSynced: 0,
          syncStatus: 'success_no_campaigns',
          details: 'This is normal for new advertising accounts. Create campaigns in Amazon Advertising to see them here.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process and save campaigns
    console.log('=== Processing Campaigns for Database ===')
    const campaignInserts = campaigns.map((campaign) => {
      return {
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
      }
    })

    console.log('Upserting campaigns:', campaignInserts.length)
    const { error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .upsert(campaignInserts, {
        onConflict: 'amazon_campaign_id,connection_id',
        ignoreDuplicates: false
      })

    if (campaignError) {
      console.error('Campaign upsert error:', campaignError)
      
      await supabaseAdmin
        .from('amazon_connections')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to save campaigns to database',
          details: campaignError.message,
          sqlError: campaignError
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Final success update
    await supabaseAdmin
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
        campaignCount: campaigns.length,
        campaignsSynced: campaigns.length,
        syncStatus: 'success_with_campaigns',
        syncTimestamp: new Date().toISOString(),
        profileId: currentProfileId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== Unexpected Amazon Sync Error ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during sync',
        details: error?.message || 'Unknown error occurred',
        errorType: error?.constructor?.name || 'UnknownError'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
