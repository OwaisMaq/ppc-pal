
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Amazon regions configuration
const AMAZON_REGIONS = [
  {
    name: 'North America',
    code: 'NA',
    apiEndpoint: 'https://advertising-api.amazon.com',
    defaultMarketplace: 'ATVPDKIKX0DER'
  },
  {
    name: 'Europe',
    code: 'EU',
    apiEndpoint: 'https://advertising-api-eu.amazon.com',
    defaultMarketplace: 'A1PA6795UKMFR9'
  },
  {
    name: 'Far East',
    code: 'FE',
    apiEndpoint: 'https://advertising-api-fe.amazon.com',
    defaultMarketplace: 'A1VC38T7YXB528'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== Enhanced Profile Detection Started ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No valid authorization header');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentication required',
          details: 'Please log in to detect profiles'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentication failed',
          details: 'Please log in again'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Empty request body');
      }
      
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request format',
          details: 'Request body must be valid JSON'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { connectionId } = requestBody;

    if (!connectionId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Connection ID is required',
          details: 'Please provide a valid Amazon connection ID'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Detecting profiles for connection:', connectionId);

    // Get connection details
    const { data: connection, error: connectionError } = await supabaseClient
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userData.user.id)
      .single();

    if (connectionError || !connection) {
      console.error('Connection not found:', connectionError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Connection not found',
          details: 'Could not find the specified Amazon connection'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    if (!clientId) {
      console.error('Missing Amazon client ID');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error',
          details: 'Amazon client ID not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allProfiles: any[] = [];
    const regionMappings: any[] = [];
    const regionsWithProfiles: string[] = [];
    const errors: string[] = [];

    // Scan each region for profiles
    for (const region of AMAZON_REGIONS) {
      try {
        console.log(`Scanning region: ${region.name} (${region.code})`);
        
        const profilesResponse = await fetch(`${region.apiEndpoint}/v2/profiles`, {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json',
          },
        });

        if (profilesResponse.ok) {
          const profilesData = await profilesResponse.json();
          console.log(`Found ${profilesData.length} profiles in ${region.name}`);

          if (profilesData && Array.isArray(profilesData) && profilesData.length > 0) {
            for (const profile of profilesData) {
              // Enhance profile with region information
              const enhancedProfile = {
                ...profile,
                detectedRegion: region.code,
                detectedRegionName: region.name,
                apiEndpoint: region.apiEndpoint
              };

              allProfiles.push(enhancedProfile);

              // Create region mapping
              regionMappings.push({
                profileId: profile.profileId.toString(),
                region: region.code,
                marketplace: profile.accountInfo?.marketplaceStringId || region.defaultMarketplace,
                countryCode: profile.countryCode,
                currencyCode: profile.currencyCode
              });
            }

            regionsWithProfiles.push(region.code);
          }
        } else {
          const errorText = await profilesResponse.text();
          console.error(`Failed to fetch profiles from ${region.name}:`, profilesResponse.status, errorText);
          errors.push(`${region.name}: ${profilesResponse.status} ${errorText}`);
        }
      } catch (regionError) {
        console.error(`Error scanning region ${region.name}:`, regionError);
        errors.push(`${region.name}: ${regionError.message}`);
      }

      // Add delay between region scans
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Determine primary region
    const regionCounts = regionMappings.reduce((acc, mapping) => {
      acc[mapping.region] = (acc[mapping.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const primaryRegion = Object.entries(regionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    // Generate recommendations
    const syncRecommendations: string[] = [];
    if (regionsWithProfiles.length === 1) {
      syncRecommendations.push('Single-region setup detected - standard sync strategy recommended');
    } else if (regionsWithProfiles.length > 1) {
      syncRecommendations.push('Multi-region setup detected - implement region-aware sync strategy');
    }

    if (allProfiles.length > 5) {
      syncRecommendations.push('Large number of profiles detected - implement batch processing');
    }

    const result = {
      success: allProfiles.length > 0,
      profiles: allProfiles,
      regionMappings,
      detectionSummary: {
        totalProfilesFound: allProfiles.length,
        regionsDetected: regionsWithProfiles,
        primaryRegion,
        marketplacesFound: [...new Set(regionMappings.map(m => m.marketplace))],
        detectionStrategy: 'multi-region-scan',
        syncRecommendations
      },
      errors,
      warnings: []
    };

    if (allProfiles.length === 0) {
      result.errors.push('No advertising profiles found in any region');
    }

    console.log('=== Enhanced Profile Detection Complete ===');
    console.log(`Found ${allProfiles.length} profiles across ${regionsWithProfiles.length} regions`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Enhanced Profile Detection Error ===');
    console.error('Error details:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error during profile detection',
        details: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
