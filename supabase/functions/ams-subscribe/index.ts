import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== AMS Subscribe function started ===");
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    // Get environment variables
    const SB_URL = Deno.env.get("SUPABASE_URL");
    const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const AMZ_CLIENT_ID = Deno.env.get("AMAZON_CLIENT_ID");
    const AMZ_CLIENT_SECRET = Deno.env.get("AMAZON_CLIENT_SECRET");
    
    console.log("Environment variables check:", {
      hasUrl: !!SB_URL,
      hasAnon: !!SB_ANON,
      hasService: !!SB_SERVICE,
      hasClientId: !!AMZ_CLIENT_ID,
      hasClientSecret: !!AMZ_CLIENT_SECRET
    });
    
    if (!SB_URL || !SB_ANON || !SB_SERVICE || !AMZ_CLIENT_ID || !AMZ_CLIENT_SECRET) {
      console.error("Missing environment variables!");
      return new Response("Missing environment variables", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Parse request body
    let body;
    try {
      const text = await req.text();
      console.log("Raw request body:", text);
      body = JSON.parse(text);
      console.log("Parsed request body:", body);
    } catch (e) {
      console.error("JSON parse error:", e);
      return new Response(`JSON parse error: ${e.message}`, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Check required environment variables
    const requiredEnvs = {
      SUPABASE_URL: SB_URL,
      SUPABASE_ANON_KEY: SB_ANON,
      SUPABASE_SERVICE_ROLE_KEY: SB_SERVICE,
      AMAZON_CLIENT_ID: Deno.env.get('AMAZON_CLIENT_ID'),
      AMAZON_CLIENT_SECRET: Deno.env.get('AMAZON_CLIENT_SECRET')
    };

    const missingEnvs = Object.entries(requiredEnvs)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    if (missingEnvs.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Missing environment variables: ${missingEnvs.join(', ')}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { connectionId, datasetId, destinationArn, region, action, subscriptionId, destinationType, snsTopicArn } = body;
    console.log("Extracted parameters:", { connectionId, datasetId, destinationArn, region, action, subscriptionId, destinationType, snsTopicArn });
    
    if (!connectionId || !datasetId) {
      console.error("Missing required parameters");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required parameters" 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Helper function to get region and destination ARN based on advertising API endpoint
    const getRegionAndArn = (apiEndpoint: string, type: 'sqs' | 's3' = 's3') => {
      let region: string;
      let baseUrl: string;
      let arn: string | undefined;
      
      if (apiEndpoint?.includes('advertising-api-eu')) {
        region = 'eu-west-1';
        baseUrl = 'https://advertising-api-eu.amazon.com';
        arn = type === 's3' ? Deno.env.get('AMS_S3_ARN_EU') : Deno.env.get('AMS_SQS_ARN_EU');
      } else if (apiEndpoint?.includes('advertising-api-fe')) {
        region = 'us-west-2';
        baseUrl = 'https://advertising-api-fe.amazon.com';
        arn = type === 's3' ? Deno.env.get('AMS_S3_ARN_FE') : Deno.env.get('AMS_SQS_ARN_FE');
      } else {
        region = 'us-east-1';
        baseUrl = 'https://advertising-api.amazon.com';
        arn = type === 's3' ? Deno.env.get('AMS_S3_ARN_NA') : Deno.env.get('AMS_SQS_ARN_NA');
      }
      
      return { region, arn, baseUrl };
    };

    // Authenticate user first
    console.log("Creating auth client...");
    const auth = createClient(SB_URL, SB_ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    
    console.log("Getting user...");
    const { data: { user }, error: authError } = await auth.auth.getUser();
    
    if (authError) {
      console.error("Auth error:", authError);
      return new Response(`Auth error: ${authError.message}`, { 
        status: 401, 
        headers: corsHeaders 
      });
    }
    
    if (!user) {
      console.error("No user found");
      return new Response("No user found", { 
        status: 401, 
        headers: corsHeaders 
      });
    }
    
    console.log("User authenticated:", user.id);

    // Get connection
    console.log("Creating service client...");
    const db = createClient(SB_URL, SB_SERVICE);
    
    console.log("Querying connection...");
    const { data: conn, error: connErr } = await db
      .from("amazon_connections")
      .select("id,user_id,profile_id,advertising_api_endpoint")
      .eq("id", connectionId)
      .single();
      
    if (connErr) {
      console.error("Connection query error:", connErr);
      return new Response(`Connection error: ${connErr.message}`, { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    
    if (!conn) {
      console.error("Connection not found:", connectionId);
      return new Response("Connection not found", { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    
    if (conn.user_id !== user.id) {
      console.error("User ownership mismatch:", { connectionUserId: conn.user_id, requestUserId: user.id });
      return new Response("Forbidden", { 
        status: 403, 
        headers: corsHeaders 
      });
    }
    
    console.log("Connection verified for user");

    // Handle archive action
    if (action === "archive" && subscriptionId) {
      console.log("Processing archive request for subscription:", subscriptionId);
      try {
        // Get fresh access token for archive
        const authHeader = req.headers.get("Authorization") ?? "";
        const refreshResult = await fetch(`${SB_URL}/functions/v1/refresh-amazon-token`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'apikey': SB_ANON,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ connectionId })
        });
        
        if (!refreshResult.ok) {
          const errorText = await refreshResult.text();
          console.error("Token refresh failed for archive:", errorText);
          return new Response(`Token refresh failed: ${errorText}`, { 
            status: 502, 
            headers: corsHeaders 
          });
        }

        // Get tokens from secure storage using RPC with authenticated client
        const { data: tokensArray, error: tokenError } = await auth
          .rpc('get_tokens', {
            p_profile_id: conn.profile_id
          });
        
        if (tokenError) {
          console.error('Token retrieval error for archive:', tokenError);
          return new Response("Failed to retrieve stored tokens", { 
            status: 502, 
            headers: corsHeaders 
          });
        }
        
        // RPC returns an array, get the first element
        const tokens = tokensArray?.[0];
        
        if (!tokens || !tokens.access_token) {
          console.error('No access token found for profile:', conn.profile_id);
          return new Response("Failed to get fresh access token", { 
            status: 502, 
            headers: corsHeaders 
          });
        }
        
        const access_token = tokens.access_token;

        // Get AMS base URL
        const base =
          region === "eu-west-1" ? "https://advertising-api-eu.amazon.com" :
          region === "us-east-1" ? "https://advertising-api.amazon.com" :
          region === "us-west-2" ? "https://advertising-api-fe.amazon.com" :
          "https://advertising-api-eu.amazon.com"; // Default fallback
          
        console.log("Using AMS base URL for archive:", base);

        // Archive the subscription in Amazon
        const res = await fetch(`${base}/streams/subscriptions/${subscriptionId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Amazon-Advertising-API-ClientId": AMZ_CLIENT_ID,
            "Amazon-Advertising-API-Scope": String(conn.profile_id),
          },
        });
        
        console.log("Amazon archive response status:", res.status);
        const responseText = await res.text();
        console.log("Amazon archive response body:", responseText);
        
        // Update our database to mark as archived
        const { error: dbError } = await db
          .from("ams_subscriptions")
          .update({ status: "archived", updated_at: new Date().toISOString() })
          .eq("connection_id", connectionId)
          .eq("dataset_id", datasetId)
          .eq("subscription_id", subscriptionId);
          
        if (dbError) {
          console.error("Failed to update subscription status:", dbError);
        }
        
        if (!res.ok) {
          console.error("Amazon subscription archive failed");
          return new Response(`Amazon API error (${res.status}): ${responseText}`, { 
            status: 502, 
            headers: corsHeaders 
          });
        }

        console.log("=== AMS subscription archived successfully ===");
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Subscription archived successfully' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (e) {
      console.error("Archive error:", e);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Archive failed: ${e?.message ?? String(e)}` 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  } else if (action === 'subscribe') {
    // Handle subscribe action - use SQS (recommended for Amazon Marketing Stream)
    
    // Default to SQS destination - standard approach for Amazon Marketing Stream
    const finalDestinationType = destinationType || "sqs";
    
    // Get region and ARN based on connection's advertising API endpoint and destination type
    const { region: managedRegion, arn: managedArn, baseUrl } = getRegionAndArn(
      conn.advertising_api_endpoint, 
      finalDestinationType as 'sqs' | 's3'
    );
    
    const finalRegion = region || managedRegion;
    const finalDestinationArn = destinationArn || managedArn;
    
    console.log("Using configuration:", { finalDestinationType, finalRegion, finalDestinationArn });
    
    if (!finalDestinationArn) {
      console.error("No destination ARN available for region:", finalRegion);
      const destType = finalDestinationType.toUpperCase();
      return new Response(JSON.stringify({ 
        success: false, 
        error: `No managed ${destType} ARN configured for region: ${finalRegion}. Please set AMS_${destType}_ARN_${finalRegion === 'eu-west-1' ? 'EU' : finalRegion === 'us-west-2' ? 'FE' : 'NA'} in Supabase secrets.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Refresh the Amazon token first to ensure we have a valid access token
    console.log("Refreshing Amazon token...");
    const authHeader = req.headers.get("Authorization") ?? "";
    const refreshResult = await fetch(`${SB_URL}/functions/v1/refresh-amazon-token`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'apikey': SB_ANON,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ connectionId })
    });
    
    if (!refreshResult.ok) {
      const errorText = await refreshResult.text();
      console.error("Token refresh failed:", errorText);
      return new Response(`Token refresh failed: ${errorText}`, { 
        status: 502, 
        headers: corsHeaders 
      });
    }

    // Get tokens from secure storage using RPC with authenticated client
    console.log("Getting fresh access token...");
    const { data: tokensArray, error: tokenError } = await auth
      .rpc('get_tokens', {
        p_profile_id: conn.profile_id
      });
    
    if (tokenError) {
      console.error('Token retrieval error:', tokenError);
      return new Response("Failed to retrieve stored tokens", { 
        status: 502, 
        headers: corsHeaders 
      });
    }
    
    // RPC returns an array, get the first element
    const tokens = tokensArray?.[0];
    
    if (!tokens || !tokens.access_token) {
      console.error('No access token found for profile:', conn.profile_id);
      return new Response("Failed to get fresh access token", { 
        status: 502, 
        headers: corsHeaders 
      });
    }
    
    const access_token = tokens.access_token;
    console.log("Fresh access token obtained");
    
    console.log("Using AMS base URL:", baseUrl);

    // Create subscription with user-provided SNS topic ARN if available
    const clientRequestToken = crypto.randomUUID();
    const subscriptionPayload: any = { 
      dataSetId: datasetId,  // Amazon expects capital S
      clientRequestToken  // Required for idempotency
    };
    
    // If user provided their own SNS topic ARN, use it
    if (snsTopicArn) {
      subscriptionPayload.destinationArn = snsTopicArn;
      console.log("Creating AMS subscription with user SNS topic:", snsTopicArn);
    } else {
      console.log("Creating AMS subscription (Amazon will create SNS topic)");
    }
    
    console.log("Subscription payload:", subscriptionPayload);
    
    const res = await fetch(`${baseUrl}/streams/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Amazon-Advertising-API-ClientId": AMZ_CLIENT_ID,
        "Amazon-Advertising-API-Scope": String(conn.profile_id),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionPayload),
    });
    
    console.log("AMS API response status:", res.status);
    const responseText = await res.text();
    console.log("AMS API response body:", responseText);
    
    if (!res.ok) {
      console.error("AMS subscription creation failed");
      return new Response(`AMS API error (${res.status}): ${responseText}`, { 
        status: 502, 
        headers: corsHeaders 
      });
    }

    // Parse Amazon response to get subscription ID and SNS topic ARN
    let amazonResponse;
    try {
      amazonResponse = JSON.parse(responseText);
      console.log("Amazon created subscription with SNS topic:", {
        subscriptionId: amazonResponse.subscriptionId,
        snsTopicArn: amazonResponse.destinationArn,
        status: amazonResponse.status
      });
    } catch (e) {
      console.warn("Failed to parse Amazon response as JSON:", e);
      amazonResponse = {};
    }

    // Extract the SNS topic ARN (either user-provided or Amazon-created)
    const finalSnsTopicArn = snsTopicArn || amazonResponse.destinationArn;

    // Persist subscription in our database
    const { error: dbError } = await db
      .from("ams_subscriptions")
      .upsert({
        connection_id: connectionId,
        dataset_id: datasetId,
        destination_type: finalDestinationType,
        sns_topic_arn: finalSnsTopicArn,  // Store the SNS topic ARN
        region: finalRegion,
        status: "active",
        subscription_id: amazonResponse.subscriptionId || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "connection_id,dataset_id",
        ignoreDuplicates: false
      });
      
    if (dbError) {
      console.error("Failed to persist subscription in database:", dbError);
      // Don't fail the request since Amazon subscription was successful
    } else {
      console.log("Subscription persisted in database successfully");
    }

    console.log("=== AMS subscription created successfully ===");
    return new Response(JSON.stringify({ 
      success: true, 
      subscriptionId: amazonResponse.subscriptionId, 
      snsTopicArn: finalSnsTopicArn,
      datasetId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } else {
    // Invalid action
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Unsupported action' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
    
  } catch (e) {
    console.error("=== Unexpected error in AMS Subscribe function ===");
    console.error("Error type:", typeof e);
    console.error("Error message:", e?.message);
    console.error("Error stack:", e?.stack);
    console.error("Full error:", e);
    
    return new Response(`Unexpected error: ${e?.message ?? String(e)}`, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});