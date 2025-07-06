
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
    
    console.log('=== Amazon Connection Test Started ===')
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

    console.log('Testing connection:', {
      profile_id: connection.profile_id,
      profile_name: connection.profile_name,
      status: connection.status,
      marketplace_id: connection.marketplace_id
    })

    // Check if token is expired
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()
    
    if (tokenExpiry <= now) {
      console.error('Token expired for connection:', connectionId)
      return new Response(
        JSON.stringify({ 
          error: 'Access token has expired',
          details: 'Please reconnect your Amazon account',
          tokenExpiry: tokenExpiry.toISOString(),
          currentTime: now.toISOString(),
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

    // Test API connectivity with multiple endpoints
    const testResults = {
      profilesEndpoint: null,
      campaignsEndpoint: null,
      managerEndpoint: null,
      tokenValid: true,
      overallHealth: 'unknown'
    }

    // Test 1: Profiles endpoint
    console.log('Testing profiles endpoint...')
    try {
      const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      })

      testResults.profilesEndpoint = {
        status: profilesResponse.status,
        success: profilesResponse.ok,
        profileCount: 0
      }

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json()
        testResults.profilesEndpoint.profileCount = profiles?.length || 0
        console.log('Profiles endpoint test: SUCCESS', profiles?.length || 0, 'profiles')
      } else {
        const errorText = await profilesResponse.text()
        testResults.profilesEndpoint.error = errorText
        console.log('Profiles endpoint test: FAILED', profilesResponse.status, errorText)
      }
    } catch (error) {
      testResults.profilesEndpoint = {
        status: 0,
        success: false,
        error: error.message
      }
      console.log('Profiles endpoint test: ERROR', error.message)
    }

    // Test 2: Campaigns endpoint (if we have a valid profile)
    if (connection.profile_id && connection.profile_id !== 'setup_required_no_profiles_found') {
      console.log('Testing campaigns endpoint...')
      try {
        const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Amazon-Advertising-API-Scope': connection.profile_id,
            'Content-Type': 'application/json',
          },
        })

        testResults.campaignsEndpoint = {
          status: campaignsResponse.status,
          success: campaignsResponse.ok,
          campaignCount: 0
        }

        if (campaignsResponse.ok) {
          const campaigns = await campaignsResponse.json()
          testResults.campaignsEndpoint.campaignCount = campaigns?.length || 0
          console.log('Campaigns endpoint test: SUCCESS', campaigns?.length || 0, 'campaigns')
        } else {
          const errorText = await campaignsResponse.text()
          testResults.campaignsEndpoint.error = errorText
          console.log('Campaigns endpoint test: FAILED', campaignsResponse.status, errorText)
          
          if (campaignsResponse.status === 401) {
            testResults.tokenValid = false
          }
        }
      } catch (error) {
        testResults.campaignsEndpoint = {
          status: 0,
          success: false,
          error: error.message
        }
        console.log('Campaigns endpoint test: ERROR', error.message)
      }
    }

    // Test 3: Manager accounts endpoint
    console.log('Testing manager accounts endpoint...')
    try {
      const managerResponse = await fetch('https://advertising-api.amazon.com/v2/manager/accounts', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      })

      testResults.managerEndpoint = {
        status: managerResponse.status,
        success: managerResponse.ok,
        accountCount: 0
      }

      if (managerResponse.ok) {
        const accounts = await managerResponse.json()
        testResults.managerEndpoint.accountCount = accounts?.length || 0
        console.log('Manager endpoint test: SUCCESS', accounts?.length || 0, 'accounts')
      } else {
        const errorText = await managerResponse.text()
        testResults.managerEndpoint.error = errorText
        console.log('Manager endpoint test: FAILED', managerResponse.status, errorText)
      }
    } catch (error) {
      testResults.managerEndpoint = {
        status: 0,
        success: false,
        error: error.message
      }
      console.log('Manager endpoint test: ERROR', error.message)
    }

    // Determine overall health
    const profilesWorking = testResults.profilesEndpoint?.success
    const campaignsWorking = testResults.campaignsEndpoint?.success !== false // null or true
    const tokenWorking = testResults.tokenValid

    if (!tokenWorking) {
      testResults.overallHealth = 'token_invalid'
    } else if (profilesWorking && campaignsWorking) {
      testResults.overallHealth = 'healthy'
    } else if (profilesWorking) {
      testResults.overallHealth = 'partial'
    } else {
      testResults.overallHealth = 'unhealthy'
    }

    console.log('=== Connection Test Results ===')
    console.log('Overall health:', testResults.overallHealth)
    console.log('Test results:', testResults)

    // Prepare response
    const response = {
      success: testResults.overallHealth !== 'unhealthy',
      connectionHealth: testResults.overallHealth,
      tokenValid: testResults.tokenValid,
      testResults,
      connection: {
        id: connection.id,
        profile_id: connection.profile_id,
        profile_name: connection.profile_name,
        status: connection.status,
        marketplace_id: connection.marketplace_id,
        tokenExpiresAt: connection.token_expires_at
      },
      recommendations: []
    }

    // Add recommendations based on test results
    if (!testResults.tokenValid) {
      response.recommendations.push('Token is invalid - reconnect your Amazon account')
    } else if (testResults.overallHealth === 'unhealthy') {
      response.recommendations.push('API connectivity issues detected - check Amazon account status')
      response.recommendations.push('Try Force Sync to attempt profile re-detection')
    } else if (testResults.overallHealth === 'partial') {
      response.recommendations.push('Some API endpoints are not accessible - this may be normal for new accounts')
      response.recommendations.push('Try Force Sync to detect advertising profiles')
    } else if (testResults.profilesEndpoint?.profileCount === 0) {
      response.recommendations.push('No advertising profiles found - set up Amazon Advertising')
      response.recommendations.push('Visit advertising.amazon.com to create campaigns')
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== Connection Test Error ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during connection test',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
