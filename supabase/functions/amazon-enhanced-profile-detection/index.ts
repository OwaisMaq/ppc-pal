
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
          details: 'Please sign in to use enhanced profile detection'
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
        JSON.stringify({ error: 'Connection ID is required' }),
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
          details: 'Could not find the specified Amazon connection'
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

    // Validate token expiry
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()
    
    if (tokenExpiry <= now) {
      console.error('Token has expired')
      return new Response(
        JSON.stringify({ 
          error: 'Access token has expired',
          details: 'Please reconnect your Amazon account to refresh the token'
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

    // Enhanced profile detection with multiple strategies
    const allProfiles: any[] = []
    const errors: string[] = []
    const regionsChecked: string[] = []
    let totalAttempts = 0

    console.log('=== Starting Multi-Strategy Profile Detection ===')

    // Strategy 1: Standard profile endpoint with improved headers
    console.log('=== Strategy 1: Standard Profile Detection ===')
    totalAttempts++
    
    try {
      const standardHeaders = {
        'Authorization': `Bearer ${connection.access_token}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Content-Type': 'application/json',
        'User-Agent': 'Enhanced-Profile-Detection/1.0'
      }

      const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
        headers: standardHeaders,
      })

      console.log('Standard profile API response:', {
        status: profilesResponse.status,
        ok: profilesResponse.ok,
        statusText: profilesResponse.statusText
      })

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json()
        console.log('Standard profiles found:', profiles.length)
        
        if (profiles && Array.isArray(profiles) && profiles.length > 0) {
          // Validate and filter profiles
          const validProfiles = profiles.filter(profile => 
            profile.profileId && 
            profile.countryCode &&
            (profile.accountInfo || profile.marketplaceStringId)
          )
          
          allProfiles.push(...validProfiles)
          regionsChecked.push('standard-api')
          
          console.log(`Added ${validProfiles.length} valid profiles from standard API`)
        }
      } else {
        const errorText = await profilesResponse.text()
        console.error('Standard profile fetch failed:', profilesResponse.status, errorText)
        errors.push(`Standard API (${profilesResponse.status}): ${errorText}`)
      }
    } catch (error) {
      console.error('Standard profile fetch error:', error)
      errors.push(`Standard API: ${error.message}`)
    }

    // Strategy 2: Region-specific endpoints with enhanced headers
    console.log('=== Strategy 2: Region-Specific Detection ===')
    const regions = [
      { code: 'NA', endpoint: 'https://advertising-api.amazon.com', name: 'North America' },
      { code: 'EU', endpoint: 'https://advertising-api-eu.amazon.com', name: 'Europe' },
      { code: 'FE', endpoint: 'https://advertising-api-fe.amazon.com', name: 'Far East' }
    ]

    for (const region of regions) {
      totalAttempts++
      console.log(`Checking region: ${region.name} (${region.code})`)
      
      try {
        const regionHeaders = {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
          'User-Agent': `Enhanced-Profile-Detection-${region.code}/1.0`
        }

        const regionResponse = await fetch(`${region.endpoint}/v2/profiles`, {
          headers: regionHeaders,
        })

        console.log(`Region ${region.code} response:`, {
          status: regionResponse.status,
          ok: regionResponse.ok
        })

        if (regionResponse.ok) {
          const regionProfiles = await regionResponse.json()
          console.log(`Region ${region.code} profiles:`, regionProfiles.length)
          
          if (regionProfiles && Array.isArray(regionProfiles) && regionProfiles.length > 0) {
            // Avoid duplicates by checking profileId
            const existingIds = new Set(allProfiles.map(p => p.profileId))
            const newProfiles = regionProfiles.filter(p => 
              p.profileId && 
              !existingIds.has(p.profileId) &&
              p.countryCode &&
              (p.accountInfo || p.marketplaceStringId)
            )
            
            if (newProfiles.length > 0) {
              allProfiles.push(...newProfiles)
              regionsChecked.push(region.code)
              console.log(`Added ${newProfiles.length} new profiles from ${region.name}`)
            }
          }
        } else {
          const errorText = await regionResponse.text()
          console.error(`Region ${region.code} failed:`, regionResponse.status)
          errors.push(`${region.name} API (${regionResponse.status}): ${errorText}`)
        }
      } catch (error) {
        console.error(`Region ${region.code} error:`, error)
        errors.push(`${region.name} API: ${error.message}`)
      }

      // Small delay between region requests
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Strategy 3: Portfolio-based validation (indicates active advertising)
    console.log('=== Strategy 3: Portfolio-Based Validation ===')
    totalAttempts++
    
    let portfolioIndicatesActive = false
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
        console.log('Portfolios found:', portfolios.length)
        
        if (portfolios && Array.isArray(portfolios) && portfolios.length > 0) {
          portfolioIndicatesActive = true
          regionsChecked.push('portfolio-check')
          console.log('Portfolio data confirms active advertising setup')
        }
      } else {
        const errorText = await portfolioResponse.text()
        console.error('Portfolio fetch failed:', portfolioResponse.status)
        errors.push(`Portfolio API (${portfolioResponse.status}): ${errorText}`)
      }
    } catch (error) {
      console.error('Portfolio validation error:', error)
      errors.push(`Portfolio API: ${error.message}`)
    }

    // Strategy 4: Campaign-based detection (if profiles found, try to validate with campaigns)
    if (allProfiles.length > 0) {
      console.log('=== Strategy 4: Campaign-Based Validation ===')
      totalAttempts++
      
      try {
        const testProfile = allProfiles[0]
        const campaignHeaders = {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': testProfile.profileId.toString(),
          'Content-Type': 'application/json',
        }

        const campaignResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns?count=1', {
          headers: campaignHeaders,
        })

        console.log('Campaign validation response:', {
          status: campaignResponse.status,
          ok: campaignResponse.ok
        })

        if (campaignResponse.ok) {
          regionsChecked.push('campaign-validation')
          console.log('Campaign API confirms profile scope is valid')
        } else {
          const errorText = await campaignResponse.text()
          console.warn('Campaign validation failed (profile may still be valid):', campaignResponse.status)
          errors.push(`Campaign validation (${campaignResponse.status}): ${errorText}`)
        }
      } catch (error) {
        console.warn('Campaign validation error:', error.message)
        errors.push(`Campaign validation: ${error.message}`)
      }
    }

    console.log('=== Enhanced Detection Results Summary ===')
    console.log('Total profiles found:', allProfiles.length)
    console.log('Regions/strategies checked:', regionsChecked.length)
    console.log('Total API attempts:', totalAttempts)
    console.log('Errors encountered:', errors.length)
    console.log('Portfolio activity detected:', portfolioIndicatesActive)

    if (allProfiles.length > 0) {
      // Sort profiles by preference (US first, then by profile ID)
      const sortedProfiles = allProfiles.sort((a, b) => {
        if (a.countryCode === 'US' && b.countryCode !== 'US') return -1
        if (b.countryCode === 'US' && a.countryCode !== 'US') return 1
        return parseInt(a.profileId) - parseInt(b.profileId)
      })

      console.log('Profiles sorted by preference:', sortedProfiles.map(p => ({
        id: p.profileId,
        country: p.countryCode,
        marketplace: p.accountInfo?.marketplaceStringId
      })))

      return new Response(
        JSON.stringify({
          success: true,
          profiles: sortedProfiles,
          regions: regionsChecked,
          totalAttempts,
          portfolioActive: portfolioIndicatesActive,
          errors: errors.length > 0 ? errors : undefined,
          message: `Successfully found ${sortedProfiles.length} advertising profiles using enhanced detection`,
          summary: {
            profilesFound: sortedProfiles.length,
            regionsChecked: regionsChecked.length,
            strategiesUsed: totalAttempts,
            portfolioActivityDetected: portfolioIndicatesActive
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.log('No profiles found despite comprehensive detection')
      
      // Provide detailed guidance based on what we found
      let guidance = 'No advertising profiles were found despite checking multiple regions and strategies. '
      
      if (portfolioIndicatesActive) {
        guidance += 'However, portfolio data suggests advertising activity exists. '
      }
      
      guidance += 'This typically means: 1) Amazon Advertising account setup is incomplete, or 2) No advertising campaigns have been created yet.'

      return new Response(
        JSON.stringify({
          success: false,
          profiles: [],
          regions: regionsChecked,
          totalAttempts,
          portfolioActive: portfolioIndicatesActive,
          errors,
          message: 'No advertising profiles found despite enhanced detection',
          guidance,
          recommendations: [
            'Visit advertising.amazon.com to complete your advertising account setup',
            'Create at least one advertising campaign to activate your profile',
            'Ensure your Amazon account has advertising permissions',
            'Try again after completing the advertising setup'
          ],
          summary: {
            strategiesAttempted: totalAttempts,
            regionsChecked: regionsChecked.length,
            errorsEncountered: errors.length,
            portfolioActivityDetected: portfolioIndicatesActive
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('=== Enhanced Profile Detection Error ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during enhanced profile detection',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
