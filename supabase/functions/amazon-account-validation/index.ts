
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  isValid: boolean;
  hasAdvertisingAccount: boolean;
  hasActiveProfiles: boolean;
  hasCampaigns: boolean;
  issues: string[];
  recommendations: string[];
  profilesFound: number;
  campaignsFound: number;
}

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

    // Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Please log in again'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
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

    // Get connection
    const { data: connection, error: connectionError } = await supabaseClient
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userData.user.id)
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ 
          error: 'Connection not found',
          details: 'Could not find the specified Amazon connection'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('AMAZON_CLIENT_ID');
    if (!clientId) {
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Amazon credentials not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation: ValidationResult = {
      isValid: true,
      hasAdvertisingAccount: false,
      hasActiveProfiles: false,
      hasCampaigns: false,
      issues: [],
      recommendations: [],
      profilesFound: 0,
      campaignsFound: 0
    };

    // Step 1: Check token validity
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    const hoursUntilExpiry = Math.round((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (tokenExpiry <= now) {
      validation.isValid = false;
      validation.issues.push('Access token has expired');
      validation.recommendations.push('Reconnect your Amazon account');
      
      return new Response(
        JSON.stringify({
          success: false,
          validation,
          message: 'Token expired - reconnection required'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check advertising profiles
    console.log('=== Checking Advertising Profiles ===');
    try {
      const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      });

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json();
        validation.profilesFound = profiles?.length || 0;
        
        if (validation.profilesFound > 0) {
          validation.hasAdvertisingAccount = true;
          validation.hasActiveProfiles = true;
          console.log(`Found ${validation.profilesFound} advertising profiles`);
        } else {
          validation.issues.push('No advertising profiles found');
          validation.recommendations.push('Set up Amazon Advertising account at advertising.amazon.com');
        }
      } else {
        const errorText = await profilesResponse.text();
        console.error('Profiles check failed:', profilesResponse.status, errorText);
        
        if (profilesResponse.status === 401) {
          validation.isValid = false;
          validation.issues.push('Authentication failed with Amazon API');
          validation.recommendations.push('Reconnect your Amazon account with proper permissions');
        } else if (profilesResponse.status === 403) {
          validation.issues.push('Access denied to Amazon Advertising API');
          validation.recommendations.push('Ensure your Amazon account has advertising permissions');
        } else {
          validation.issues.push('Failed to check advertising profiles');
          validation.recommendations.push('Try again later or contact support');
        }
      }
    } catch (profileError) {
      console.error('Profile check error:', profileError);
      validation.issues.push('Network error checking advertising profiles');
      validation.recommendations.push('Check your internet connection and try again');
    }

    // Step 3: Check campaigns (if profiles exist)
    if (validation.hasActiveProfiles && validation.profilesFound > 0) {
      console.log('=== Checking Campaigns ===');
      try {
        // Get the first profile to check campaigns
        const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': clientId,
            'Content-Type': 'application/json',
          },
        });

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          if (profiles && profiles.length > 0) {
            const primaryProfile = profiles[0];
            
            // Check campaigns for this profile
            const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/sp/campaigns', {
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': primaryProfile.profileId.toString(),
                'Content-Type': 'application/json',
              },
            });

            if (campaignsResponse.ok) {
              const campaigns = await campaignsResponse.json();
              validation.campaignsFound = campaigns?.length || 0;
              
              if (validation.campaignsFound > 0) {
                validation.hasCampaigns = true;
                console.log(`Found ${validation.campaignsFound} campaigns`);
              } else {
                validation.issues.push('No advertising campaigns found');
                validation.recommendations.push('Create your first advertising campaign in Amazon Advertising');
              }
            } else {
              console.log('Could not check campaigns - may not have permissions yet');
              validation.recommendations.push('Campaign data will be available after first campaign creation');
            }
          }
        }
      } catch (campaignError) {
        console.error('Campaign check error:', campaignError);
        // Don't mark as invalid for campaign check failures
        validation.recommendations.push('Campaign data will be checked during sync');
      }
    }

    // Step 4: Overall validation
    const overallValid = validation.isValid && validation.hasAdvertisingAccount;

    console.log('=== Validation Complete ===');
    console.log('Validation result:', {
      isValid: overallValid,
      profiles: validation.profilesFound,
      campaigns: validation.campaignsFound,
      issues: validation.issues.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        validation: {
          ...validation,
          isValid: overallValid
        },
        summary: {
          accountReady: overallValid && validation.hasCampaigns,
          setupRequired: !overallValid || validation.issues.length > 0,
          canSync: overallValid,
          nextSteps: validation.recommendations
        },
        message: overallValid 
          ? (validation.hasCampaigns 
              ? 'Account validation successful - ready for sync'
              : 'Account setup complete - create campaigns to start syncing data')
          : 'Account setup required before syncing'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Account Validation Error ===');
    console.error('Error details:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred during validation',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
