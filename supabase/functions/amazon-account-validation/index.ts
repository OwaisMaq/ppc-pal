
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
          success: false,
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

    const { connectionId, test } = requestBody;

    // Handle test mode for environment validation
    if (test) {
      console.log('=== Test Mode - Environment Validation ===');
      
      // Check if Amazon credentials are available
      const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
      const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
      
      if (!amazonClientId || !amazonClientSecret) {
        console.error('Amazon credentials missing');
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Amazon API credentials not configured',
            details: 'Please set up AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET in Supabase secrets',
            errorType: !amazonClientId ? 'missing_amazon_client_id' : 'missing_amazon_client_secret'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Environment validation passed - credentials available');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Amazon API credentials are properly configured',
          credentialsConfigured: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log('Validating account for connection:', connectionId);

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

    // Basic validation - check if connection has required fields
    const validation = {
      isValid: !!(connection.access_token && connection.refresh_token),
      hasAdvertisingAccount: connection.profile_id !== 'setup_required_no_profiles_found',
      hasActiveProfiles: connection.profile_id !== 'setup_required_no_profiles_found',
      hasCampaigns: false, // We'll check this later
      issues: [] as string[],
      recommendations: [] as string[],
      profilesFound: connection.profile_id !== 'setup_required_no_profiles_found' ? 1 : 0,
      campaignsFound: 0
    };

    if (!connection.access_token) {
      validation.issues.push('Missing access token');
    }
    if (!connection.refresh_token) {
      validation.issues.push('Missing refresh token');
    }
    if (connection.profile_id === 'setup_required_no_profiles_found') {
      validation.issues.push('No advertising profiles found');
      validation.recommendations.push('Set up Amazon Advertising account at advertising.amazon.com');
    }

    // Check token expiry
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    const hoursUntilExpiry = Math.round((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursUntilExpiry <= 0) {
      validation.issues.push('Access token has expired');
      validation.recommendations.push('Refresh token or reconnect account');
    } else if (hoursUntilExpiry <= 24) {
      validation.recommendations.push('Token expires soon - consider refreshing');
    }

    // Count campaigns if profiles exist
    if (validation.hasActiveProfiles) {
      const { count: campaignCount } = await supabaseClient
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', connectionId);
      
      validation.campaignsFound = campaignCount || 0;
      validation.hasCampaigns = (campaignCount || 0) > 0;
      
      if (!validation.hasCampaigns) {
        validation.issues.push('No campaigns found');
        validation.recommendations.push('Create advertising campaigns in Amazon Seller Central');
      }
    }

    const summary = {
      accountReady: validation.isValid && validation.hasAdvertisingAccount,
      setupRequired: !validation.hasAdvertisingAccount,
      canSync: validation.isValid && validation.hasActiveProfiles,
      nextSteps: validation.recommendations
    };

    const result = {
      success: true,
      validation,
      summary,
      message: validation.issues.length === 0 ? 
        'Amazon account is properly configured' : 
        `Found ${validation.issues.length} issue(s) that need attention`
    };

    console.log('=== Account Validation Complete ===');
    console.log('Result:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Account Validation Error ===');
    console.error('Error details:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error during account validation',
        details: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
