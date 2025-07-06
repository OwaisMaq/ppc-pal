
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

    // Enhanced token validation
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()
    const hoursUntilExpiry = Math.round((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60))
    
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

    // Enhanced multi-strategy profile detection
    const detectionResults = {
      allProfiles: [],
      errors: [],
      regionsChecked: [],
      strategiesAttempted: 0,
      portfolioActivity: false,
      accountDetails: null
    }

    console.log('=== Starting Multi-Strategy Profile Detection ===')

    // Strategy 1: Standard profile endpoint with retry
    console.log('=== Strategy 1: Standard Profile Detection ===')
    for (let attempt = 1; attempt <= 2; attempt++) {
      detectionResults.strategiesAttempted++
      
      try {
        const standardHeaders = {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
          'User-Agent': `Enhanced-Profile-Detection/1.0`
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000) // 8 second timeout

        const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
          headers: standardHeaders,
          signal: controller.signal
        })

        clearTimeout(timeout)

        console.log(`Profile API response (attempt ${attempt}):`, {
          status: profilesResponse.status,
          ok: profilesResponse.ok
        })

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json()
          console.log(`Profiles found (attempt ${attempt}):`, profiles?.length || 0)
          
          if (profiles && Array.isArray(profiles) && profiles.length > 0) {
            const validProfiles = profiles.filter(profile => {
              return profile.profileId && 
                     profile.countryCode &&
                     (profile.accountInfo?.marketplaceStringId || profile.marketplaceStringId)
            })
            
            detectionResults.allProfiles.push(...validProfiles)
            detectionResults.regionsChecked.push('standard-api')
            console.log(`Added ${validProfiles.length} valid profiles`)
            break
          }
        } else {
          const errorText = await profilesResponse.text().catch(() => 'Unknown error')
          console.error(`Profile fetch failed (attempt ${attempt}):`, profilesResponse.status, errorText.substring(0, 200))
          
          if (profilesResponse.status === 401) {
            detectionResults.errors.push('Authentication failed - token may be expired')
            break
          } else if (profilesResponse.status === 403) {
            detectionResults.errors.push('Access denied - check API permissions')
            break
          } else {
            detectionResults.errors.push(`API error ${profilesResponse.status}: ${errorText.substring(0, 100)}`)
          }
        }
      } catch (error) {
        console.error(`Profile fetch error (attempt ${attempt}):`, error.message)
        detectionResults.errors.push(`Network error (attempt ${attempt}): ${error.message}`)
        
        if (error.name === 'AbortError') {
          detectionResults.errors.push('Request timeout - Amazon API is slow to respond')
          break
        }
      }

      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Strategy 2: Region-specific detection
    console.log('=== Strategy 2: Region-Specific Detection ===')
    const regions = [
      { code: 'NA', endpoint: 'https://advertising-api.amazon.com', name: 'North America' },
      { code: 'EU', endpoint: 'https://advertising-api-eu.amazon.com', name: 'Europe' },
      { code: 'FE', endpoint: 'https://advertising-api-fe.amazon.com', name: 'Far East' }
    ]

    for (const region of regions) {
      detectionResults.strategiesAttempted++
      console.log(`Checking region: ${region.name}`)
      
      try {
        const regionHeaders = {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json'
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 6000)

        const regionResponse = await fetch(`${region.endpoint}/v2/profiles`, {
          headers: regionHeaders,
          signal: controller.signal
        })

        clearTimeout(timeout)

        if (regionResponse.ok) {
          const regionProfiles = await regionResponse.json()
          console.log(`Region ${region.code} profiles:`, regionProfiles?.length || 0)
          
          if (regionProfiles && Array.isArray(regionProfiles) && regionProfiles.length > 0) {
            const existingIds = new Set(detectionResults.allProfiles.map(p => p.profileId))
            const newProfiles = regionProfiles.filter(p => {
              return p.profileId && 
                     !existingIds.has(p.profileId) &&
                     p.countryCode &&
                     (p.accountInfo?.marketplaceStringId || p.marketplaceStringId)
            })
            
            if (newProfiles.length > 0) {
              detectionResults.allProfiles.push(...newProfiles)
              detectionResults.regionsChecked.push(region.code)
              console.log(`Added ${newProfiles.length} new profiles from ${region.name}`)
            }
          }
        } else {
          console.log(`Region ${region.code} returned status:`, regionResponse.status)
        }
      } catch (error) {
        console.log(`Region ${region.code} error:`, error.message)
      }

      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log('=== Detection Results Summary ===')
    console.log('Total profiles found:', detectionResults.allProfiles.length)
    console.log('Regions checked:', detectionResults.regionsChecked.length)
    console.log('Strategies attempted:', detectionResults.strategiesAttempted)
    console.log('Errors encountered:', detectionResults.errors.length)

    if (detectionResults.allProfiles.length > 0) {
      // Sort profiles with preference for US first
      const sortedProfiles = detectionResults.allProfiles
        .filter(profile => {
          return profile.profileId && 
                 profile.countryCode && 
                 /^\d+$/.test(profile.profileId.toString())
        })
        .sort((a, b) => {
          if (a.countryCode === 'US' && b.countryCode !== 'US') return -1
          if (b.countryCode === 'US' && a.countryCode !== 'US') return 1
          return parseInt(a.profileId) - parseInt(b.profileId)
        })

      console.log('Final sorted profiles:', sortedProfiles.length)

      return new Response(
        JSON.stringify({
          success: true,
          profiles: sortedProfiles,
          detectionSummary: {
            totalProfilesFound: sortedProfiles.length,
            regionsChecked: detectionResults.regionsChecked,
            strategiesAttempted: detectionResults.strategiesAttempted,
            tokenExpiresIn: `${hoursUntilExpiry} hours`
          },
          message: `Successfully detected ${sortedProfiles.length} advertising profile${sortedProfiles.length === 1 ? '' : 's'}`,
          nextSteps: [
            'Profile configuration will be updated automatically',
            'Campaign sync can now proceed'
          ]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // No profiles found - provide detailed guidance
      console.log('No profiles found despite detection attempts')
      
      const hasAuthErrors = detectionResults.errors.some(err => 
        err.includes('Authentication') || err.includes('401') || err.includes('403')
      )
      
      let primaryReason = 'No advertising profiles found'
      let detailedGuidance = []
      
      if (hasAuthErrors) {
        primaryReason = 'Authentication issues detected'
        detailedGuidance = [
          'Your Amazon token may have expired or been revoked',
          'Try reconnecting your Amazon account',
          'Ensure your account has advertising permissions'
        ]
      } else {
        detailedGuidance = [
          'Visit advertising.amazon.com to set up your advertising account',
          'Create at least one advertising campaign',
          'Wait a few minutes, then try Enhanced Sync again'
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
            tokenExpiresIn: `${hoursUntilExpiry} hours`
          },
          detailedGuidance,
          troubleshooting: {
            authenticationIssues: hasAuthErrors,
            serverIssues: false,
            accountHasAdvertisingAccess: false
          },
          nextSteps: hasAuthErrors ? 
            ['Reconnect your Amazon account', 'Try Enhanced Sync again'] :
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
