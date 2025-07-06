
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
    // Enhanced authentication
    const authHeader = req.headers.get('authorization')
    console.log('=== Enhanced Profile Detection Authentication ===')
    console.log('Auth header present:', !!authHeader)

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
            Authorization: authHeader || '',
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
          error: 'Authentication required',
          details: 'Please sign in to use enhanced profile detection',
          requiresAuth: true
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { connectionId } = await req.json()
    
    console.log('=== Enhanced Profile Detection Started ===')
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
          error: 'Connection not found or access denied',
          details: 'Could not find the specified Amazon connection for your account',
          requiresReconnection: true
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Connection details:', {
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
      
      // Update connection status
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
          details: `Your Amazon token expired ${Math.abs(hoursUntilExpiry)} hours ago. Please reconnect your Amazon account to refresh the token.`,
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
          details: 'Amazon API credentials not properly configured on server'
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

    console.log('=== Starting Advanced Multi-Strategy Profile Detection ===')

    // Strategy 1: Standard profile endpoint with retry mechanism
    console.log('=== Strategy 1: Standard Profile Detection with Retry ===')
    for (let attempt = 1; attempt <= 3; attempt++) {
      detectionResults.strategiesAttempted++
      
      try {
        const standardHeaders = {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
          'User-Agent': `Enhanced-Profile-Detection/1.0-attempt-${attempt}`
        }

        const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
          headers: standardHeaders,
          timeout: 10000 // 10 second timeout
        })

        console.log(`Standard profile API response (attempt ${attempt}):`, {
          status: profilesResponse.status,
          ok: profilesResponse.ok,
          statusText: profilesResponse.statusText
        })

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json()
          console.log(`Standard profiles found (attempt ${attempt}):`, profiles.length)
          
          if (profiles && Array.isArray(profiles) && profiles.length > 0) {
            // Enhanced profile validation
            const validProfiles = profiles.filter(profile => {
              const isValid = profile.profileId && 
                            profile.countryCode &&
                            (profile.accountInfo?.marketplaceStringId || profile.marketplaceStringId)
              
              if (!isValid) {
                console.log('Invalid profile filtered out:', profile)
              }
              
              return isValid
            })
            
            detectionResults.allProfiles.push(...validProfiles)
            detectionResults.regionsChecked.push('standard-api')
            
            console.log(`Added ${validProfiles.length} valid profiles from standard API`)
            break // Success, no need to retry
          }
        } else {
          const errorText = await profilesResponse.text()
          console.error(`Standard profile fetch failed (attempt ${attempt}):`, profilesResponse.status, errorText)
          
          if (profilesResponse.status === 401) {
            detectionResults.errors.push(`Authentication failed: Token may be expired or invalid`)
            break // Don't retry auth errors
          } else if (profilesResponse.status === 403) {
            detectionResults.errors.push(`Access denied: Check API permissions and client ID`)
            break // Don't retry permission errors
          } else {
            detectionResults.errors.push(`Standard API attempt ${attempt} (${profilesResponse.status}): ${errorText}`)
          }
        }
      } catch (error) {
        console.error(`Standard profile fetch error (attempt ${attempt}):`, error)
        detectionResults.errors.push(`Standard API attempt ${attempt}: ${error.message}`)
      }

      // Wait before retry
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }

    // Strategy 2: Enhanced region-specific detection
    console.log('=== Strategy 2: Enhanced Region-Specific Detection ===')
    const regions = [
      { code: 'NA', endpoint: 'https://advertising-api.amazon.com', name: 'North America', markets: ['US', 'CA', 'MX'] },
      { code: 'EU', endpoint: 'https://advertising-api-eu.amazon.com', name: 'Europe', markets: ['UK', 'DE', 'FR', 'IT', 'ES'] },
      { code: 'FE', endpoint: 'https://advertising-api-fe.amazon.com', name: 'Far East', markets: ['JP', 'AU', 'IN'] }
    ]

    for (const region of regions) {
      detectionResults.strategiesAttempted++
      console.log(`Checking region: ${region.name} (${region.code}) - Markets: ${region.markets.join(', ')}`)
      
      try {
        const regionHeaders = {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
          'User-Agent': `Enhanced-Profile-Detection-${region.code}/1.0`,
          'Accept': 'application/json'
        }

        const regionResponse = await fetch(`${region.endpoint}/v2/profiles`, {
          headers: regionHeaders,
          timeout: 15000 // 15 second timeout for region calls
        })

        console.log(`Region ${region.code} response:`, {
          status: regionResponse.status,
          ok: regionResponse.ok,
          statusText: regionResponse.statusText
        })

        if (regionResponse.ok) {
          const regionProfiles = await regionResponse.json()
          console.log(`Region ${region.code} profiles:`, regionProfiles?.length || 0)
          
          if (regionProfiles && Array.isArray(regionProfiles) && regionProfiles.length > 0) {
            // Enhanced duplicate detection
            const existingIds = new Set(detectionResults.allProfiles.map(p => p.profileId))
            const newProfiles = regionProfiles.filter(p => {
              const isValid = p.profileId && 
                            !existingIds.has(p.profileId) &&
                            p.countryCode &&
                            (p.accountInfo?.marketplaceStringId || p.marketplaceStringId)
              
              if (p.profileId && existingIds.has(p.profileId)) {
                console.log(`Duplicate profile filtered: ${p.profileId}`)
              }
              
              return isValid
            })
            
            if (newProfiles.length > 0) {
              detectionResults.allProfiles.push(...newProfiles)
              detectionResults.regionsChecked.push(region.code)
              console.log(`Added ${newProfiles.length} new profiles from ${region.name}`)
            }
          }
        } else {
          const errorText = await regionResponse.text()
          console.error(`Region ${region.code} failed:`, regionResponse.status)
          detectionResults.errors.push(`${region.name} API (${regionResponse.status}): ${errorText.substring(0, 100)}`)
        }
      } catch (error) {
        console.error(`Region ${region.code} error:`, error)
        detectionResults.errors.push(`${region.name} API: ${error.message}`)
      }

      // Small delay between region requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Strategy 3: Account information and advertising readiness check
    console.log('=== Strategy 3: Account Information & Advertising Readiness ===')
    detectionResults.strategiesAttempted++
    
    try {
      // Check account manager for advertising setup status
      const managerResponse = await fetch('https://advertising-api.amazon.com/v2/manager/accounts', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      })

      if (managerResponse.ok) {
        const accountData = await managerResponse.json()
        console.log('Account manager data:', accountData?.length || 0, 'accounts')
        
        if (accountData && Array.isArray(accountData) && accountData.length > 0) {
          detectionResults.accountDetails = {
            accountCount: accountData.length,
            hasAdvertisingAccess: true,
            accountTypes: accountData.map(acc => acc.type).filter(Boolean)
          }
          detectionResults.regionsChecked.push('account-manager')
        }
      } else {
        const errorText = await managerResponse.text()
        console.log('Account manager check failed:', managerResponse.status, errorText.substring(0, 100))
        detectionResults.errors.push(`Account manager check (${managerResponse.status}): Account may not have advertising access`)
      }
    } catch (error) {
      console.error('Account manager check error:', error)
      detectionResults.errors.push(`Account manager check: ${error.message}`)
    }

    // Strategy 4: Portfolio validation (indicates active advertising setup)
    console.log('=== Strategy 4: Portfolio & Campaign Activity Check ===')
    detectionResults.strategiesAttempted++
    
    try {
      const portfolioResponse = await fetch('https://advertising-api.amazon.com/v2/portfolios', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      })

      if (portfolioResponse.ok) {
        const portfolios = await portfolioResponse.json()
        console.log('Portfolios found:', portfolios?.length || 0)
        
        if (portfolios && Array.isArray(portfolios) && portfolios.length > 0) {
          detectionResults.portfolioActivity = true
          detectionResults.regionsChecked.push('portfolio-check')
          console.log('Portfolio data confirms active advertising setup')
        }
      } else {
        const errorText = await portfolioResponse.text()
        console.log('Portfolio fetch info:', portfolioResponse.status, errorText.substring(0, 100))
        // Don't treat portfolio errors as critical - many accounts won't have portfolios
      }
    } catch (error) {
      console.log('Portfolio validation info:', error.message)
      // Portfolio errors are informational only
    }

    // Final results analysis and response
    console.log('=== Enhanced Detection Results Analysis ===')
    console.log('Total profiles found:', detectionResults.allProfiles.length)
    console.log('Regions/strategies checked:', detectionResults.regionsChecked.length)
    console.log('Total API attempts:', detectionResults.strategiesAttempted)
    console.log('Errors encountered:', detectionResults.errors.length)
    console.log('Portfolio activity detected:', detectionResults.portfolioActivity)
    console.log('Account details:', detectionResults.accountDetails)

    if (detectionResults.allProfiles.length > 0) {
      // Enhanced profile sorting and validation
      const sortedProfiles = detectionResults.allProfiles
        .filter(profile => {
          // Final validation pass
          const isValid = profile.profileId && 
                         profile.countryCode && 
                         /^\d+$/.test(profile.profileId.toString())
          
          if (!isValid) {
            console.log('Profile failed final validation:', profile)
          }
          
          return isValid
        })
        .sort((a, b) => {
          // Priority sorting: US first, then by profile ID
          if (a.countryCode === 'US' && b.countryCode !== 'US') return -1
          if (b.countryCode === 'US' && a.countryCode !== 'US') return 1
          return parseInt(a.profileId) - parseInt(b.profileId)
        })

      console.log('Final sorted profiles:', sortedProfiles.map(p => ({
        id: p.profileId,
        country: p.countryCode,
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
            portfolioActivityDetected: detectionResults.portfolioActivity,
            accountDetails: detectionResults.accountDetails,
            tokenExpiresIn: `${hoursUntilExpiry} hours`
          },
          recommendations: [
            sortedProfiles.length > 1 ? 
              `Found ${sortedProfiles.length} advertising profiles. The first profile (${sortedProfiles[0].countryCode}) will be used as primary.` :
              `Found 1 advertising profile for ${sortedProfiles[0].countryCode} marketplace.`,
            detectionResults.portfolioActivity ? 
              'Portfolio activity detected - advertising setup appears complete.' :
              'No portfolio activity detected - this is normal for new advertising accounts.',
            `Token expires in ${hoursUntilExpiry} hours. Plan to reconnect before expiration.`
          ],
          message: `Successfully detected ${sortedProfiles.length} advertising profile${sortedProfiles.length === 1 ? '' : 's'} using enhanced multi-strategy detection`,
          nextSteps: [
            'Profile configuration will be updated automatically',
            'Campaign sync can now proceed',
            'Monitor sync results for any additional issues'
          ]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Enhanced guidance for no profiles found
      console.log('No profiles found despite comprehensive detection')
      
      // Analyze why no profiles were found
      const hasAuthErrors = detectionResults.errors.some(err => 
        err.includes('Authentication') || err.includes('401') || err.includes('403')
      )
      
      const hasServerErrors = detectionResults.errors.some(err => 
        err.includes('500') || err.includes('502') || err.includes('503')
      )

      let primaryReason = 'Amazon Advertising account setup incomplete'
      let detailedGuidance = []
      
      if (hasAuthErrors) {
        primaryReason = 'Authentication or permission issues detected'
        detailedGuidance = [
          'Your Amazon token may have expired or been revoked',
          'Try reconnecting your Amazon account',
          'Ensure your Amazon account has advertising permissions'
        ]
      } else if (hasServerErrors) {
        primaryReason = 'Amazon API connectivity issues'
        detailedGuidance = [
          'Amazon Advertising API is experiencing issues',
          'Try again in a few minutes',
          'If problems persist, check Amazon Advertising status'
        ]
      } else if (detectionResults.accountDetails?.hasAdvertisingAccess) {
        primaryReason = 'Account has advertising access but no active profiles'
        detailedGuidance = [
          'Your account can access advertising APIs but has no advertising profiles',
          'This usually means no campaigns have been created yet',
          'Create your first campaign at advertising.amazon.com to generate a profile'
        ]
      } else {
        detailedGuidance = [
          'Visit advertising.amazon.com and complete account setup',
          'Accept the Amazon Advertising Terms of Service',
          'Create at least one advertising campaign',
          'Wait a few minutes for profile generation, then try Enhanced Sync again'
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
            portfolioActivityDetected: detectionResults.portfolioActivity,
            accountDetails: detectionResults.accountDetails,
            tokenExpiresIn: `${hoursUntilExpiry} hours`
          },
          detailedGuidance,
          troubleshooting: {
            authenticationIssues: hasAuthErrors,
            serverIssues: hasServerErrors,
            accountHasAdvertisingAccess: detectionResults.accountDetails?.hasAdvertisingAccess || false,
            portfolioActivity: detectionResults.portfolioActivity
          },
          nextSteps: hasAuthErrors ? 
            ['Reconnect your Amazon account', 'Verify account permissions', 'Try Enhanced Sync again'] :
            ['Complete Amazon Advertising setup', 'Create first campaign', 'Return and use Enhanced Sync'],
          errors: detectionResults.errors.length > 0 ? detectionResults.errors : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('=== Enhanced Profile Detection Critical Error ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during enhanced profile detection',
        details: error.message,
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
