
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
    console.log('=== Amazon Sync Started ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request body format',
          details: 'Request body must be valid JSON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { connectionId } = requestBody;
    console.log('Connection ID to sync:', connectionId);
    
    if (!connectionId) {
      console.error('No connection ID provided');
      return new Response(
        JSON.stringify({ 
          success: false,
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
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error',
          details: 'Supabase configuration incomplete'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');

    // Get user from auth header
    console.log('=== User Authentication Check ===');
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentication required',
          details: 'Please log in to sync your campaigns'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    let userData;
    try {
      const { data: userAuthData, error: userError } = await supabase.auth.getUser(token);
      
      console.log('User authentication result:', {
        success: !userError,
        userId: userAuthData?.user?.id,
        error: userError?.message
      });
      
      if (userError || !userAuthData.user) {
        console.error('Authentication failed:', userError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Authentication failed',
            details: userError?.message || 'Invalid session'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      userData = userAuthData;
      console.log('User authenticated successfully:', userData.user.id);
    } catch (authError) {
      console.error('Authentication process failed:', authError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentication error',
          details: authError.message
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get connection details
    console.log('=== Fetching Connection Details ===');
    let connection;
    try {
      const { data: connectionData, error: connError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', userData.user.id) // Ensure user owns this connection
        .single();

      console.log('Connection query result:', {
        success: !connError,
        connectionFound: !!connectionData,
        error: connError?.message
      });

      if (connError) {
        console.error('Error fetching connection:', connError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Connection not found',
            details: connError.message
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!connectionData) {
        console.error('No connection found for ID:', connectionId);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Connection not found',
            details: 'Invalid connection ID or access denied'
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      connection = connectionData;
      console.log('Connection found:', {
        id: connection.id,
        profile_id: connection.profile_id,
        status: connection.status,
        token_expires_at: connection.token_expires_at
      });
    } catch (dbError) {
      console.error('Database error fetching connection:', dbError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Database error',
          details: 'Failed to fetch connection details'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const amazonClientId = Deno.env.get('AMAZON_CLIENT_ID');
    if (!amazonClientId) {
      console.error('Amazon Client ID not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error',
          details: 'Amazon Client ID not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if profile is set up
    if (connection.profile_id === 'setup_required_no_profiles_found') {
      console.log('Connection requires profile setup');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Profile setup required',
          details: 'Please set up your Amazon Advertising account first at advertising.amazon.com',
          requiresSetup: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if token needs refresh
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    
    console.log('=== Token Validation ===');
    console.log('Token expires at:', tokenExpiry.toISOString());
    console.log('Current time:', now.toISOString());
    console.log('Token expired:', tokenExpiry <= now);
    
    if (tokenExpiry <= now) {
      console.log('Token expired, attempting refresh...');
      // TODO: Implement token refresh logic
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Token expired',
          details: 'Please reconnect your Amazon account',
          requiresReconnection: true
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Sync campaigns
    console.log('=== Starting Campaign Sync ===');
    let campaigns = [];
    try {
      console.log('Fetching campaigns from Amazon API...');
      const campaignsResponse = await fetch('https://advertising-api.amazon.com/v2/campaigns', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Amazon-Advertising-API-ClientId': amazonClientId,
          'Amazon-Advertising-API-Scope': connection.profile_id,
          'User-Agent': 'PPCPal/1.0'
        },
      });

      console.log('Campaigns API response status:', campaignsResponse.status);
      console.log('Campaigns API response headers:', Object.fromEntries(campaignsResponse.headers.entries()));

      if (!campaignsResponse.ok) {
        const errorText = await campaignsResponse.text();
        console.error('Failed to fetch campaigns:', {
          status: campaignsResponse.status,
          statusText: campaignsResponse.statusText,
          errorBody: errorText
        });
        
        if (campaignsResponse.status === 401) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Authentication failed with Amazon',
              details: 'Please reconnect your Amazon account',
              requiresReconnection: true
            }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to fetch campaigns from Amazon',
            details: `Amazon API error (${campaignsResponse.status}): ${errorText}`
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      campaigns = await campaignsResponse.json();
      console.log(`Found ${campaigns.length} campaigns to sync`);
      console.log('Campaign sample:', campaigns.slice(0, 2));
    } catch (fetchError) {
      console.error('Network error fetching campaigns:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Network error',
          details: `Failed to connect to Amazon API: ${fetchError.message}`
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process and store campaigns
    console.log('=== Processing and Storing Campaigns ===');
    let processedCount = 0;
    let errors = [];
    
    for (const campaign of campaigns) {
      try {
        console.log(`Processing campaign: ${campaign.name} (${campaign.campaignId})`);
        
        const campaignData = {
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
        };
        
        const { data: savedCampaign, error: saveError } = await supabase
          .from('campaigns')
          .upsert(campaignData, {
            onConflict: 'amazon_campaign_id,connection_id'
          })
          .select()
          .single();

        if (saveError) {
          console.error(`Error saving campaign ${campaign.name}:`, saveError);
          errors.push(`Failed to save campaign ${campaign.name}: ${saveError.message}`);
        } else {
          console.log(`Successfully saved campaign: ${savedCampaign.name}`);
          processedCount++;
        }
      } catch (campaignError) {
        console.error(`Error processing campaign ${campaign.name}:`, campaignError);
        errors.push(`Failed to process campaign ${campaign.name}: ${campaignError.message}`);
      }
    }

    // Update connection sync timestamp
    console.log('=== Updating Connection Sync Status ===');
    try {
      const { error: updateError } = await supabase
        .from('amazon_connections')
        .update({ 
          last_sync_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', connectionId);

      if (updateError) {
        console.error('Error updating connection sync status:', updateError);
        errors.push(`Failed to update sync timestamp: ${updateError.message}`);
      } else {
        console.log('Connection sync timestamp updated successfully');
      }
    } catch (updateError) {
      console.error('Error updating connection:', updateError);
      errors.push(`Failed to update connection: ${updateError.message}`);
    }

    console.log('=== Sync Completed ===');
    console.log(`Total campaigns found: ${campaigns.length}`);
    console.log(`Successfully processed: ${processedCount}`);
    console.log(`Errors encountered: ${errors.length}`);
    
    const response = {
      success: true,
      campaignCount: campaigns.length,
      campaignsSynced: processedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully synced ${processedCount} of ${campaigns.length} campaigns`,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('=== Amazon Sync Error ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    
    const errorResponse = {
      success: false,
      error: 'Server error',
      details: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };
    
    console.log('Error response:', errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
