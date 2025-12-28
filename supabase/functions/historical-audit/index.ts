import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignData {
  id: string;
  name: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
  orders: number;
  acos: number;
  roas: number;
  ctr: number;
  cvr: number;
}

interface SearchTermData {
  searchTerm: string;
  keywordText: string;
  matchType: string;
  campaignId: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
  orders: number;
  acos: number;
  roas: number;
}

interface TargetData {
  targetId: string;
  targetType: string;
  expression: string;
  campaignId: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
  orders: number;
  acos: number;
  roas: number;
}

interface KeywordData {
  keywordId: string;
  keywordText: string;
  matchType: string;
  campaignId: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
  orders: number;
  acos: number;
  roas: number;
}

interface MonthlyMetrics {
  month: string;
  monthLabel: string;
  totalSpend: number;
  totalSales: number;
  totalClicks: number;
  totalImpressions: number;
  totalOrders: number;
  avgAcos: number;
  avgRoas: number;
  campaigns: Map<string, CampaignData>;
  searchTerms: SearchTermData[];
  targets: TargetData[];
  keywords: KeywordData[];
}

interface Insight {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  campaigns: string[];
  estimatedSavings: number;
  impact: string;
  level: "campaign" | "search_term" | "keyword" | "target";
  entities?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { profileId, forceRefresh } = await req.json();

    if (!profileId) {
      return new Response(JSON.stringify({ error: "profileId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting historical audit for profile ${profileId}, forceRefresh: ${forceRefresh}`);

    // Check for existing audits if not forcing refresh
    if (!forceRefresh) {
      const { data: existingAudits } = await supabaseClient
        .from("historical_audits")
        .select("*")
        .eq("profile_id", profileId)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("audit_month", { ascending: false });

      if (existingAudits && existingAudits.length > 0) {
        console.log(`Returning ${existingAudits.length} cached audits`);
        return new Response(JSON.stringify({ 
          audits: existingAudits,
          fromCache: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch campaign performance data
    console.log("Fetching campaign daily data...");
    const { data: dailyData, error: dataError } = await supabaseClient
      .from("v_campaign_daily")
      .select("*")
      .eq("profile_id", profileId)
      .order("date", { ascending: true });

    if (dataError) {
      console.error("Error fetching campaign data:", dataError);
      return new Response(JSON.stringify({ error: "Failed to fetch campaign data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch search term data
    console.log("Fetching search term data...");
    const { data: searchTermData, error: searchTermError } = await supabaseClient
      .from("fact_search_term_daily")
      .select("*")
      .eq("profile_id", profileId)
      .order("date", { ascending: true });

    if (searchTermError) {
      console.error("Error fetching search term data:", searchTermError);
    }

    // Fetch target data
    console.log("Fetching target data...");
    const { data: targetData, error: targetError } = await supabaseClient
      .from("fact_target_daily")
      .select("*")
      .eq("profile_id", profileId)
      .order("date", { ascending: true });

    if (targetError) {
      console.error("Error fetching target data:", targetError);
    }

    if (!dailyData || dailyData.length === 0) {
      return new Response(JSON.stringify({ 
        audits: [],
        message: "No campaign data available for audit"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group data by month
    const monthlyData = new Map<string, MonthlyMetrics>();

    // Process campaign data
    for (const row of dailyData) {
      const date = new Date(row.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          monthLabel,
          totalSpend: 0,
          totalSales: 0,
          totalClicks: 0,
          totalImpressions: 0,
          totalOrders: 0,
          avgAcos: 0,
          avgRoas: 0,
          campaigns: new Map(),
          searchTerms: [],
          targets: [],
          keywords: [],
        });
      }

      const monthMetrics = monthlyData.get(monthKey)!;
      const spend = Number(row.spend_gbp || row.spend || 0);
      const sales = Number(row.sales_gbp || row.sales || 0);
      const clicks = Number(row.clicks || 0);
      const impressions = Number(row.impressions || 0);
      const orders = Number(row.conv_7d || row.orders || 0);

      monthMetrics.totalSpend += spend;
      monthMetrics.totalSales += sales;
      monthMetrics.totalClicks += clicks;
      monthMetrics.totalImpressions += impressions;
      monthMetrics.totalOrders += orders;

      const campaignId = row.campaign_id;
      const campaignName = row.campaign_name || campaignId;

      if (!monthMetrics.campaigns.has(campaignId)) {
        monthMetrics.campaigns.set(campaignId, {
          id: campaignId,
          name: campaignName,
          spend: 0,
          sales: 0,
          clicks: 0,
          impressions: 0,
          orders: 0,
          acos: 0,
          roas: 0,
          ctr: 0,
          cvr: 0,
        });
      }

      const campaign = monthMetrics.campaigns.get(campaignId)!;
      campaign.spend += spend;
      campaign.sales += sales;
      campaign.clicks += clicks;
      campaign.impressions += impressions;
      campaign.orders += orders;
    }

    // Process search term data by month
    const searchTermsByMonth = new Map<string, Map<string, SearchTermData>>();
    if (searchTermData) {
      for (const row of searchTermData) {
        const date = new Date(row.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        
        if (!searchTermsByMonth.has(monthKey)) {
          searchTermsByMonth.set(monthKey, new Map());
        }
        
        const monthMap = searchTermsByMonth.get(monthKey)!;
        const termKey = `${row.search_term}|${row.keyword_text}|${row.campaign_id}`;
        
        if (!monthMap.has(termKey)) {
          monthMap.set(termKey, {
            searchTerm: row.search_term || "",
            keywordText: row.keyword_text || "",
            matchType: row.match_type || "",
            campaignId: row.campaign_id || "",
            spend: 0,
            sales: 0,
            clicks: 0,
            impressions: 0,
            orders: 0,
            acos: 0,
            roas: 0,
          });
        }
        
        const term = monthMap.get(termKey)!;
        term.spend += Number(row.cost_micros || 0) / 1000000;
        term.sales += Number(row.attributed_sales_7d_micros || 0) / 1000000;
        term.clicks += Number(row.clicks || 0);
        term.impressions += Number(row.impressions || 0);
        term.orders += Number(row.attributed_conversions_7d || 0);
      }
    }

    // Process target data by month
    const targetsByMonth = new Map<string, Map<string, TargetData>>();
    if (targetData) {
      for (const row of targetData) {
        const date = new Date(row.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        
        if (!targetsByMonth.has(monthKey)) {
          targetsByMonth.set(monthKey, new Map());
        }
        
        const monthMap = targetsByMonth.get(monthKey)!;
        const targetKey = `${row.target_id}|${row.campaign_id}`;
        
        if (!monthMap.has(targetKey)) {
          let expressionStr = "";
          try {
            const expr = row.expression;
            if (typeof expr === "object" && expr !== null) {
              expressionStr = expr.value || JSON.stringify(expr);
            } else {
              expressionStr = String(expr || "");
            }
          } catch {
            expressionStr = "";
          }
          
          monthMap.set(targetKey, {
            targetId: row.target_id || "",
            targetType: row.target_type || "",
            expression: expressionStr,
            campaignId: row.campaign_id || "",
            spend: 0,
            sales: 0,
            clicks: 0,
            impressions: 0,
            orders: 0,
            acos: 0,
            roas: 0,
          });
        }
        
        const target = monthMap.get(targetKey)!;
        target.spend += Number(row.cost_micros || 0) / 1000000;
        target.sales += Number(row.attributed_sales_7d_micros || 0) / 1000000;
        target.clicks += Number(row.clicks || 0);
        target.impressions += Number(row.impressions || 0);
        target.orders += Number(row.attributed_conversions_7d || 0);
      }
    }

    // Calculate metrics and merge granular data
    for (const [monthKey, metrics] of monthlyData) {
      // Campaign metrics
      for (const campaign of metrics.campaigns.values()) {
        campaign.acos = campaign.sales > 0 ? (campaign.spend / campaign.sales) * 100 : Infinity;
        campaign.roas = campaign.spend > 0 ? campaign.sales / campaign.spend : 0;
        campaign.ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
        campaign.cvr = campaign.clicks > 0 ? (campaign.orders / campaign.clicks) * 100 : 0;
      }

      // Month-level metrics
      metrics.avgAcos = metrics.totalSales > 0 
        ? (metrics.totalSpend / metrics.totalSales) * 100 
        : 0;
      metrics.avgRoas = metrics.totalSpend > 0 
        ? metrics.totalSales / metrics.totalSpend 
        : 0;

      // Search terms
      const searchTermMap = searchTermsByMonth.get(monthKey);
      if (searchTermMap) {
        for (const term of searchTermMap.values()) {
          term.acos = term.sales > 0 ? (term.spend / term.sales) * 100 : (term.spend > 0 ? Infinity : 0);
          term.roas = term.spend > 0 ? term.sales / term.spend : 0;
          metrics.searchTerms.push(term);
        }
        // Sort by spend descending
        metrics.searchTerms.sort((a, b) => b.spend - a.spend);
      }

      // Targets
      const targetMap = targetsByMonth.get(monthKey);
      if (targetMap) {
        for (const target of targetMap.values()) {
          target.acos = target.sales > 0 ? (target.spend / target.sales) * 100 : (target.spend > 0 ? Infinity : 0);
          target.roas = target.spend > 0 ? target.sales / target.spend : 0;
          metrics.targets.push(target);
        }
        // Sort by spend descending
        metrics.targets.sort((a, b) => b.spend - a.spend);
      }
    }

    // Generate insights for each month
    const audits: any[] = [];

    for (const [monthKey, metrics] of monthlyData) {
      const insights: Insight[] = [];
      let totalEstimatedSavings = 0;

      const campaignsArray = Array.from(metrics.campaigns.values());

      // === CAMPAIGN-LEVEL INSIGHTS ===
      
      // 1. Waste Detection: High spend with no conversions
      const wastedCampaigns = campaignsArray.filter(c => c.spend > 10 && c.orders === 0);
      if (wastedCampaigns.length > 0) {
        const wastedSpend = wastedCampaigns.reduce((sum, c) => sum + c.spend, 0);
        insights.push({
          type: "waste_detection",
          severity: "critical",
          title: "Wasted Campaign Spend",
          description: `${wastedCampaigns.length} campaign(s) spent £${wastedSpend.toFixed(2)} with zero conversions.`,
          campaigns: wastedCampaigns.map(c => c.name),
          estimatedSavings: wastedSpend * 0.8,
          impact: "high",
          level: "campaign",
        });
        totalEstimatedSavings += wastedSpend * 0.8;
      }

      // 2. High ACOS campaigns
      const highAcosCampaigns = campaignsArray.filter(c => c.acos > 50 && c.spend > 20 && c.orders > 0);
      if (highAcosCampaigns.length > 0) {
        const potentialSavings = highAcosCampaigns.reduce((sum, c) => {
          const targetAcos = 20;
          const excessSpend = c.spend - (c.sales * (targetAcos / 100));
          return sum + Math.max(0, excessSpend);
        }, 0);
        insights.push({
          type: "high_acos",
          severity: "warning",
          title: "High ACOS Campaigns",
          description: `${highAcosCampaigns.length} campaign(s) have ACOS above 50%.`,
          campaigns: highAcosCampaigns.map(c => `${c.name} (${c.acos.toFixed(1)}%)`),
          estimatedSavings: potentialSavings * 0.5,
          impact: "medium",
          level: "campaign",
        });
        totalEstimatedSavings += potentialSavings * 0.5;
      }

      // 3. High Performers
      const highPerformers = campaignsArray.filter(c => c.roas > 3 && c.spend > 10);
      if (highPerformers.length > 0) {
        insights.push({
          type: "high_performer",
          severity: "info",
          title: "Scale Opportunity",
          description: `${highPerformers.length} campaign(s) achieved ROAS above 3x. Consider increasing budget.`,
          campaigns: highPerformers.map(c => `${c.name} (${c.roas.toFixed(1)}x)`),
          estimatedSavings: 0,
          impact: "opportunity",
          level: "campaign",
        });
      }

      // === SEARCH TERM-LEVEL INSIGHTS ===
      
      // 4. Wasted search terms (spend with no conversions)
      const wastedSearchTerms = metrics.searchTerms.filter(t => t.spend > 5 && t.orders === 0);
      if (wastedSearchTerms.length > 0) {
        const wastedSpend = wastedSearchTerms.reduce((sum, t) => sum + t.spend, 0);
        const topWasters = wastedSearchTerms.slice(0, 10);
        insights.push({
          type: "wasted_search_terms",
          severity: "critical",
          title: "Wasted Search Term Spend",
          description: `${wastedSearchTerms.length} search term(s) spent £${wastedSpend.toFixed(2)} with zero conversions. Add as negative keywords.`,
          campaigns: [],
          entities: topWasters.map(t => `"${t.searchTerm}" (£${t.spend.toFixed(2)})`),
          estimatedSavings: wastedSpend * 0.9,
          impact: "high",
          level: "search_term",
        });
        totalEstimatedSavings += wastedSpend * 0.9;
      }

      // 5. High ACOS search terms
      const highAcosSearchTerms = metrics.searchTerms.filter(t => 
        t.acos > 100 && t.spend > 10 && t.orders > 0
      );
      if (highAcosSearchTerms.length > 0) {
        const topHighAcos = highAcosSearchTerms.slice(0, 10);
        const excessSpend = highAcosSearchTerms.reduce((sum, t) => {
          const targetSpend = t.sales * 0.30; // 30% target ACOS
          return sum + Math.max(0, t.spend - targetSpend);
        }, 0);
        insights.push({
          type: "high_acos_search_terms",
          severity: "warning",
          title: "High ACOS Search Terms",
          description: `${highAcosSearchTerms.length} search term(s) have ACOS above 100%. Consider negative matching or bid reduction.`,
          campaigns: [],
          entities: topHighAcos.map(t => `"${t.searchTerm}" (${t.acos.toFixed(0)}% ACOS)`),
          estimatedSavings: excessSpend * 0.5,
          impact: "medium",
          level: "search_term",
        });
        totalEstimatedSavings += excessSpend * 0.5;
      }

      // 6. Top performing search terms
      const topSearchTerms = metrics.searchTerms.filter(t => t.roas > 5 && t.spend > 5);
      if (topSearchTerms.length > 0) {
        const topPerformers = topSearchTerms.slice(0, 10);
        insights.push({
          type: "top_search_terms",
          severity: "info",
          title: "Top Performing Search Terms",
          description: `${topSearchTerms.length} search term(s) achieved ROAS above 5x. Consider exact match campaigns.`,
          campaigns: [],
          entities: topPerformers.map(t => `"${t.searchTerm}" (${t.roas.toFixed(1)}x ROAS)`),
          estimatedSavings: 0,
          impact: "opportunity",
          level: "search_term",
        });
      }

      // === TARGET-LEVEL INSIGHTS ===
      
      // 7. Wasted targets
      const wastedTargets = metrics.targets.filter(t => t.spend > 10 && t.orders === 0);
      if (wastedTargets.length > 0) {
        const wastedSpend = wastedTargets.reduce((sum, t) => sum + t.spend, 0);
        const topWasters = wastedTargets.slice(0, 10);
        insights.push({
          type: "wasted_targets",
          severity: "critical",
          title: "Wasted Target Spend",
          description: `${wastedTargets.length} target(s) spent £${wastedSpend.toFixed(2)} with zero conversions. Consider pausing or negative targeting.`,
          campaigns: [],
          entities: topWasters.map(t => `${t.expression || t.targetId} (£${t.spend.toFixed(2)})`),
          estimatedSavings: wastedSpend * 0.85,
          impact: "high",
          level: "target",
        });
        totalEstimatedSavings += wastedSpend * 0.85;
      }

      // 8. High ACOS targets
      const highAcosTargets = metrics.targets.filter(t => t.acos > 80 && t.spend > 15 && t.orders > 0);
      if (highAcosTargets.length > 0) {
        const topHighAcos = highAcosTargets.slice(0, 10);
        const excessSpend = highAcosTargets.reduce((sum, t) => {
          const targetSpend = t.sales * 0.30;
          return sum + Math.max(0, t.spend - targetSpend);
        }, 0);
        insights.push({
          type: "high_acos_targets",
          severity: "warning",
          title: "High ACOS Product Targets",
          description: `${highAcosTargets.length} target(s) have ACOS above 80%. Review bid strategy.`,
          campaigns: [],
          entities: topHighAcos.map(t => `${t.expression || t.targetId} (${t.acos.toFixed(0)}%)`),
          estimatedSavings: excessSpend * 0.4,
          impact: "medium",
          level: "target",
        });
        totalEstimatedSavings += excessSpend * 0.4;
      }

      // 9. Top performing targets
      const topTargets = metrics.targets.filter(t => t.roas > 4 && t.spend > 10);
      if (topTargets.length > 0) {
        const topPerformers = topTargets.slice(0, 10);
        insights.push({
          type: "top_targets",
          severity: "info",
          title: "Top Performing Targets",
          description: `${topTargets.length} target(s) achieved ROAS above 4x. Consider bid increases.`,
          campaigns: [],
          entities: topPerformers.map(t => `${t.expression || t.targetId} (${t.roas.toFixed(1)}x)`),
          estimatedSavings: 0,
          impact: "opportunity",
          level: "target",
        });
      }

      // Generate AI summary if API key available
      let aiSummary = "";
      if (lovableApiKey && insights.length > 0) {
        try {
          const criticalInsights = insights.filter(i => i.severity === "critical");
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: "You are a PPC optimization expert. Generate a brief 2-3 sentence executive summary focusing on the most impactful findings. Mention specific savings amounts and priority actions. Be direct and actionable."
                },
                {
                  role: "user",
                  content: `Month: ${metrics.monthLabel}
Total Spend: £${metrics.totalSpend.toFixed(2)}
Total Sales: £${metrics.totalSales.toFixed(2)}
ACOS: ${metrics.avgAcos.toFixed(1)}%
ROAS: ${metrics.avgRoas.toFixed(2)}x
Campaigns: ${metrics.campaigns.size}
Search Terms Analyzed: ${metrics.searchTerms.length}
Targets Analyzed: ${metrics.targets.length}
Estimated Savings Potential: £${totalEstimatedSavings.toFixed(2)}

Critical Issues (${criticalInsights.length}):
${criticalInsights.map(i => `- ${i.title}: ${i.description} (£${i.estimatedSavings.toFixed(2)} savings)`).join("\n")}

All Findings:
${insights.map(i => `- [${i.level}] ${i.title}`).join("\n")}`
                }
              ],
              max_tokens: 250,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiSummary = aiData.choices?.[0]?.message?.content || "";
          }
        } catch (aiError) {
          console.error("AI summary generation failed:", aiError);
        }
      }

      // Prepare breakdown data
      const searchTermBreakdown = {
        topWasters: metrics.searchTerms.filter(t => t.orders === 0 && t.spend > 1).slice(0, 20),
        topPerformers: metrics.searchTerms.filter(t => t.roas > 2).slice(0, 20),
        highVolume: metrics.searchTerms.slice(0, 20),
      };

      const targetBreakdown = {
        topWasters: metrics.targets.filter(t => t.orders === 0 && t.spend > 1).slice(0, 20),
        topPerformers: metrics.targets.filter(t => t.roas > 2).slice(0, 20),
        highVolume: metrics.targets.slice(0, 20),
      };

      // Create the audit
      const [year, month] = monthKey.split("-");
      const auditMonth = `${year}-${month}-01`;

      const auditData = {
        user_id: user.id,
        profile_id: profileId,
        audit_month: auditMonth,
        insights: insights,
        summary: {
          monthLabel: metrics.monthLabel,
          totalSpend: metrics.totalSpend,
          totalSales: metrics.totalSales,
          totalOrders: metrics.totalOrders,
          avgAcos: metrics.avgAcos,
          avgRoas: metrics.avgRoas,
          campaignCount: metrics.campaigns.size,
          searchTermCount: metrics.searchTerms.length,
          targetCount: metrics.targets.length,
          aiSummary,
        },
        breakdown: {
          searchTerms: searchTermBreakdown,
          targets: targetBreakdown,
        },
        estimated_savings: totalEstimatedSavings,
        status: "completed",
      };

      const { data: upsertedAudit, error: upsertError } = await supabaseClient
        .from("historical_audits")
        .upsert(auditData, {
          onConflict: "profile_id,audit_month",
        })
        .select()
        .single();

      if (upsertError) {
        console.error("Error upserting audit:", upsertError);
      } else {
        audits.push(upsertedAudit);
      }
    }

    // Sort audits by month descending
    audits.sort((a, b) => new Date(b.audit_month).getTime() - new Date(a.audit_month).getTime());

    console.log(`Historical audit completed: ${audits.length} months, ${dailyData.length} campaign days, ${searchTermData?.length || 0} search term days, ${targetData?.length || 0} target days`);

    return new Response(JSON.stringify({ 
      audits,
      totalMonths: audits.length,
      fromCache: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Historical audit error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
