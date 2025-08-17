
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AmsTrafficMessage {
  connection_id: string;
  profile_id: string;
  hour_start: string;
  campaign_id?: string;
  ad_group_id?: string;
  keyword_id?: string;
  target_id?: string;
  impressions?: number;
  clicks?: number;
  cost?: number;
  received_at?: string;
}

interface AmsConversionMessage {
  connection_id: string;
  profile_id: string;
  hour_start: string;
  campaign_id?: string;
  ad_group_id?: string;
  keyword_id?: string;
  target_id?: string;
  attributed_conversions?: number;
  attributed_sales?: number;
  received_at?: string;
}

interface IngestPayload {
  dataset: 'sp-traffic' | 'sp-conversion';
  messages: AmsTrafficMessage[] | AmsConversionMessage[];
  connection_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const INGEST_TOKEN = Deno.env.get("AMS_INGEST_TOKEN"); // Optional security token

  // Optional token validation for additional security
  if (INGEST_TOKEN) {
    const authHeader = req.headers.get("X-Ingest-Token");
    if (authHeader !== INGEST_TOKEN) {
      console.warn("AMS Ingest: Invalid or missing ingest token");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Service role client for database access (bypasses RLS)
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { dataset, messages, connection_id } = body as IngestPayload;

    if (!dataset || !messages || !connection_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: dataset, messages, connection_id" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages must be a non-empty array" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AMS Ingest: Processing ${messages.length} ${dataset} messages for connection ${connection_id}`);

    // Verify connection exists (security check)
    const { data: conn, error: connErr } = await serviceClient
      .from("amazon_connections")
      .select("id, user_id")
      .eq("id", connection_id)
      .single();

    if (connErr || !conn) {
      console.error("Connection verification failed:", connErr?.message);
      return new Response(
        JSON.stringify({ error: "Invalid connection_id" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare messages with received_at timestamp if not provided
    const processedMessages = messages.map(msg => ({
      ...msg,
      connection_id,
      received_at: msg.received_at || new Date().toISOString()
    }));

    // Database-first deduplication using PostgREST upsert
    const tableName = dataset === 'sp-traffic' ? 'ams_messages_sp_traffic' : 'ams_messages_sp_conversion';
    
    // Build conflict resolution based on unique constraint
    const conflictColumns = [
      'connection_id',
      'profile_id', 
      'hour_start',
      'campaign_id',
      'ad_group_id',
      'keyword_id',
      'target_id'
    ].join(',');

    console.log(`Upserting to ${tableName} with conflict resolution on: ${conflictColumns}`);

    // Use PostgREST upsert with merge-duplicates preference
    const { data, error } = await serviceClient
      .from(tableName)
      .upsert(processedMessages, { 
        onConflict: conflictColumns,
        ignoreDuplicates: false 
      });

    if (error) {
      console.error(`Database upsert error for ${dataset}:`, error);
      return new Response(
        JSON.stringify({ error: `Database error: ${error.message}` }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully processed ${messages.length} ${dataset} messages`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: messages.length,
        dataset,
        connection_id 
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("AMS ingest error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unexpected error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
