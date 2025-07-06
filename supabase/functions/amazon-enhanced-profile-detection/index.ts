
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProfileDetectionStrategy {
  name: string;
  endpoint: string;
  region?: string;
  timeout: number;
}

const DETECTION_STRATEGIES: ProfileDetectionStrategy[] = [
  { name: 'Standard NA', endpoint: 'https://advertising-api.amazon.com', region: 'NA', timeout: 8000 },
  { name: 'Europe', endpoint: 'https://advertising-api-eu.amazon.com', region: 'EU', timeout: 6000 },
  { name: 'Far East', endpoint: 'https://advertising-api-fe.amazon.com', region: 'FE', timeout: 6000 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Enhanced Profile Detection Started ===')
    
    // Enhanced authentication with better error handling
    const authHeader = req.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)

    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          details: 'Please sign in to use enhanced profile detection',
          requiresAuth: true
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message)
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Please sign in again to use enhanced profile detection',
          requiresAuth: true
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format',
          details: 'Request body must be valid JSON'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { connectionId } = requestBody
    
    console.log('Connection ID:', connectionId)
    console.log('User ID:', user.id)

    if (!connectionId) {
      return new Response(
        JSON.stringify({ 
          error: 'Connection ID is required',
          details: 'Please provide a valid Amazon connection ID'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get connection details with user verification
    const { data: connection, error: fetchError } = await supabaseClient
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !connection) {
      console.error('Connection not found or access denied:', fetchError?.message)
      return new Response(
        JSON.stringify({ 
          error: 'Connection not found',
          details: 'Could not find the specified Amazon connection for your account',
          requiresReconnection: true
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Connection found:', {
      profile_id: connection.profile_id,
      status: connection.status,
      profile_name: connection.profile_name,
      marketplace_id: connection.marketplace_id
    })

    // Enhanced token validation with detailed logging
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()
    const hoursUntilExpiry = Math.round((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    console.log('=== Token Validation Details ===')
    console.log('Token expires at:', tokenExpiry.toISOString())
    console.log('Current time:', now.toISOString())
    console.log('Hours until expiry:', hoursUntilExpiry)
    console.log('Is expired:', tokenExpiry <= now)
    
    if (tokenExpiry <= now) {
      console.error('Token has expired')
      
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
          details: `Your Amazon token expired ${Math.abs(hoursUntilExpiry)} hours ago. Please reconnect your Amazon account.`,
          requiresReconnection: true,
          expiredHours: Math.abs(hoursUntilExpiry)
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
          details: 'Amazon API credentials not configured properly'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced multi-strategy profile detection with comprehensive logging
    const detectionResults = {
      allProfiles: [],
      errors: [],
      regionsChecked: [],
      strategiesAttempted: 0,
      detectionLog: []
    }

    console.log('=== Starting Multi-Strategy Profile Detection ===')

    for (const strategy of DETECTION_STRATEGIES) {
      detectionResults.strategiesAttempted++
      console.log(`=== Strategy: ${strategy.name} (${strategy.endpoint}) ===`)
      
      const strategyLog = {
        strategy: strategy.name,
        endpoint: strategy.endpoint,
        region: strategy.region,
        startTime: new Date().toISOString(),
        success: false,
        profilesFound: 0,
        error: null
      }

      try {
        const headers = {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
          'User-Agent': `Enhanced-Profile-Detection/2.0-${strategy.region || 'default'}`
        }

        console.log('Making request with headers:', Object.keys(headers))

        const controller = new AbortController()
        const timeout = setTimeout(() => {
          console.log(`Strategy ${strategy.name} timed out after ${strategy.timeout}ms`)
          controller.abort()
        }, strategy.timeout)

        const profilesResponse = await fetch(`${strategy.endpoint}/v2/profiles`, {
          headers: headers,
          signal: controller.signal
        })

        clearTimeout(timeout)

        console.log(`${strategy.name} response:`, {
          status: profilesResponse.status,
          ok: profilesResponse.ok,
          statusText: profilesResponse.statusText
        })

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json()
          console.log(`${strategy.name} profiles found:`, profiles?.length || 0)
          
          if (profiles && Array.isArray(profiles) && profiles.length > 0) {
            // Enhanced profile validation and processing
            const validProfiles = profiles.filter(profile => {
              const isValid = profile.profileId && 
                             profile.countryCode &&
                             (profile.accountInfo?.marketplaceStringId || profile.marketplaceStringId)
              
              if (!isValid) {
                console.log('Filtering out invalid profile:', {
                  profileId: profile.profileId,
                  countryCode: profile.countryCode,
                  hasMarketplace: !!(profile.accountInfo?.marketplaceStringId || profile.marketplaceStringId)
                })
              }
              
              return isValid
            })
            
            console.log(`${strategy.name} valid profiles:`, validProfiles.length)
            
            // Avoid duplicates by checking profileId
            const existingIds = new Set(detectionResults.allProfiles.map(p => p.profileId))
            const newProfiles = validProfiles.filter(p => !existingIds.has(p.profileId))
            
            if (newProfiles.length > 0) {
              detectionResults.allProfiles.push(...newProfiles)
              detectionResults.regionsChecked.push(strategy.region || strategy.name)
              strategyLog.success = true
              strategyLog.profilesFound = newProfiles.length
              console.log(`Added ${newProfiles.length} new profiles from ${strategy.name}`)
            }
          }
        } else {
          const errorText = await profilesResponse.text().catch(() => 'Could not read error response')
          const errorMsg = `${strategy.name} failed with status ${profilesResponse.status}: ${errorText.substring(0, 200)}`
          console.error(errorMsg)
          strategyLog.error = errorMsg
          
          if (profilesResponse.status === 401) {
            detectionResults.errors.push(`Authentication failed for ${strategy.name} - token may be expired`)
          } else if (profilesResponse.status === 403) {
            detectionResults.errors.push(`Access denied for ${strategy.name} - check API permissions`)
          } else {
            detectionResults.errors.push(errorMsg)
          }
        }
      } catch (error) {
        const errorMsg = `${strategy.name} error: ${error.message}`
        console.error(errorMsg)
        strategyLog.error = errorMsg
        
        if (error.name === 'AbortError') {
          detectionResults.errors.push(`${strategy.name} timed out after ${strategy.timeout}ms`)
        } else {
          detectionResults.errors.push(errorMsg)
        }
      }

      strategyLog.endTime = new Date().toISOString()
      detectionResults.detectionLog.push(strategyLog)
      
      // Small delay between strategies to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log('=== Detection Results Summary ===')
    console.log('Total profiles found:', detectionResults.allProfiles.length)
    console.log('Regions checked:', detectionResults.regionsChecked.length)
    console.log('Strategies attempted:', detectionResults.strategiesAttempted)
    console.log('Errors encountered:', detectionResults.errors.length)
    console.log('Detection log:', detectionResults.detectionLog)

    if (detectionResults.allProfiles.length > 0) {
      // Enhanced profile sorting with preference for US and larger profile IDs
      const sortedProfiles = detectionResults.allProfiles
        .filter(profile => {
          return profile.profileId && 
                 profile.countryCode && 
                 /^\d+$/.test(profile.profileId.toString())
        })
        .sort((a, b) => {
          // Prefer US profiles
          if (a.countryCode === 'US' && b.countryCode !== 'US') return -1
          if (b.countryCode === 'US' && a.countryCode !== 'US') return 1
          
          // Then sort by profile ID (larger IDs might be more recent)
          return parseInt(b.profileId) - parseInt(a.profileId)
        })

      console.log('Final sorted profiles:', sortedProfiles.length)
      console.log('Profile details:', sortedProfiles.map(p => ({
        profileId: p.profileId,
        countryCode: p.countryCode,
        marketplace: p.accountInfo?.marketplaceStringId || p.marketplaceStringId
      })))

      return new Response(
        JSON.stringify({
          success: true,
          profiles: sortedProfiles,
          detectionSummary: {
            totalProfilesFound: sortedProfiles.length,
            regionsChecked: detectionResults.regionsChecked,
            strategiesAttempted: detectionResults.strategiesAttempted,
            tokenExpiresIn: `${hoursUntilExpiry} hours`,
            detectionLog: detectionResults.detectionLog
          },
          message: `Successfully detected ${sortedProfiles.length} advertising profile${sortedProfiles.length === 1 ? '' : 's'}`,
          nextSteps: [
            'Profile configuration will be updated automatically',
            'Campaign sync can now proceed',
            'Check console logs for detailed detection information'
          ]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Enhanced error analysis and guidance
      console.log('No profiles found despite detection attempts')
      
      const hasAuthErrors = detectionResults.errors.some(err => 
        err.includes('Authentication') || err.includes('401') || err.includes('403')
      )
      
      const hasTimeoutErrors = detectionResults.errors.some(err => 
        err.includes('timed out') || err.includes('timeout')
      )
      
      let primaryReason = 'No advertising profiles found'
      let detailedGuidance = []
      
      if (hasAuthErrors) {
        primaryReason = 'Authentication issues detected'
        detailedGuidance = [
          'Your Amazon token may have expired or been revoked',
          'Try reconnecting your Amazon account with fresh permissions',
          'Ensure your account has advertising API access'
        ]
      } else if (hasTimeoutErrors) {
        primaryReason = 'Amazon API response timeouts'
        detailedGuidance = [
          'Amazon API is experiencing slow response times',
          'Try the sync again in a few minutes',
          'Check your internet connection stability'
        ]
      } else {
        detailedGuidance = [
          'Visit advertising.amazon.com to set up your advertising account',
          'Create at least one advertising campaign',
          'Ensure campaigns have been active for at least 24 hours',
          'Try Enhanced Sync again after setup'
        ]
      }

      return new Response(
        JSON.stringify({
          success: false,
          profiles: [],
          error: 'No advertising profiles detected',
          primaryReason,
          detectionSummary: {
            strategiesAttempted: detectionResults.strategiesAttempted,
            regionsChecked: detectionResults.regionsChecked.length,
            errorsEncountered: detectionResults.errors.length,
            tokenExpiresIn: `${hoursUntilExpiry} hours`,
            detectionLog: detectionResults.detectionLog
          },
          detailedGuidance,
          troubleshooting: {
            authenticationIssues: hasAuthErrors,
            timeoutIssues: hasTimeoutErrors,
            serverIssues: false,
            accountHasAdvertisingAccess: false
          },
          nextSteps: hasAuthErrors ? 
            ['Reconnect your Amazon account', 'Try Enhanced Sync again'] :
            hasTimeoutErrors ?
            ['Wait a few minutes', 'Try Enhanced Sync again', 'Check connection stability'] :
            ['Complete Amazon Advertising setup', 'Create first campaign', 'Use Enhanced Sync'],
          errors: detectionResults.errors.length > 0 ? detectionResults.errors : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('=== Critical Error in Enhanced Profile Detection ===')
    console.error('Error details:', error)
    console.error('Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: 'An unexpected error occurred during profile detection',
        timestamp: new Date().toISOString(),
        requiresSupport: true
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
