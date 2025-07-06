
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
    console.log('=== Amazon Force Sync Function Started ===');
    console.log('Request method:', req.method);
    console.log('Timestamp:', new Date().toISOString());
    
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
    const amazonClientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
    
    console.log('Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      amazonClientId: !!amazonClientId,
      amazonClientSecret: !!amazonClientSecret
    });

    if (!supabaseUrl || !supabaseKey || !amazonClientId || !amazonClientSecret) {
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

    // Get connection details
    console.log('Fetching connection details...');
    const { data: connection, error: connError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      console.error('Connection not found:', connError);
      return new Response(
        JSON.stringify({ 
          error: 'Connection not found',
          details: `Failed to retrieve connection: ${connError?.message || 'Connection does not exist'}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Connection found:', {
      id: connection.id,
      profile_id: connection.profile_id,
      marketplace_id: connection.marketplace_id,
      status: connection.status,
      has_access_token: !!connection.access_token,
      token_expires_at: connection.token_expires_at
    });

    // Check if token needs refresh
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
            client_secret: amazonClientSecret,
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
              error: 'Token expired - please reconnect your Amazon account',
              details: 'Authentication token has expired and could not be refreshed',
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

    let campaignsSynced = 0;
    let profilesFound = 0;

    // First, try to get profiles if we don't have any or have placeholder
    if (!connection.profile_id || connection.profile_id === 'setup_required_no_profiles_found') {
      console.log('No valid profile_id found, attempting to fetch profiles...');
      
      try {
        const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': amazonClientId,
          },
        });

        console.log('Profiles API response status:', profilesResponse.status);

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          console.log('Profiles response:', profiles);
          
          if (profiles && profiles.length > 0) {
            profilesFound = profiles.length;
            const profile = profiles[0]; // Use first profile
            
            // Update connection with profile info
            const { error: updateError } = await supabase
              .from('amazon_connections')
              .update({
                profile_id: profile.profileId.toString(),
                profile_name: profile.accountInfo?.name || `${profile.countryCode} Account`,
                marketplace_id: profile.countryCode,
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionId);
            
            if (updateError) {
              console.error('Error updating connection with profile:', updateError);
            } else {
              console.log('Updated connection with profile:', profile.profileId);
              connection.profile_id = profile.profileId.toString();
            }
          } else {
            console.log('No advertising profiles found in response');
          }
        } else {
          const errorText = await profilesResponse.text();
          console.log('Profiles API call failed:', profilesResponse.status, profilesResponse.statusText, errorText);
        }
      } catch (profileError) {
        console.error('Error fetching profiles:', profileError);
      }
    }

    // Try to sync campaigns regardless of profile status (force sync)
    console.log('Attempting to fetch campaigns (force sync)...');
    
    try {
      const headers = {
        'Authorization': `Bearer ${connection.access_token}`,
        'Amazon-Advertising-API-ClientId': amazonClientId,
      };
      
      // Add profile scope if we have a valid profile ID
      if (connection.profile_id && connection.profile_id !== 'setup_required_no_profiles_found') {
        headers['Amazon-Advertising-API-Scope'] = connection.profile_id;
      }

      const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
        headers: headers,
      });

      console.log('Campaigns API response status:', campaignsResponse.status);
      
      if (campaignsResponse.ok) {
        const campaigns = await campaignsResponse.json();
        console.log(`Found ${campaigns.length} campaigns to sync`);

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
              console.error('Error upserting campaign:', campaign.campaignId, upsertError);
            } else {
              campaignsSynced++;
            }
          } catch (campaignError) {
            console.error('Error processing campaign:', campaign.campaignId, campaignError);
          }
        }
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
              error: `Failed to fetch campaigns: ${campaignsResponse.statusText}`,
              details: `Amazon API returned status ${campaignsResponse.status}`,
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

    console.log('=== Force Sync Complete ===');
    console.log('Profiles found:', profilesFound);
    console.log('Campaigns synced:', campaignsSynced);

    let message = `Successfully synced ${campaignsSynced} campaigns.`;
    if (profilesFound > 0) {
      message += ` Also found and configured ${profilesFound} advertising profile(s).`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaignCount: campaignsSynced,
        profileCount: profilesFound,
        message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('=== Amazon Force Sync Function Error ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: 'Force sync failed - please check your Amazon account setup and try again.',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
