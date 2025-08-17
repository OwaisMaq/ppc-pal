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

    const { connectionId, datasetId, destinationArn, region, action, subscriptionId, destinationType } = body;
    console.log("Extracted parameters:", { connectionId, datasetId, destinationArn, region, action, subscriptionId, destinationType });
    
    if (!connectionId || !datasetId) {
      console.error("Missing required parameters");
      return new Response("Missing required parameters", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

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
      .select("id,user_id,profile_id")
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
        const refreshResult = await db.functions.invoke('refresh-amazon-token', {
          body: { connectionId }
        });
        
        if (refreshResult.error) {
          console.error("Token refresh failed for archive:", refreshResult.error);
          return new Response(`Token refresh failed: ${refreshResult.error.message}`, { 
            status: 502, 
            headers: corsHeaders 
          });
        }

        const { data: freshConn, error: freshConnErr } = await db
          .from("amazon_connections")
          .select("access_token")
          .eq("id", connectionId)
          .single();
          
        if (freshConnErr || !freshConn?.access_token) {
          console.error("Failed to get fresh access token for archive:", freshConnErr);
          return new Response("Failed to get fresh access token", { 
            status: 502, 
            headers: corsHeaders 
          });
        }
        
        const access_token = freshConn.access_token;

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
        return new Response(JSON.stringify({ success: true, archived: true }), { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        });
        
      } catch (e) {
        console.error("Archive error:", e);
        return new Response(`Archive failed: ${e?.message ?? String(e)}`, { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }
    
    // For subscribe action, require additional parameters
    if (!destinationArn || !region) {
      console.error("Missing required parameters for subscription");
      return new Response("Missing required parameters for subscription", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // For subscribe action, refresh token and get fresh access token

    // Refresh the Amazon token first to ensure we have a valid access token
    console.log("Refreshing Amazon token...");
    const refreshResult = await db.functions.invoke('refresh-amazon-token', {
      body: { connectionId }
    });
    
    if (refreshResult.error) {
      console.error("Token refresh failed:", refreshResult.error);
      return new Response(`Token refresh failed: ${refreshResult.error.message}`, { 
        status: 502, 
        headers: corsHeaders 
      });
    }

    // Get the updated connection with fresh access token
    console.log("Getting fresh access token...");
    const { data: freshConn, error: freshConnErr } = await db
      .from("amazon_connections")
      .select("access_token")
      .eq("id", connectionId)
      .single();
      
    if (freshConnErr || !freshConn?.access_token) {
      console.error("Failed to get fresh access token:", freshConnErr);
      return new Response("Failed to get fresh access token", { 
        status: 502, 
        headers: corsHeaders 
      });
    }
    
    const access_token = freshConn.access_token;
    console.log("Fresh access token obtained");

    // Get AMS base URL
    const base =
      region === "eu-west-1" ? "https://advertising-api-eu.amazon.com" :
      region === "us-east-1" ? "https://advertising-api.amazon.com" :
      region === "us-west-2" ? "https://advertising-api-fe.amazon.com" :
      null;
      
    if (!base) {
      console.error("Unsupported region:", region);
      return new Response(`Unsupported region: ${region}`, { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    console.log("Using AMS base URL:", base);

    // Create subscription
    const subscriptionPayload = { datasetId, destinationArn, compression: "GZIP" };
    console.log("Creating AMS subscription with payload:", subscriptionPayload);
    
    const res = await fetch(`${base}/streams/subscriptions`, {
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

    // Parse Amazon response to get subscription ID
    let amazonResponse;
    try {
      amazonResponse = JSON.parse(responseText);
    } catch (e) {
      console.warn("Failed to parse Amazon response as JSON:", e);
      amazonResponse = {};
    }

    // Persist subscription in our database
    const { error: dbError } = await db
      .from("ams_subscriptions")
      .upsert({
        connection_id: connectionId,
        dataset_id: datasetId,
        destination_type: destinationType || "firehose",
        destination_arn: destinationArn,
        region: region,
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
    return new Response(responseText, { 
      status: 200, 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      } 
    });
    
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