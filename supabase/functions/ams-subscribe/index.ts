import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function wait(attempt: number) {
  const delay = Math.min(1000 * 2 ** attempt, 8000);
  return new Promise((r) => setTimeout(r, delay));
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if ([408, 425, 429, 500, 502, 503, 504].includes(res.status)) {
        await wait(i);
        continue;
      }
      return res;
    } catch (e) {
      await wait(i);
    }
  }
  return fetch(url, init);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Client for user auth verification  
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });

  // Service role client for database access (bypasses RLS)
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Authenticate user with anon client
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { action, connectionId } = body as { action: string; connectionId: string };

    if (!action || !connectionId) {
      return new Response(JSON.stringify({ error: "Missing action or connectionId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load connection with service role and verify ownership
    const { data: conn, error: connErr } = await serviceClient
      .from("amazon_connections")
      .select("id, user_id, profile_id, advertising_api_endpoint, access_token")
      .eq("id", connectionId)
      .single();
    if (connErr || !conn) throw new Error(connErr?.message || "Connection not found");
    
    // Verify ownership - user must own this connection
    if (conn.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied - connection not owned by user" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiEndpoint: string = conn.advertising_api_endpoint || "https://advertising-api-eu.amazon.com";
    const clientId = Deno.env.get("AMAZON_CLIENT_ID") || "";
    const accessToken: string = conn.access_token as string;

    // Debug logging
    console.log("AMS API Debug:", {
      apiEndpoint,
      hasClientId: !!clientId,
      clientIdLength: clientId.length,
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length,
      profileId: conn.profile_id,
      action
    });

    if (action === "subscribe") {
      const { datasetId, destinationType, destinationArn, region } = body as any;
      if (!datasetId || !destinationType || !destinationArn || !region) {
        return new Response(JSON.stringify({ error: "Missing subscription parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payload = {
        datasetId,
        destination: { type: destinationType, arn: destinationArn, region },
      };

      console.log("AMS Subscribe Request:", {
        url: `${apiEndpoint}/streams/subscriptions`,
        payload,
        headers: {
          hasAuth: !!accessToken,
          clientId: clientId || "(empty)",
          scope: conn.profile_id
        }
      });

      const res = await fetchWithRetry(`${apiEndpoint}/streams/subscriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Amazon-Advertising-API-ClientId": clientId,
          "Amazon-Advertising-API-Scope": conn.profile_id,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("AMS Subscribe Response:", {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: text
      });

      if (!res.ok) {
        console.error("AMS subscribe error:", res.status, text);
        return new Response(JSON.stringify({ error: `AMS subscribe failed: ${res.status} ${text}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const out = (() => { try { return JSON.parse(text) } catch { return { raw: text } } })();

      // Persist reference for UI using service client (best-effort)
      const { id: subscriptionId, status } = out || {};
      await serviceClient.from("ams_subscriptions").insert({
        connection_id: connectionId,
        dataset_id: datasetId,
        destination_type: destinationType,
        destination_arn: destinationArn,
        region,
        subscription_id: subscriptionId || null,
        status: status || "active",
      });

      return new Response(JSON.stringify({ ok: true, response: out }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "archive") {
      const { subscriptionId } = body as any;
      if (!subscriptionId) return new Response(JSON.stringify({ error: "Missing subscriptionId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const res = await fetchWithRetry(`${apiEndpoint}/streams/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Amazon-Advertising-API-ClientId": clientId,
          "Amazon-Advertising-API-Scope": conn.profile_id,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ status: "archived" }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error("AMS archive error:", res.status, text);
        return new Response(JSON.stringify({ error: `AMS archive failed: ${res.status} ${text}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Mirror locally using service client
      await serviceClient
        .from("ams_subscriptions")
        .update({ status: "archived" })
        .eq("connection_id", connectionId)
        .eq("subscription_id", subscriptionId);

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list") {
      // Use service client to list subscriptions for the verified connection
      const { data, error } = await serviceClient
        .from("ams_subscriptions")
        .select("*")
        .eq("connection_id", connectionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ items: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("ams-subscribe error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unexpected error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
