import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AMZ_CLIENT_ID = Deno.env.get("AMAZON_CLIENT_ID")!;
const AMZ_CLIENT_SECRET = Deno.env.get("AMAZON_CLIENT_SECRET")!;

serve(async (req) => {
  try {
    // 1) Who is calling?
    const auth = createClient(SB_URL, SB_ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    // 2) Parse payload
    const { connectionId, datasetId, destinationArn, region } = await req.json();
    if (!connectionId || !datasetId || !destinationArn || !region) {
      return new Response("Bad request", { status: 400 });
    }

    // 3) Load connection with service role (bypass RLS) and enforce ownership
    const db = createClient(SB_URL, SB_SERVICE);
    const { data: conn, error: connErr } = await db
      .from("amazon_connections")
      .select("id,user_id,profile_id,refresh_token")
      .eq("id", connectionId)
      .single();
    if (connErr || !conn) return new Response("Connection not found", { status: 404 });
    if (conn.user_id !== user.id) return new Response("Forbidden", { status: 403 });

    // 4) Exchange refresh token → access token
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
    if (!tokRes.ok) return new Response(`token ${tokRes.status}: ${await tokRes.text()}`, { status: 502 });
    const { access_token } = await tokRes.json();

    // 5) Region → AMS base URL
    const base =
      region === "eu-west-1" ? "https://advertising-api-eu.amazon.com" :
      region === "us-east-1" ? "https://advertising-api.amazon.com" :
      region === "us-west-2" ? "https://advertising-api-fe.amazon.com" :
      null;
    if (!base) return new Response("Unsupported region", { status: 400 });

    // 6) Create subscription
    const res = await fetch(`${base}/streams/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Amazon-Advertising-API-ClientId": AMZ_CLIENT_ID,
        "Amazon-Advertising-API-Scope": String(conn.profile_id),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ datasetId, destinationArn, compression: "GZIP" }),
    });
    const text = await res.text();
    if (!res.ok) return new Response(`ams ${res.status}: ${text}`, { status: 502 });

    return new Response(text, { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(`error: ${e?.message ?? e}`, { status: 500 });
  }
});