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
      detectionLog: [],
      fullErrorDetails: [] // New: Store full error responses for debugging
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
        error: null,
        httpStatus: null,
        fullErrorResponse: null
      }

      try {
        const headers = {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
          'User-Agent': `Enhanced-Profile-Detection/2.0-${strategy.region || 'default'}`
        }

        console.log('Making request with headers:', Object.keys(headers))
        console.log('Access token length:', connection.access_token?.length || 0)

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

        strategyLog.httpStatus = profilesResponse.status

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
          // Enhanced error handling - capture full error response
          let errorText = ''
          let errorJson = null
          
          try {
            errorText = await profilesResponse.text()
            // Try to parse as JSON for structured error information
            try {
              errorJson = JSON.parse(errorText)
            } catch (jsonError) {
              // Not JSON, keep as text
            }
          } catch (textError) {
            errorText = 'Could not read error response'
          }

          const fullErrorDetails = {
            status: profilesResponse.status,
            statusText: profilesResponse.statusText,
            headers: Object.fromEntries(profilesResponse.headers.entries()),
            body: errorText,
            parsedBody: errorJson,
            strategy: strategy.name,
            endpoint: strategy.endpoint,
            requestHeaders: {
              'Authorization': `Bearer ${connection.access_token?.substring(0, 20)}...`,
              'Amazon-Advertising-API-ClientId': clientId?.substring(0, 8) + '...',
              'Content-Type': 'application/json'
            }
          }

          detectionResults.fullErrorDetails.push(fullErrorDetails)
          strategyLog.fullErrorResponse = fullErrorDetails

          const errorMsg = `${strategy.name} failed with status ${profilesResponse.status}: ${errorText.substring(0, 200)}`
          console.error('=== DETAILED ERROR ANALYSIS ===')
          console.error('Full error details:', JSON.stringify(fullErrorDetails, null, 2))
          
          strategyLog.error = errorMsg
          
          // Enhanced error categorization with specific guidance
          if (profilesResponse.status === 400) {
            const guidance = 'Bad Request - This often indicates an invalid access token or incorrect OAuth scope. Please reconnect your Amazon account.'
            detectionResults.errors.push(`${strategy.name}: ${guidance}`)
            console.error(`${strategy.name} - 400 Bad Request Analysis:`, {
              possibleCauses: [
                'Invalid or malformed access token',
                'Incorrect OAuth scope (should be cpc_advertising:campaign_management)',
                'Token not granted proper permissions',
                'API client ID mismatch'
              ],
              recommendedAction: 'Reconnect Amazon account with proper scope'
            })
          } else if (profilesResponse.status === 401) {
            detectionResults.errors.push(`Authentication failed for ${strategy.name} - token may be expired or invalid`)
            console.error(`${strategy.name} - 401 Unauthorized: Token is invalid or expired`)
          } else if (profilesResponse.status === 403) {
            detectionResults.errors.push(`Access denied for ${strategy.name} - insufficient API permissions`)
            console.error(`${strategy.name} - 403 Forbidden: Insufficient permissions for advertising API`)
          } else {
            detectionResults.errors.push(errorMsg)
          }
        }
      } catch (error) {
        const errorMsg = `${strategy.name} error: ${error.message}`
        console.error('=== STRATEGY ERROR ===', errorMsg)
        console.error('Error stack:', error.stack)
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
    console.log('Full error details count:', detectionResults.fullErrorDetails.length)

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
            detectionLog: detectionResults.detectionLog,
            scopeUsed: 'cpc_advertising:campaign_management'
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
      // Enhanced error analysis with full error details
      console.log('No profiles found despite detection attempts')
      console.log('Full error details for analysis:', JSON.stringify(detectionResults.fullErrorDetails, null, 2))
      
      const has400Errors = detectionResults.fullErrorDetails.some(err => err.status === 400)
      const hasAuthErrors = detectionResults.errors.some(err => 
        err.includes('Authentication') || err.includes('401') || err.includes('403')
      ) || detectionResults.fullErrorDetails.some(err => err.status === 401 || err.status === 403)
      
      const hasTimeoutErrors = detectionResults.errors.some(err => 
        err.includes('timed out') || err.includes('timeout')
      )
      
      let primaryReason = 'No advertising profiles found'
      let detailedGuidance = []
      let requiresReconnection = false
      
      if (has400Errors) {
        primaryReason = 'Bad Request - Invalid token or incorrect OAuth scope'
        requiresReconnection = true
        detailedGuidance = [
          'Your Amazon connection may have been created with incorrect OAuth scope',
          'Please reconnect your Amazon account to ensure proper API permissions',
          'The connection should use "cpc_advertising:campaign_management" scope',
          'This will grant access to your advertising profiles and campaign data'
        ]
      } else if (hasAuthErrors) {
        primaryReason = 'Authentication issues detected'
        requiresReconnection = true
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
          requiresReconnection,
          detectionSummary: {
            strategiesAttempted: detectionResults.strategiesAttempted,
            regionsChecked: detectionResults.regionsChecked.length,
            errorsEncountered: detectionResults.errors.length,
            tokenExpiresIn: `${hoursUntilExpiry} hours`,
            detectionLog: detectionResults.detectionLog,
            fullErrorDetails: detectionResults.fullErrorDetails,
            scopeUsed: 'cpc_advertising:campaign_management'
          },
          detailedGuidance,
          troubleshooting: {
            badRequestErrors: has400Errors,
            authenticationIssues: hasAuthErrors,
            timeoutIssues: hasTimeoutErrors,
            serverIssues: false,
            accountHasAdvertisingAccess: false,
            tokenScopeIssue: has400Errors
          },
          nextSteps: has400Errors || hasAuthErrors ? 
            ['Reconnect your Amazon account with proper scope', 'Try Enhanced Sync again'] :
            hasTimeoutErrors ?
            ['Wait a few minutes', 'Try Enhanced Sync again', 'Check connection stability'] :
            ['Complete Amazon Advertising setup', 'Create first campaign', 'Use Enhanced Sync'],
          errors: detectionResults.errors.length > 0 ? detectionResults.errors : undefined,
          debugInfo: {
            connectionId: connection.id,
            profileId: connection.profile_id,
            tokenLength: connection.access_token?.length || 0,
            clientIdPresent: !!clientId,
            allErrorResponses: detectionResults.fullErrorDetails
          }
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
