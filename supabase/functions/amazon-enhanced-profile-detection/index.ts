
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Attempting to fetch advertising profiles...');

    // Define endpoints to try
    const endpoints = [
      'https://advertising-api.amazon.com/v2/profiles',
      'https://advertising-api-eu.amazon.com/v2/profiles', 
      'https://advertising-api-fe.amazon.com/v2/profiles'
    ];

    let allProfiles = [];
    let errors = [];

    // Try each regional endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        
        const profilesResponse = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json'
          }
        });

        console.log(`Response status for ${endpoint}:`, profilesResponse.status);

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          
          if (Array.isArray(profiles) && profiles.length > 0) {
            // Filter valid profiles
            const validProfiles = profiles.filter(profile => 
              profile.profileId && 
              profile.countryCode &&
              (profile.accountInfo?.marketplaceStringId || profile.marketplaceStringId)
            );
            
            if (validProfiles.length > 0) {
              console.log(`Found ${validProfiles.length} valid profiles from ${endpoint}`);
              
              // Add profiles that aren't already in our list
              const existingIds = new Set(allProfiles.map(p => p.profileId));
              const newProfiles = validProfiles.filter(p => !existingIds.has(p.profileId));
              allProfiles.push(...newProfiles);
            }
          }
        } else {
          const errorText = await profilesResponse.text();
          errors.push(`${endpoint}: ${profilesResponse.status} ${errorText.substring(0, 100)}`);
          console.error(`Error from ${endpoint}:`, profilesResponse.status, errorText.substring(0, 200));
        }
      } catch (endpointError) {
        const errorMsg = `${endpoint}: ${endpointError.message}`;
        errors.push(errorMsg);
        console.error(`Network error for ${endpoint}:`, endpointError);
      }
    }

    console.log(`Profile detection complete. Found ${allProfiles.length} total profiles.`);

    if (allProfiles.length > 0) {
      // Sort profiles - prefer US profiles and larger profile IDs
      const sortedProfiles = allProfiles.sort((a, b) => {
        if (a.countryCode === 'US' && b.countryCode !== 'US') return -1;
        if (b.countryCode === 'US' && a.countryCode !== 'US') return 1;
        return parseInt(b.profileId) - parseInt(a.profileId);
      });

      return new Response(
        JSON.stringify({
          success: true,
          profiles: sortedProfiles,
          detectionSummary: {
            totalProfilesFound: sortedProfiles.length,
            endpointsChecked: endpoints.length,
            errorsEncountered: errors.length
          },
          message: `Successfully detected ${sortedProfiles.length} advertising profile${sortedProfiles.length === 1 ? '' : 's'}`,
          nextSteps: [
            'Profile configuration will be updated automatically',
            'Campaign sync can now proceed'
          ]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // No profiles found
      let primaryReason = 'No advertising profiles found';
      let requiresReconnection = false;
      
      // Check if we got authentication errors
      const hasAuthErrors = errors.some(err => 
        err.includes('401') || err.includes('403') || 
        err.includes('Unauthorized') || err.includes('Forbidden')
      );
      
      if (hasAuthErrors) {
        primaryReason = 'Authentication issues detected';
        requiresReconnection = true;
      }

      return new Response(
        JSON.stringify({
          success: false,
          profiles: [],
          error: 'No advertising profiles detected',
          primaryReason,
          requiresReconnection,
          detectionSummary: {
            endpointsChecked: endpoints.length,
            errorsEncountered: errors.length
          },
          detailedGuidance: requiresReconnection ? 
            ['Reconnect your Amazon account with proper permissions'] :
            [
              'Visit advertising.amazon.com to set up your advertising account',
              'Create at least one advertising campaign',  
              'Try Enhanced Sync again after setup'
            ],
          errors: errors.length > 0 ? errors : undefined
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
        primaryReason: 'Server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
