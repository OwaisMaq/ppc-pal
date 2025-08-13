import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TrafficRow = {
  campaign_id: string | null;
  ad_group_id: string | null;
  keyword_id: string | null;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
};

type ConvRow = {
  campaign_id: string | null;
  ad_group_id: string | null;
  keyword_id: string | null;
  orders: number | null;
  sales: number | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1) Authenticate the caller with anon client
    const auth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      }
    );
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

    // 2) Service role client for database operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { connectionId, action } = body as { connectionId?: string; action?: string };

    console.log("AMS Aggregate request:", { action, connectionId, userId: user.id });

    // Handle scheduled aggregation for all connections owned by user
    if (action === "aggregate_all") {
      console.log(`🔄 Starting aggregation for all connections owned by user ${user.id}`);
      
      // Get all active connections owned by this user
      const { data: connections, error: connError } = await supabase
        .from("amazon_connections")
        .select("id, profile_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (connError) throw connError;

      let processed = 0;
      for (const conn of connections || []) {
        try {
          await processConnection(conn.id, supabase);
          processed++;
          console.log(`✅ Processed connection ${conn.profile_id} (${processed}/${connections?.length})`);
        } catch (error) {
          console.error(`❌ Failed to process connection ${conn.profile_id}:`, error);
        }
      }

      return new Response(JSON.stringify({ 
        ok: true, 
        message: `Processed ${processed}/${connections?.length || 0} connections` 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Handle single connection aggregation with ownership verification
    if (!connectionId) {
      return new Response(JSON.stringify({ error: "Missing connectionId" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 3) Verify ownership before processing specific connection
    const { data: conn, error: connErr } = await supabase
      .from("amazon_connections")
      .select("id, user_id")
      .eq("id", connectionId)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Connection not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    if (conn.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    await processConnection(connectionId, supabase);

    return new Response(JSON.stringify({ ok: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

    // Connection processing function
    async function processConnection(connectionId: string, supabase: any) {
      const now = new Date();
      const start7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const start14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

      // Helper to aggregate data for a time window
      async function aggregate(windowStartISO: string) {
        const { data: tRows, error: tErr } = await supabase
          .from("ams_messages_sp_traffic")
          .select("campaign_id, ad_group_id, keyword_id, impressions, clicks, spend")
          .eq("connection_id", connectionId)
          .gte("hour_start", windowStartISO);
        if (tErr) throw tErr;

        const { data: cRows, error: cErr } = await supabase
          .from("ams_messages_sp_conversion")
          .select("campaign_id, ad_group_id, keyword_id, orders, sales")
          .eq("connection_id", connectionId)
          .gte("hour_start", windowStartISO);
        if (cErr) throw cErr;

        // Aggregate traffic data by entity
        const trafficByKey = new Map<string, { imp: number; clk: number; sp: number }>();
        (tRows || []).forEach((r: TrafficRow) => {
          const k = `${r.campaign_id || ''}|${r.ad_group_id || ''}|${r.keyword_id || ''}`;
          const acc = trafficByKey.get(k) || { imp: 0, clk: 0, sp: 0 };
          acc.imp += r.impressions || 0;
          acc.clk += r.clicks || 0;
          acc.sp += Number(r.spend || 0);
          trafficByKey.set(k, acc);
        });

        // Aggregate conversion data by entity
        const convByKey = new Map<string, { ord: number; sal: number }>();
        (cRows || []).forEach((r: ConvRow) => {
          const k = `${r.campaign_id || ''}|${r.ad_group_id || ''}|${r.keyword_id || ''}`;
          const acc = convByKey.get(k) || { ord: 0, sal: 0 };
          acc.ord += r.orders || 0;
          acc.sal += Number(r.sales || 0);
          convByKey.set(k, acc);
        });

        // Build aggregation maps by entity type
        const campAgg = new Map<string, { imp: number; clk: number; sp: number; ord: number; sal: number }>();
        const agAgg = new Map<string, { imp: number; clk: number; sp: number; ord: number; sal: number }>();
        const kwAgg = new Map<string, { imp: number; clk: number; sp: number; ord: number; sal: number }>();

        const keys = new Set<string>([...trafficByKey.keys(), ...convByKey.keys()]);
        keys.forEach((k) => {
          const [cid, agid, kid] = k.split("|");
          const t = trafficByKey.get(k) || { imp: 0, clk: 0, sp: 0 };
          const c = convByKey.get(k) || { ord: 0, sal: 0 };
          
          // Campaign level aggregation
          if (cid) {
            const cAgg = campAgg.get(cid) || { imp: 0, clk: 0, sp: 0, ord: 0, sal: 0 };
            cAgg.imp += t.imp; cAgg.clk += t.clk; cAgg.sp += t.sp; cAgg.ord += c.ord; cAgg.sal += c.sal;
            campAgg.set(cid, cAgg);
          }
          
          // Ad group level aggregation
          if (agid) {
            const aAgg = agAgg.get(agid) || { imp: 0, clk: 0, sp: 0, ord: 0, sal: 0 };
            aAgg.imp += t.imp; aAgg.clk += t.clk; aAgg.sp += t.sp; aAgg.ord += c.ord; aAgg.sal += c.sal;
            agAgg.set(agid, aAgg);
          }
          
          // Keyword level aggregation
          if (kid) {
            const kAgg = kwAgg.get(kid) || { imp: 0, clk: 0, sp: 0, ord: 0, sal: 0 };
            kAgg.imp += t.imp; kAgg.clk += t.clk; kAgg.sp += t.sp; kAgg.ord += c.ord; kAgg.sal += c.sal;
            kwAgg.set(kid, kAgg);
          }
        });

        return { campAgg, agAgg, kwAgg };
      }

      // Aggregate data for 7-day and 14-day windows
      const seven = await aggregate(start7);
      const fourteen = await aggregate(start14);

      // Fetch entity ID mappings
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, amazon_campaign_id")
        .eq("connection_id", connectionId);
      const { data: adgroups } = await supabase
        .from("ad_groups")
        .select("id, amazon_adgroup_id");
      const { data: keywords } = await supabase
        .from("keywords")
        .select("id, amazon_keyword_id");

      const campIdByAmazon = new Map((campaigns || []).map((c: any) => [c.amazon_campaign_id, c.id]));
      const agIdByAmazon = new Map((adgroups || []).map((a: any) => [a.amazon_adgroup_id, a.id]));
      const kwIdByAmazon = new Map((keywords || []).map((k: any) => [k.amazon_keyword_id, k.id]));

      // Update campaigns with aggregated data
      let campaignsUpdated = 0;
      for (const [amazonId, a7] of seven.campAgg.entries()) {
        const id = campIdByAmazon.get(amazonId);
        if (!id) continue;
        
        const a14 = fourteen.campAgg.get(amazonId) || { imp: 0, clk: 0, sp: 0, ord: 0, sal: 0 };
        
        // Calculate metrics
        const clicks7 = a7.clk || 0, impressions7 = a7.imp || 0, spend7 = a7.sp || 0, sales7 = a7.sal || 0, orders7 = a7.ord || 0;
        const clicks14 = a14.clk || 0, impressions14 = a14.imp || 0, spend14 = a14.sp || 0, sales14 = a14.sal || 0, orders14 = a14.ord || 0;
        
        const ctr7 = impressions7 > 0 ? (clicks7 / impressions7) * 100 : 0;
        const cpc7 = clicks7 > 0 ? spend7 / clicks7 : 0;
        const cr7 = clicks7 > 0 ? (orders7 / clicks7) * 100 : 0;
        const acos7 = sales7 > 0 ? (spend7 / sales7) * 100 : 0;
        const roas7 = spend7 > 0 ? sales7 / spend7 : 0;
        
        const ctr14 = impressions14 > 0 ? (clicks14 / impressions14) * 100 : 0;
        const cpc14 = clicks14 > 0 ? spend14 / clicks14 : 0;
        const cr14 = clicks14 > 0 ? (orders14 / clicks14) * 100 : 0;
        const acos14 = sales14 > 0 ? (spend14 / sales14) * 100 : 0;
        const roas14 = spend14 > 0 ? sales14 / spend14 : 0;

        await supabase
          .from("campaigns")
          .update({
            clicks_7d: clicks7, impressions_7d: impressions7, spend_7d: spend7, sales_7d: sales7, orders_7d: orders7,
            ctr_7d: ctr7, cpc_7d: cpc7, conversion_rate_7d: cr7, acos_7d: acos7, roas_7d: roas7,
            clicks_14d: clicks14, impressions_14d: impressions14, spend_14d: spend14, sales_14d: sales14, orders_14d: orders14,
            ctr_14d: ctr14, cpc_14d: cpc14, conversion_rate_14d: cr14, acos_14d: acos14, roas_14d: roas14,
            last_updated: new Date().toISOString(),
          })
          .eq("id", id);
          
        campaignsUpdated++;
      }

      // Update ad groups with aggregated data
      let adGroupsUpdated = 0;
      for (const [amazonId, a7] of seven.agAgg.entries()) {
        const id = agIdByAmazon.get(amazonId);
        if (!id) continue;
        
        const a14 = fourteen.agAgg.get(amazonId) || { imp: 0, clk: 0, sp: 0, ord: 0, sal: 0 };
        
        const clicks7 = a7.clk || 0, impressions7 = a7.imp || 0, spend7 = a7.sp || 0, sales7 = a7.sal || 0, orders7 = a7.ord || 0;
        const clicks14 = a14.clk || 0, impressions14 = a14.imp || 0, spend14 = a14.sp || 0, sales14 = a14.sal || 0, orders14 = a14.ord || 0;
        
        const ctr7 = impressions7 > 0 ? (clicks7 / impressions7) * 100 : 0;
        const cpc7 = clicks7 > 0 ? spend7 / clicks7 : 0;
        const cr7 = clicks7 > 0 ? (orders7 / clicks7) * 100 : 0;
        const acos7 = sales7 > 0 ? (spend7 / sales7) * 100 : 0;
        const roas7 = spend7 > 0 ? sales7 / spend7 : 0;
        
        const ctr14 = impressions14 > 0 ? (clicks14 / impressions14) * 100 : 0;
        const cpc14 = clicks14 > 0 ? spend14 / clicks14 : 0;
        const cr14 = clicks14 > 0 ? (orders14 / clicks14) * 100 : 0;
        const acos14 = sales14 > 0 ? (spend14 / sales14) * 100 : 0;
        const roas14 = spend14 > 0 ? sales14 / spend14 : 0;

        await supabase
          .from("ad_groups")
          .update({
            clicks_7d: clicks7, impressions_7d: impressions7, spend_7d: spend7, sales_7d: sales7, orders_7d: orders7,
            ctr_7d: ctr7, cpc_7d: cpc7, conversion_rate_7d: cr7, acos_7d: acos7, roas_7d: roas7,
            clicks_14d: clicks14, impressions_14d: impressions14, spend_14d: spend14, sales_14d: sales14, orders_14d: orders14,
            ctr_14d: ctr14, cpc_14d: cpc14, conversion_rate_14d: cr14, acos_14d: acos14, roas_14d: roas14,
            last_updated: new Date().toISOString(),
          })
          .eq("id", id);
          
        adGroupsUpdated++;
      }

      // Update keywords with aggregated data
      let keywordsUpdated = 0;
      for (const [amazonId, a7] of seven.kwAgg.entries()) {
        const id = kwIdByAmazon.get(amazonId);
        if (!id) continue;
        
        const a14 = fourteen.kwAgg.get(amazonId) || { imp: 0, clk: 0, sp: 0, ord: 0, sal: 0 };
        
        const clicks7 = a7.clk || 0, impressions7 = a7.imp || 0, spend7 = a7.sp || 0, sales7 = a7.sal || 0, orders7 = a7.ord || 0;
        const clicks14 = a14.clk || 0, impressions14 = a14.imp || 0, spend14 = a14.sp || 0, sales14 = a14.sal || 0, orders14 = a14.ord || 0;
        
        const ctr7 = impressions7 > 0 ? (clicks7 / impressions7) * 100 : 0;
        const cpc7 = clicks7 > 0 ? spend7 / clicks7 : 0;
        const cr7 = clicks7 > 0 ? (orders7 / clicks7) * 100 : 0;
        const acos7 = sales7 > 0 ? (spend7 / sales7) * 100 : 0;
        const roas7 = spend7 > 0 ? sales7 / spend7 : 0;
        
        const ctr14 = impressions14 > 0 ? (clicks14 / impressions14) * 100 : 0;
        const cpc14 = clicks14 > 0 ? spend14 / clicks14 : 0;
        const cr14 = clicks14 > 0 ? (orders14 / clicks14) * 100 : 0;
        const acos14 = sales14 > 0 ? (spend14 / sales14) * 100 : 0;
        const roas14 = spend14 > 0 ? sales14 / spend14 : 0;

        await supabase
          .from("keywords")
          .update({
            clicks_7d: clicks7, impressions_7d: impressions7, spend_7d: spend7, sales_7d: sales7, orders_7d: orders7,
            ctr_7d: ctr7, cpc_7d: cpc7, conversion_rate_7d: cr7, acos_7d: acos7, roas_7d: roas7,
            clicks_14d: clicks14, impressions_14d: impressions14, spend_14d: spend14, sales_14d: sales14, orders_14d: orders14,
            ctr_14d: ctr14, cpc_14d: cpc14, conversion_rate_14d: cr14, acos_14d: acos14, roas_14d: roas14,
            last_updated: new Date().toISOString(),
          })
          .eq("id", id);
          
        keywordsUpdated++;
      }

      console.log(`✅ Updated ${campaignsUpdated} campaigns, ${adGroupsUpdated} ad groups, ${keywordsUpdated} keywords for connection ${connectionId}`);
    }

  } catch (e: any) {
    console.error("ams-aggregate error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unexpected error" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});