
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
    
    console.log('=== Enhanced Profile Detection Started ===')
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

    console.log('Connection details:', {
      profile_id: connection.profile_id,
      status: connection.status,
      profile_name: connection.profile_name
    })

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

    // Strategy 1: Standard profile endpoint
    console.log('=== Strategy 1: Standard Profile Detection ===')
    totalAttempts++
    
    try {
      const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      })

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json()
        console.log('Standard profiles found:', profiles.length)
        
        if (profiles && Array.isArray(profiles) && profiles.length > 0) {
          allProfiles.push(...profiles)
          regionsChecked.push('default')
        }
      } else {
        const errorText = await profilesResponse.text()
        console.error('Standard profile fetch failed:', profilesResponse.status, errorText)
        errors.push(`Standard API: ${profilesResponse.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Standard profile fetch error:', error)
      errors.push(`Standard API: ${error.message}`)
    }

    // Strategy 2: Region-specific endpoints
    console.log('=== Strategy 2: Region-Specific Detection ===')
    const regions = [
      { code: 'NA', endpoint: 'https://advertising-api.amazon.com' },
      { code: 'EU', endpoint: 'https://advertising-api-eu.amazon.com' },
      { code: 'FE', endpoint: 'https://advertising-api-fe.amazon.com' }
    ]

    for (const region of regions) {
      totalAttempts++
      console.log(`Checking region: ${region.code}`)
      
      try {
        const regionResponse = await fetch(`${region.endpoint}/v2/profiles`, {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json',
          },
        })

        if (regionResponse.ok) {
          const regionProfiles = await regionResponse.json()
          console.log(`Region ${region.code} profiles:`, regionProfiles.length)
          
          if (regionProfiles && Array.isArray(regionProfiles) && regionProfiles.length > 0) {
            // Avoid duplicates by checking profileId
            const existingIds = new Set(allProfiles.map(p => p.profileId))
            const newProfiles = regionProfiles.filter(p => !existingIds.has(p.profileId))
            
            if (newProfiles.length > 0) {
              allProfiles.push(...newProfiles)
              regionsChecked.push(region.code)
            }
          }
        } else {
          const errorText = await regionResponse.text()
          console.error(`Region ${region.code} failed:`, regionResponse.status, errorText)
          errors.push(`${region.code} API: ${regionResponse.status} - ${errorText}`)
        }
      } catch (error) {
        console.error(`Region ${region.code} error:`, error)
        errors.push(`${region.code} API: ${error.message}`)
      }
    }

    // Strategy 3: Portfolio-based detection (alternative approach)
    console.log('=== Strategy 3: Portfolio-Based Detection ===')
    totalAttempts++
    
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
        
        // Portfolios can indicate active advertising profiles
        if (portfolios && Array.isArray(portfolios) && portfolios.length > 0) {
          regionsChecked.push('portfolio-check')
          console.log('Portfolio data suggests advertising is active')
        }
      } else {
        const errorText = await portfolioResponse.text()
        console.error('Portfolio fetch failed:', portfolioResponse.status, errorText)
        errors.push(`Portfolio API: ${portfolioResponse.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Portfolio fetch error:', error)
      errors.push(`Portfolio API: ${error.message}`)
    }

    console.log('=== Enhanced Detection Results ===')
    console.log('Total profiles found:', allProfiles.length)
    console.log('Regions checked:', regionsChecked)
    console.log('Total attempts:', totalAttempts)
    console.log('Errors encountered:', errors.length)

    if (allProfiles.length > 0) {
      // Process and validate profiles
      const validProfiles = allProfiles.filter(profile => {
        return profile.profileId && 
               profile.countryCode && 
               (profile.accountInfo || profile.marketplaceStringId)
      })

      console.log('Valid profiles after filtering:', validProfiles.length)

      return new Response(
        JSON.stringify({
          success: true,
          profiles: validProfiles,
          regions: regionsChecked,
          totalAttempts,
          errors: errors.length > 0 ? errors : undefined,
          message: `Found ${validProfiles.length} advertising profiles across ${regionsChecked.length} regions`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.log('No profiles found despite enhanced detection')
      
      return new Response(
        JSON.stringify({
          success: false,
          profiles: [],
          regions: regionsChecked,
          totalAttempts,
          errors,
          message: 'No advertising profiles found despite enhanced detection. Amazon Advertising account setup may be required.',
          suggestion: 'Visit advertising.amazon.com to set up your advertising account'
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
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
