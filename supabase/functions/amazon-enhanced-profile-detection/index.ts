
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Regional endpoint configuration
const REGIONAL_ENDPOINTS = [
  {
    region: 'North America',
    endpoint: 'https://advertising-api.amazon.com/v2/profiles',
    countries: ['US', 'CA', 'MX']
  },
  {
    region: 'Europe',
    endpoint: 'https://advertising-api-eu.amazon.com/v2/profiles', 
    countries: ['UK', 'DE', 'FR', 'IT', 'ES', 'NL']
  },
  {
    region: 'Far East',
    endpoint: 'https://advertising-api-fe.amazon.com/v2/profiles',
    countries: ['JP', 'AU', 'IN', 'SG']
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
          error: 'Authentication required',
          details: 'Please log in to use enhanced profile detection'
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
          error: 'Connection ID is required',
          details: 'Please provide a valid Amazon connection ID'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile detection for connection:', connectionId);

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
          error: 'Connection not found',
          details: 'Could not find the specified Amazon connection'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token expiry
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      console.error('Token has expired');
      return new Response(
        JSON.stringify({ 
          success: false,
          profiles: [],
          error: 'Access token has expired',
          requiresReconnection: true,
          primaryReason: 'Token expired'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    if (!clientId) {
      console.error('Missing Amazon client ID');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon client ID not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Attempting enhanced profile detection across regions...');

    let allProfiles = [];
    let detectionResults = [];
    let authenticationIssues = false;

    // Enhanced multi-strategy detection
    for (const regionConfig of REGIONAL_ENDPOINTS) {
      try {
        console.log(`=== Trying ${regionConfig.region} Region ===`);
        console.log(`Endpoint: ${regionConfig.endpoint}`);
        
        const profilesResponse = await fetch(regionConfig.endpoint, {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json'
          }
        });

        console.log(`Response status for ${regionConfig.region}:`, profilesResponse.status);

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          console.log(`Raw profiles from ${regionConfig.region}:`, profiles);
          
          if (Array.isArray(profiles) && profiles.length > 0) {
            // Enhanced profile validation and filtering
            const validProfiles = profiles.filter(profile => {
              const isValid = profile.profileId && 
                             profile.countryCode &&
                             (profile.accountInfo?.marketplaceStringId || profile.marketplaceStringId);
              
              if (!isValid) {
                console.log('Filtered invalid profile:', profile);
              }
              
              return isValid;
            });
            
            if (validProfiles.length > 0) {
              console.log(`Found ${validProfiles.length} valid profiles from ${regionConfig.region}`);
              
              // Add region metadata and deduplicate
              const enrichedProfiles = validProfiles.map(profile => ({
                ...profile,
                detectedRegion: regionConfig.region,
                detectedEndpoint: regionConfig.endpoint
              }));
              
              // Deduplicate by profileId
              const existingIds = new Set(allProfiles.map(p => p.profileId));
              const newProfiles = enrichedProfiles.filter(p => !existingIds.has(p.profileId));
              
              allProfiles.push(...newProfiles);
              
              detectionResults.push({
                region: regionConfig.region,
                endpoint: regionConfig.endpoint,
                status: 'success',
                profilesFound: validProfiles.length,
                newProfilesAdded: newProfiles.length
              });
            } else {
              detectionResults.push({
                region: regionConfig.region,
                endpoint: regionConfig.endpoint,
                status: 'no_valid_profiles',
                profilesFound: 0,
                rawProfilesFound: profiles.length
              });
            }
          } else {
            detectionResults.push({
              region: regionConfig.region,
              endpoint: regionConfig.endpoint,
              status: 'empty_response',
              profilesFound: 0
            });
          }
        } else {
          const errorText = await profilesResponse.text();
          console.error(`Error from ${regionConfig.region}:`, profilesResponse.status, errorText);
          
          // Check for authentication issues
          if (profilesResponse.status === 401 || profilesResponse.status === 403) {
            authenticationIssues = true;
          }
          
          detectionResults.push({
            region: regionConfig.region,
            endpoint: regionConfig.endpoint,
            status: 'error',
            httpStatus: profilesResponse.status,
            error: errorText.substring(0, 200)
          });
        }
      } catch (endpointError) {
        console.error(`Network error for ${regionConfig.region}:`, endpointError);
        detectionResults.push({
          region: regionConfig.region,
          endpoint: regionConfig.endpoint,
          status: 'network_error',
          error: endpointError.message
        });
      }
    }

    console.log(`=== Detection Complete ===`);
    console.log(`Total profiles found: ${allProfiles.length}`);
    console.log(`Detection results:`, detectionResults);

    if (allProfiles.length > 0) {
      // Enhanced profile sorting with regional preference
      const sortedProfiles = allProfiles.sort((a, b) => {
        // Prefer US profiles
        if (a.countryCode === 'US' && b.countryCode !== 'US') return -1;
        if (b.countryCode === 'US' && a.countryCode !== 'US') return 1;
        
        // Then prefer North America region
        if (a.detectedRegion === 'North America' && b.detectedRegion !== 'North America') return -1;
        if (b.detectedRegion === 'North America' && a.detectedRegion !== 'North America') return 1;
        
        // Finally, sort by profile ID (larger = more recent)
        return parseInt(b.profileId) - parseInt(a.profileId);
      });

      return new Response(
        JSON.stringify({
          success: true,
          profiles: sortedProfiles,
          detectionSummary: {
            totalProfilesFound: sortedProfiles.length,
            regionsChecked: REGIONAL_ENDPOINTS.length,
            successfulRegions: detectionResults.filter(r => r.status === 'success').length,
            detectionResults,
            primaryRegion: sortedProfiles[0]?.detectedRegion || 'Unknown'
          },
          message: `Successfully detected ${sortedProfiles.length} advertising profile${sortedProfiles.length === 1 ? '' : 's'} across ${detectionResults.filter(r => r.status === 'success').length} region${detectionResults.filter(r => r.status === 'success').length === 1 ? '' : 's'}`,
          nextSteps: [
            'Profile configuration will be updated automatically',
            'Connection status will be set to active',
            'Campaign sync can now proceed'
          ]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Enhanced failure analysis
      let primaryReason = 'No advertising profiles found across all regions';
      let requiresReconnection = authenticationIssues;
      let detailedGuidance = [];
      
      if (authenticationIssues) {
        primaryReason = 'Authentication issues detected across multiple regions';
        requiresReconnection = true;
        detailedGuidance = [
          'Reconnect your Amazon account with proper advertising permissions',
          'Ensure your Amazon account has access to Amazon Advertising',
          'Verify that advertising campaigns exist in your account'
        ];
      } else {
        const hasNetworkErrors = detectionResults.some(r => r.status === 'network_error');
        const hasServerErrors = detectionResults.some(r => r.httpStatus >= 500);
        
        if (hasNetworkErrors) {
          primaryReason = 'Network connectivity issues during detection';
          detailedGuidance = [
            'Check your internet connection',
            'Try the enhanced sync again in a few minutes',
            'Contact support if the issue persists'
          ];
        } else if (hasServerErrors) {
          primaryReason = 'Amazon API server issues detected';
          detailedGuidance = [
            'Amazon\'s advertising API may be experiencing issues',
            'Wait a few minutes and try again',
            'Check Amazon Advertising console for service status'
          ];
        } else {
          primaryReason = 'No advertising profiles found - setup required';
          detailedGuidance = [
            'Visit advertising.amazon.com to set up your advertising account',
            'Create at least one sponsored product campaign',
            'Wait 24-48 hours for data to become available',
            'Run enhanced sync again after setup'
          ];
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          profiles: [],
          error: 'No advertising profiles detected',
          primaryReason,
          requiresReconnection,
          detectionSummary: {
            regionsChecked: REGIONAL_ENDPOINTS.length,
            successfulRegions: 0,
            detectionResults,
            authenticationIssues,
            troubleshooting: {
              hasNetworkErrors: detectionResults.some(r => r.status === 'network_error'),
              hasServerErrors: detectionResults.some(r => r.httpStatus >= 500),
              hasAuthErrors: authenticationIssues,
              allRegionsFailed: detectionResults.every(r => r.status !== 'success')
            }
          },
          detailedGuidance,
          nextSteps: requiresReconnection ? 
            ['Reconnect Amazon account'] :
            detailedGuidance,
          troubleshooting: {
            authenticationIssues,
            detectionResults
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('=== Enhanced Profile Detection Error ===');
    console.error('Error details:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        profiles: [],
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred',
        primaryReason: 'Server error during profile detection'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
