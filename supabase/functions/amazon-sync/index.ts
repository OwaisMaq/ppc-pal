
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Amazon Sync Function Started ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const { connectionId } = await req.json();
    console.log('Connection ID:', connectionId);
    
    if (!connectionId) {
      console.error('No connection ID provided');
      return new Response(
        JSON.stringify({ 
          error: 'Connection ID is required',
          details: 'Please provide a valid connection ID'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    
    console.log('Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      amazonClientId: !!amazonClientId
    });

    if (!supabaseUrl || !supabaseKey || !amazonClientId) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get connection details with improved error handling
    console.log('Fetching connection details...');
    const { data: connection, error: connError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError) {
      console.error('Connection fetch error:', connError);
      return new Response(
        JSON.stringify({ 
          error: 'Connection not found',
          details: `Failed to retrieve connection: ${connError.message}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!connection) {
      console.error('No connection found for ID:', connectionId);
      return new Response(
        JSON.stringify({ 
          error: 'Connection not found',
          details: 'The specified connection does not exist'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Connection details:', {
      id: connection.id,
      status: connection.status,
      profile_id: connection.profile_id,
      marketplace_id: connection.marketplace_id,
      has_access_token: !!connection.access_token,
      token_expires_at: connection.token_expires_at
    });

    // Check if token is expired and needs refresh
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      console.log('Token expired, attempting refresh...');
      
      try {
        const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: connection.refresh_token,
            client_id: amazonClientId,
            client_secret: Deno.env.get('AMAZON_CLIENT_SECRET') || '',
          }),
        });

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          
          // Update connection with new token
          await supabase
            .from('amazon_connections')
            .update({
              access_token: tokenData.access_token,
              token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionId);
          
          connection.access_token = tokenData.access_token;
          console.log('Token refreshed successfully');
        } else {
          console.error('Token refresh failed:', refreshResponse.status);
          return new Response(
            JSON.stringify({ 
              error: 'Token refresh failed',
              details: 'Please reconnect your Amazon account',
              requiresReconnection: true
            }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
        return new Response(
          JSON.stringify({ 
            error: 'Token refresh failed',
            details: 'Please reconnect your Amazon account',
            requiresReconnection: true
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Check if we need to fetch profiles first
    if (!connection.profile_id || connection.profile_id === 'setup_required_no_profiles_found') {
      console.log('No valid profile ID, fetching profiles...');
      
      try {
        const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': amazonClientId,
          },
        });

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          console.log(`Found ${profiles.length} profiles`);
          
          if (profiles.length > 0) {
            const profile = profiles[0];
            
            // Update connection with profile info
            await supabase
              .from('amazon_connections')
              .update({
                profile_id: profile.profileId.toString(),
                profile_name: profile.accountInfo?.name || `${profile.countryCode} Profile`,
                marketplace_id: profile.countryCode,
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionId);
            
            connection.profile_id = profile.profileId.toString();
            console.log('Updated connection with profile:', profile.profileId);
          } else {
            console.log('No advertising profiles found');
            return new Response(
              JSON.stringify({ 
                error: 'Profile setup required',
                details: 'No advertising profiles found. Please set up Amazon Advertising first.',
                requiresSetup: true
              }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        } else {
          console.error('Profiles API failed:', profilesResponse.status);
          return new Response(
            JSON.stringify({ 
              error: 'Profile setup required',
              details: 'Could not access advertising profiles. Please ensure Amazon Advertising is set up.',
              requiresSetup: true
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } catch (profileError) {
        console.error('Profile fetch error:', profileError);
        return new Response(
          JSON.stringify({ 
            error: 'Profile setup required',
            details: 'Failed to fetch advertising profiles. Please try again.',
            requiresSetup: true
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Now fetch campaigns
    console.log('Fetching campaigns from Amazon API...');
    let campaignsSynced = 0;
    
    try {
      const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': amazonClientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
        },
      });

      console.log('Campaigns API response status:', campaignsResponse.status);
      
      if (campaignsResponse.ok) {
        const campaigns = await campaignsResponse.json();
        console.log(`Received ${campaigns.length} campaigns from Amazon`);

        // Process and store campaigns
        for (const campaign of campaigns) {
          try {
            const { error: upsertError } = await supabase
              .from('campaigns')
              .upsert({
                connection_id: connectionId,
                amazon_campaign_id: campaign.campaignId.toString(),
                name: campaign.name,
                campaign_type: campaign.campaignType,
                targeting_type: campaign.targetingType,
                status: campaign.state?.toLowerCase() || 'paused',
                daily_budget: campaign.dailyBudget,
                start_date: campaign.startDate,
                end_date: campaign.endDate,
                data_source: 'api',
                last_updated: new Date().toISOString(),
              }, {
                onConflict: 'amazon_campaign_id,connection_id'
              });

            if (upsertError) {
              console.error('Campaign upsert error:', campaign.campaignId, upsertError);
            } else {
              campaignsSynced++;
            }
          } catch (campaignError) {
            console.error('Error processing campaign:', campaign.campaignId, campaignError);
          }
        }

        console.log(`Successfully synced ${campaignsSynced} campaigns`);
      } else {
        const errorText = await campaignsResponse.text();
        console.error('Campaigns API error:', campaignsResponse.status, errorText);
        
        if (campaignsResponse.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: 'Authentication failed',
              details: 'Amazon API authentication failed. Please reconnect your account.',
              requiresReconnection: true
            }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              error: 'Campaign sync failed',
              details: `Amazon API error: ${campaignsResponse.statusText}`,
              statusCode: campaignsResponse.status
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    } catch (campaignError) {
      console.error('Campaign sync error:', campaignError);
      return new Response(
        JSON.stringify({ 
          error: 'Campaign sync failed',
          details: 'Network error while fetching campaigns. Please try again.',
          originalError: campaignError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update connection sync timestamp and status
    const { error: updateError } = await supabase
      .from('amazon_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Connection update error:', updateError);
    }

    console.log('=== Amazon Sync Completed Successfully ===');
    console.log('Campaigns synced:', campaignsSynced);

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaignsSynced,
        message: `Successfully synced ${campaignsSynced} campaigns from Amazon`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('=== Amazon Sync Function Error ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: 'An unexpected error occurred during sync. Please try again.',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
