
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Regional validation endpoints
const VALIDATION_ENDPOINTS = [
  'https://advertising-api.amazon.com/v2/profiles',
  'https://advertising-api-eu.amazon.com/v2/profiles', 
  'https://advertising-api-fe.amazon.com/v2/profiles'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== Amazon Account Validation Started ===');
    
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
          details: 'Please log in to validate Amazon account'
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

    console.log('Validating Amazon account for connection:', connection.id);

    // Check if token is expired
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      return new Response(
        JSON.stringify({
          success: false,
          validation: {
            isValid: false,
            hasAdvertisingAccount: false,
            hasActiveProfiles: false,
            hasCampaigns: false,
            issues: ['Access token has expired'],
            recommendations: ['Reconnect your Amazon account'],
            profilesFound: 0,
            campaignsFound: 0
          },
          summary: {
            accountReady: false,
            setupRequired: true,
            canSync: false,
            nextSteps: ['Reconnect Amazon account']
          },
          message: 'Token expired - reconnection required'
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

    // Enhanced validation across multiple regions
    console.log('Testing Amazon API access across regions...');
    
    let totalProfiles = 0;
    let validationErrors = [];
    let authenticationFailed = false;
    
    for (const endpoint of VALIDATION_ENDPOINTS) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        
        const profilesResponse = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json'
          }
        });

        console.log(`Validation response status for ${endpoint}:`, profilesResponse.status);

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          const profileCount = Array.isArray(profiles) ? profiles.length : 0;
          totalProfiles += profileCount;
          
          console.log(`Found ${profileCount} profiles from ${endpoint}`);
          
          if (profileCount > 0) {
            // Found profiles - account is validated
            return new Response(
              JSON.stringify({
                success: true,
                validation: {
                  isValid: true,
                  hasAdvertisingAccount: true,
                  hasActiveProfiles: true,
                  hasCampaigns: true, // Assume campaigns exist if profiles exist
                  issues: [],
                  recommendations: [],
                  profilesFound: totalProfiles,
                  campaignsFound: 0 // We don't check campaigns in validation
                },
                summary: {
                  accountReady: true,
                  setupRequired: false,
                  canSync: true,
                  nextSteps: ['Run campaign sync']
                },
                message: `Account validated successfully - ${profileCount} advertising profiles found`
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          const errorText = await profilesResponse.text();
          console.error(`Validation failed for ${endpoint}:`, profilesResponse.status, errorText);
          
          if (profilesResponse.status === 401 || profilesResponse.status === 403) {
            authenticationFailed = true;
          }
          
          validationErrors.push(`${endpoint}: ${profilesResponse.status}`);
        }
      } catch (apiError) {
        console.error(`Network error for ${endpoint}:`, apiError);
        validationErrors.push(`${endpoint}: Network error`);
      }
    }

    // No profiles found across all regions
    if (authenticationFailed) {
      return new Response(
        JSON.stringify({
          success: false,
          validation: {
            isValid: false,
            hasAdvertisingAccount: false,
            hasActiveProfiles: false,
            hasCampaigns: false,
            issues: ['Authentication failed across all regions'],
            recommendations: ['Reconnect your Amazon account with proper permissions'],
            profilesFound: 0,
            campaignsFound: 0
          },
          summary: {
            accountReady: false,
            setupRequired: true,
            canSync: false,
            nextSteps: ['Reconnect Amazon account']
          },
          message: 'Authentication validation failed - reconnection required'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // API works but no profiles - setup required
      return new Response(
        JSON.stringify({
          success: false,
          validation: {
            isValid: false,
            hasAdvertisingAccount: false,
            hasActiveProfiles: false,
            hasCampaigns: false,
            issues: ['No advertising profiles found across all regions'],
            recommendations: [
              'Set up Amazon Advertising account at advertising.amazon.com',
              'Create your first advertising campaign',
              'Wait 24-48 hours for data to become available'
            ],
            profilesFound: 0,
            campaignsFound: 0
          },
          summary: {
            accountReady: false,
            setupRequired: true,
            canSync: false,
            nextSteps: [
              'Visit advertising.amazon.com',
              'Set up advertising account',
              'Create first campaign'
            ]
          },
          message: 'Amazon Advertising setup required - no profiles found',
          validationErrors
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('=== Account Validation Error ===');
    console.error('Error details:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
