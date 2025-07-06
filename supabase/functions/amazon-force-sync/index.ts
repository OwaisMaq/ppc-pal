
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

    // Enhanced token refresh logic
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
          const errorText = await refreshResponse.text();
          console.error('Token refresh failed:', refreshResponse.status, errorText);
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
    let profilesUpdated = false;

    // Enhanced profile detection and validation
    console.log('=== Enhanced Profile Detection ===');
    const shouldFetchProfiles = !connection.profile_id || 
                               connection.profile_id === 'setup_required_no_profiles_found' ||
                               connection.profile_id === 'invalid' ||
                               connection.profile_id.includes('error');

    if (shouldFetchProfiles) {
      console.log('Fetching advertising profiles from Amazon...');
      
      try {
        const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Amazon-Advertising-API-ClientId': amazonClientId,
          },
        });

        console.log('Profiles API response status:', profilesResponse.status);
        console.log('Profiles API response headers:', Object.fromEntries(profilesResponse.headers.entries()));

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          console.log('Profiles API response:', profiles);
          
          if (profiles && Array.isArray(profiles) && profiles.length > 0) {
            profilesFound = profiles.length;
            console.log(`Found ${profilesFound} advertising profiles`);
            
            // Enhanced profile selection logic
            let selectedProfile = profiles[0]; // Default to first profile
            
            // Prefer active profiles
            const activeProfiles = profiles.filter(p => p.accountInfo?.marketplaceStringId);
            if (activeProfiles.length > 0) {
              selectedProfile = activeProfiles[0];
              console.log('Selected active profile:', selectedProfile.profileId);
            }
            
            // Validate profile data
            if (selectedProfile.profileId && selectedProfile.countryCode) {
              const { error: updateError } = await supabase
                .from('amazon_connections')
                .update({
                  profile_id: selectedProfile.profileId.toString(),
                  profile_name: selectedProfile.accountInfo?.name || `${selectedProfile.countryCode} Account`,
                  marketplace_id: selectedProfile.countryCode,
                  status: 'active',
                  updated_at: new Date().toISOString()
                })
                .eq('id', connectionId);
              
              if (updateError) {
                console.error('Error updating connection with profile:', updateError);
              } else {
                console.log('Updated connection with profile:', selectedProfile.profileId);
                connection.profile_id = selectedProfile.profileId.toString();
                profilesUpdated = true;
              }
            } else {
              console.error('Invalid profile data structure:', selectedProfile);
            }
          } else {
            console.log('No advertising profiles found or invalid response structure');
            console.log('Response type:', typeof profiles);
            console.log('Response array check:', Array.isArray(profiles));
            console.log('Response length:', profiles?.length);
            
            // Update connection to reflect no profiles found
            await supabase
              .from('amazon_connections')
              .update({
                profile_id: 'setup_required_no_profiles_found',
                status: 'active', // Keep connection active but mark profile issue
                updated_at: new Date().toISOString()
              })
              .eq('id', connectionId);
          }
        } else {
          const errorText = await profilesResponse.text();
          console.error('Profiles API call failed:', profilesResponse.status, profilesResponse.statusText, errorText);
          
          if (profilesResponse.status === 401) {
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
          }
        }
      } catch (profileError) {
        console.error('Error fetching profiles:', profileError);
      }
    } else {
      console.log('Using existing profile ID:', connection.profile_id);
    }

    // Enhanced campaign sync with better error handling
    console.log('=== Enhanced Campaign Sync ===');
    
    try {
      const headers = {
        'Authorization': `Bearer ${connection.access_token}`,
        'Amazon-Advertising-API-ClientId': amazonClientId,
      };
      
      // Add profile scope if we have a valid profile ID
      if (connection.profile_id && 
          connection.profile_id !== 'setup_required_no_profiles_found' &&
          connection.profile_id !== 'invalid' &&
          !connection.profile_id.includes('error')) {
        headers['Amazon-Advertising-API-Scope'] = connection.profile_id;
        console.log('Using profile scope:', connection.profile_id);
      } else {
        console.log('No valid profile ID available for scope');
      }

      console.log('Making campaigns API request with headers:', Object.keys(headers));
      
      const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
        headers: headers,
      });

      console.log('Campaigns API response status:', campaignsResponse.status);
      console.log('Campaigns API response headers:', Object.fromEntries(campaignsResponse.headers.entries()));
      
      if (campaignsResponse.ok) {
        const campaigns = await campaignsResponse.json();
        console.log(`Found ${Array.isArray(campaigns) ? campaigns.length : 'invalid'} campaigns to sync`);

        if (Array.isArray(campaigns)) {
          // Process and store campaigns with enhanced error handling
          for (const campaign of campaigns) {
            try {
              console.log('Processing campaign:', campaign.campaignId, campaign.name);
              
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
          console.error('Invalid campaigns response format:', typeof campaigns);
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
        } else if (campaignsResponse.status === 403) {
          return new Response(
            JSON.stringify({ 
              error: 'Access denied',
              details: 'Amazon API access denied. This may indicate missing advertising profiles or insufficient permissions.',
              requiresSetup: true
            }),
            {
              status: 403,
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
    const updateData = { 
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Only update status if we successfully synced campaigns or found profiles
    if (campaignsSynced > 0 || profilesUpdated) {
      updateData.status = 'active';
    }

    const { error: updateError } = await supabase
      .from('amazon_connections')
      .update(updateData)
      .eq('id', connectionId);

    if (updateError) {
      console.error('Connection update error:', updateError);
    }

    console.log('=== Force Sync Complete ===');
    console.log('Profiles found:', profilesFound);
    console.log('Profiles updated:', profilesUpdated);
    console.log('Campaigns synced:', campaignsSynced);

    let message = '';
    if (profilesFound > 0 && campaignsSynced > 0) {
      message = `Found ${profilesFound} advertising profile(s) and synced ${campaignsSynced} campaigns.`;
    } else if (profilesFound > 0) {
      message = `Found ${profilesFound} advertising profile(s), but no campaigns were found. Please check your Amazon Advertising account.`;
    } else if (campaignsSynced > 0) {
      message = `Successfully synced ${campaignsSynced} campaigns.`;
    } else {
      message = 'No advertising profiles or campaigns found. Please ensure your Amazon Advertising account is set up properly.';
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaignCount: campaignsSynced,
        profileCount: profilesFound,
        profilesUpdated,
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
