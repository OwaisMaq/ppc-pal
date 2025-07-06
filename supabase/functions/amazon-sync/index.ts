
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
    console.log('Auth header length:', authHeader ? authHeader.length : 0)
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

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

    // Enhanced user verification with detailed logging
    console.log('=== User Authentication Verification ===')
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    
    console.log('Auth verification result:', {
      userExists: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message,
      authErrorCode: authError?.code
    })
    
    if (authError) {
      console.error('=== Authentication Error Details ===')
      console.error('Error type:', typeof authError)
      console.error('Error message:', authError.message)
      console.error('Error code:', authError.code)
      console.error('Full error object:', JSON.stringify(authError, null, 2))
      
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: authError.message,
          errorCode: authError.code,
          debugInfo: 'Check browser console for detailed authentication logs'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!user) {
      console.error('=== No User Found After Auth Check ===')
      console.error('Auth header was:', authHeader ? 'present' : 'missing')
      console.error('Supabase URL configured:', !!Deno.env.get('SUPABASE_URL'))
      console.error('Anon key configured:', !!Deno.env.get('SUPABASE_ANON_KEY'))
      
      return new Response(
        JSON.stringify({ 
          error: 'User not authenticated',
          details: 'Valid session not found. Please sign in again.',
          debugInfo: 'Authentication token may be expired or invalid'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('=== User Authentication Successful ===')
    console.log('Authenticated user ID:', user.id)
    console.log('User email:', user.email)
    console.log('User created at:', user.created_at)

    // Parse request body with error handling
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('=== Request Body Parse Error ===')
      console.error('Parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { connectionId } = requestBody
    
    console.log('=== Amazon Sync Request Details ===')
    console.log('Connection ID:', connectionId)
    console.log('Request body keys:', Object.keys(requestBody))

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Connection ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced connection verification with detailed logging
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
      fetchErrorCode: fetchError?.code,
      connectionUserId: connection?.user_id,
      requestUserId: user.id,
      userIdMatch: connection?.user_id === user.id
    })

    if (fetchError) {
      console.error('=== Connection Fetch Error ===')
      console.error('Error details:', fetchError)
      console.error('Error code:', fetchError.code)
      console.error('Error hint:', fetchError.hint)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch connection',
          details: fetchError.message,
          errorCode: fetchError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!connection) {
      console.error('=== Connection Not Found ===')
      console.error('Searched for connection ID:', connectionId)
      console.error('With user ID:', user.id)
      
      // Additional debug: check if connection exists for any user
      const { data: anyConnection } = await supabaseAdmin
        .from('amazon_connections')
        .select('id, user_id')
        .eq('id', connectionId)
        .single()
      
      console.log('Connection exists for other user:', !!anyConnection)
      if (anyConnection) {
        console.log('Connection belongs to user:', anyConnection.user_id)
        console.log('Current user:', user.id)
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Connection not found or access denied',
          details: 'The specified Amazon connection was not found or you do not have access to it'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== Connection Details ===')
    console.log('Connection ID:', connection.id)
    console.log('Profile ID:', connection.profile_id)
    console.log('Status:', connection.status)
    console.log('Profile Name:', connection.profile_name)
    console.log('Marketplace ID:', connection.marketplace_id)
    console.log('Token expires at:', connection.token_expires_at)
    console.log('Last sync at:', connection.last_sync_at)

    // Enhanced token validation
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()
    const tokenValid = tokenExpiry > now
    const timeUntilExpiry = tokenExpiry.getTime() - now.getTime()
    
    console.log('=== Token Validation ===')
    console.log('Token expiry:', tokenExpiry.toISOString())
    console.log('Current time:', now.toISOString())
    console.log('Token valid:', tokenValid)
    console.log('Time until expiry (minutes):', Math.round(timeUntilExpiry / (1000 * 60)))
    
    if (!tokenValid) {
      console.error('=== Token Expired ===')
      console.error('Token expired by (minutes):', Math.round(Math.abs(timeUntilExpiry) / (1000 * 60)))
      
      // Update connection status
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
    console.log('Access token length:', connection.access_token?.length || 0)
    
    if (!clientId || !clientSecret) {
      console.error('=== Missing Amazon Credentials ===')
      console.error('Client ID missing:', !clientId)
      console.error('Client Secret missing:', !clientSecret)
      
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon API credentials not properly configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle profile setup requirements
    if (connection.profile_id === 'setup_required_no_profiles_found') {
      console.log('=== Attempting Profile Recovery ===')
      
      const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      })

      console.log('Profile recovery response:', {
        status: profilesResponse.status,
        statusText: profilesResponse.statusText,
        ok: profilesResponse.ok
      })

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json()
        console.log('Recovered profiles:', profiles.length)

        if (profiles && profiles.length > 0) {
          const firstProfile = profiles[0]
          const profileId = firstProfile.profileId.toString()
          const profileName = firstProfile.countryCode || `Profile ${firstProfile.profileId}`
          const marketplaceId = firstProfile.accountInfo?.marketplaceStringId || firstProfile.countryCode

          // Update connection with found profile
          await supabaseAdmin
            .from('amazon_connections')
            .update({
              profile_id: profileId,
              profile_name: profileName,
              marketplace_id: marketplaceId,
              status: 'setup_required',
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionId)

          // Update local connection object
          connection.profile_id = profileId
          connection.profile_name = profileName
          connection.marketplace_id = marketplaceId
          
          console.log('Profile recovery successful:', { profileId, profileName })
        } else {
          console.log('=== No Profiles Found During Recovery ===')
          
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
              details: 'Please set up Amazon Advertising first at advertising.amazon.com, then try again',
              requiresSetup: true
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        const errorText = await profilesResponse.text()
        console.error('=== Profile Recovery Failed ===')
        console.error('Response status:', profilesResponse.status)
        console.error('Response text:', errorText)
        
        await supabaseAdmin
          .from('amazon_connections')
          .update({ 
            status: 'error',
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId)

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

    // Validate final profile configuration
    if (!connection.profile_id || connection.profile_id === 'invalid') {
      console.error('=== Invalid Profile Configuration ===')
      console.error('Profile ID:', connection.profile_id)
      
      await supabaseAdmin
        .from('amazon_connections')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      return new Response(
        JSON.stringify({ 
          error: 'Invalid profile configuration',
          details: 'Profile ID is missing or invalid. Please reconnect your Amazon account.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced campaign fetching with detailed API logging
    console.log('=== Amazon API Campaign Fetch ===')
    console.log('Using profile ID:', connection.profile_id)
    
    const campaignHeaders = {
      'Authorization': `Bearer ${connection.access_token}`,
      'Amazon-Advertising-API-ClientId': clientId,
      'Amazon-Advertising-API-Scope': connection.profile_id,
      'Content-Type': 'application/json',
    }
    
    console.log('Request headers (sensitive data masked):', {
      'Authorization': 'Bearer [MASKED]',
      'Amazon-Advertising-API-ClientId': clientId,
      'Amazon-Advertising-API-Scope': connection.profile_id,
      'Content-Type': 'application/json'
    })

    let campaigns = []
    let lastError = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`=== Campaign Fetch Attempt ${attempt} ===`)
      
      try {
        const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
          headers: campaignHeaders,
        })

        console.log('Campaign API response:', {
          status: campaignsResponse.status,
          statusText: campaignsResponse.statusText,
          ok: campaignsResponse.ok,
          headers: Object.fromEntries(campaignsResponse.headers.entries())
        })

        if (campaignsResponse.ok) {
          campaigns = await campaignsResponse.json()
          console.log(`Campaign fetch successful (attempt ${attempt}):`, {
            campaignCount: campaigns.length,
            campaignIds: campaigns.slice(0, 3).map(c => c.campaignId)
          })
          break
        } else {
          const errorText = await campaignsResponse.text()
          console.error(`Campaign fetch failed (attempt ${attempt}):`, {
            status: campaignsResponse.status,
            statusText: campaignsResponse.statusText,
            errorBody: errorText
          })
          
          lastError = { 
            status: campaignsResponse.status, 
            statusText: campaignsResponse.statusText,
            text: errorText 
          }
          
          if (campaignsResponse.status === 401) {
            console.error('=== 401 Unauthorized - Token Invalid ===')
            
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
            console.error('=== 403 Forbidden - Access Denied ===')
            
            await supabaseAdmin
              .from('amazon_connections')
              .update({ 
                status: 'error',
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionId)

            return new Response(
              JSON.stringify({ 
                error: 'Access denied to Amazon Advertising API',
                details: 'Amazon API returned 403 Forbidden. Please check your Amazon Advertising account permissions.',
                apiResponse: errorText
              }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      } catch (fetchError) {
        console.error(`Campaign fetch network error (attempt ${attempt}):`, {
          errorMessage: fetchError.message,
          errorType: fetchError.constructor.name
        })
        lastError = { message: fetchError.message, type: 'network_error' }
      }
      
      // Wait before retry
      if (attempt < 3) {
        const waitTime = 1000 * attempt
        console.log(`Waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    // Handle final failure after all retries
    if (campaigns.length === 0 && lastError) {
      console.error('=== All Campaign Fetch Attempts Failed ===')
      console.error('Final error:', lastError)
      
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
          details: lastError.text || lastError.message || 'Network or API error',
          lastError: lastError
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle successful API call but no campaigns
    if (!campaigns || campaigns.length === 0) {
      console.log('=== Successful API Call - No Campaigns Found ===')
      
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
    const campaignInserts = campaigns.map((campaign, index) => {
      console.log(`Processing campaign ${index + 1}:`, {
        id: campaign.campaignId,
        name: campaign.name,
        type: campaign.campaignType,
        state: campaign.state
      })
      
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

    console.log('=== Database Upsert ===')
    const { error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .upsert(campaignInserts, {
        onConflict: 'amazon_campaign_id,connection_id',
        ignoreDuplicates: false
      })

    if (campaignError) {
      console.error('=== Campaign Upsert Error ===')
      console.error('Error details:', campaignError)
      
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
    console.log('Final results:', {
      campaignsSynced: campaigns.length,
      connectionStatus: 'active',
      syncTimestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${campaigns.length} campaigns from Amazon`,
        campaignCount: campaigns.length,
        campaignsSynced: campaigns.length,
        syncStatus: 'success_with_campaigns',
        syncTimestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== Unexpected Amazon Sync Error ===')
    console.error('Error type:', typeof error)
    console.error('Error name:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
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
