import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AMZ_CLIENT_ID = Deno.env.get("AMAZON_CLIENT_ID")!;
const AMZ_CLIENT_SECRET = Deno.env.get("AMAZON_CLIENT_SECRET")!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("AMS Subscribe function started");
    
    // Check environment variables first
    if (!SB_URL || !SB_ANON || !SB_SERVICE || !AMZ_CLIENT_ID || !AMZ_CLIENT_SECRET) {
      console.error("Missing required environment variables:", { 
        hasUrl: !!SB_URL, 
        hasAnon: !!SB_ANON, 
        hasService: !!SB_SERVICE, 
        hasClientId: !!AMZ_CLIENT_ID, 
        hasClientSecret: !!AMZ_CLIENT_SECRET 
      });
      return new Response("Server configuration error: Missing required environment variables", { 
        status: 500, 
        headers: corsHeaders 
      });
    }
    
    console.log("Environment variables validated successfully");

    // 1) Who is calling?
    const auth = createClient(SB_URL, SB_ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError) {
      console.error("Auth error:", authError);
      return new Response(`Authentication failed: ${authError.message}`, { 
        status: 401, 
        headers: corsHeaders 
      });
    }
    if (!user) {
      console.error("No user found");
      return new Response("Unauthorized", { 
        status: 401, 
        headers: corsHeaders 
      });
    }
    console.log("User authenticated:", user.id);

    // 2) Parse payload with error handling
    let connectionId, datasetId, destinationArn, region;
    try {
      const body = await req.json();
      ({ connectionId, datasetId, destinationArn, region } = body);
      console.log("Request payload:", { connectionId, datasetId, destinationArn, region });
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response("Invalid JSON in request body", { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    if (!connectionId || !datasetId || !destinationArn || !region) {
      console.error("Missing required parameters:", { connectionId: !!connectionId, datasetId: !!datasetId, destinationArn: !!destinationArn, region: !!region });
      return new Response("Bad request: Missing connectionId, datasetId, destinationArn, or region", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // 3) Load connection with service role (bypass RLS) and enforce ownership
    const db = createClient(SB_URL, SB_SERVICE);
    const { data: conn, error: connErr } = await db
      .from("amazon_connections")
      .select("id,user_id,profile_id,refresh_token")
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
      return new Response("Forbidden: Connection not owned by user", { 
        status: 403, 
        headers: corsHeaders 
      });
    }
    
    console.log("Connection verified for user:", { connectionId, profileId: conn.profile_id });

    // 4) Exchange refresh token → access token
    console.log("Exchanging refresh token for access token");
    const tokRes = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: conn.refresh_token,
        client_id: AMZ_CLIENT_ID,
        client_secret: AMZ_CLIENT_SECRET,
      }),
    });
    
    if (!tokRes.ok) {
      const errorText = await tokRes.text();
      console.error("Amazon token exchange failed:", { status: tokRes.status, error: errorText });
      return new Response(`Token exchange failed (${tokRes.status}): ${errorText}`, { 
        status: 502, 
        headers: corsHeaders 
      });
    }
    
    const tokenData = await tokRes.json();
    const { access_token } = tokenData;
    console.log("Access token obtained successfully");

    // 5) Region → AMS base URL
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

    // 6) Create subscription
    const subscriptionPayload = { datasetId, destinationArn, compression: "GZIP" };
    console.log("Creating AMS subscription:", subscriptionPayload);
    
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
    
    const text = await res.text();
    console.log("AMS API response:", { status: res.status, response: text });
    
    if (!res.ok) {
      console.error("AMS subscription creation failed:", { status: res.status, error: text });
      return new Response(`AMS API error (${res.status}): ${text}`, { 
        status: 502, 
        headers: corsHeaders 
      });
    }

    console.log("AMS subscription created successfully");
    return new Response(text, { 
      status: 200, 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      } 
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(`Unexpected error: ${e?.message ?? e}`, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});