import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MonthlyMetrics {
  totalSpend: number;
  totalSales: number;
  totalClicks: number;
  totalImpressions: number;
  totalOrders: number;
  avgAcos: number;
  avgRoas: number;
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

interface ScoreBreakdown {
  acosEfficiency: { score: number; value: number; weight: number };
  conversionRate: { score: number; value: number; weight: number };
  ctr: { score: number; value: number; weight: number };
  budgetUtilization: { score: number; value: number; weight: number };
  wasteRatio: { score: number; value: number; weight: number };
}

// Calculate monthly health score (0-100) and letter grade
function calculateMonthlyScore(metrics: MonthlyMetrics, wastedSpend: number): { score: number; grade: string; breakdown: ScoreBreakdown } {
  const weights = {
    acosEfficiency: 0.30,
    conversionRate: 0.25,
    ctr: 0.20,
    budgetUtilization: 0.15,
    wasteRatio: 0.10,
  };

  // ACOS Efficiency Score
  const acos = metrics.avgAcos;
  let acosScore: number;
  if (acos <= 20) acosScore = 100;
  else if (acos <= 30) acosScore = 85;
  else if (acos <= 50) acosScore = 70;
  else if (acos <= 75) acosScore = 50;
  else acosScore = Math.max(0, 40 - (acos - 75) * 0.5);

  // Conversion Rate Score
  const cvr = metrics.totalClicks > 0 ? (metrics.totalOrders / metrics.totalClicks) * 100 : 0;
  let cvrScore: number;
  if (cvr >= 15) cvrScore = 100;
  else if (cvr >= 10) cvrScore = 85;
  else if (cvr >= 5) cvrScore = 70;
  else if (cvr >= 2) cvrScore = 50;
  else cvrScore = Math.max(0, cvr * 25);

  // CTR Score
  const ctr = metrics.totalImpressions > 0 ? (metrics.totalClicks / metrics.totalImpressions) * 100 : 0;
  let ctrScore: number;
  if (ctr >= 0.5) ctrScore = 100;
  else if (ctr >= 0.35) ctrScore = 85;
  else if (ctr >= 0.2) ctrScore = 70;
  else if (ctr >= 0.1) ctrScore = 50;
  else ctrScore = Math.max(0, ctr * 500);

  // Budget Utilization Score (using ROAS as proxy)
  const roas = metrics.avgRoas;
  let budgetScore: number;
  if (roas >= 3) budgetScore = 100;
  else if (roas >= 2) budgetScore = 85;
  else if (roas >= 1) budgetScore = 70;
  else if (roas >= 0.5) budgetScore = 50;
  else budgetScore = Math.max(0, roas * 100);

  // Waste Ratio Score
  const wasteRatio = metrics.totalSpend > 0 ? (wastedSpend / metrics.totalSpend) * 100 : 0;
  let wasteScore: number;
  if (wasteRatio < 5) wasteScore = 100;
  else if (wasteRatio < 10) wasteScore = 85;
  else if (wasteRatio < 20) wasteScore = 70;
  else if (wasteRatio < 35) wasteScore = 50;
  else wasteScore = Math.max(0, 40 - (wasteRatio - 35) * 0.8);

  const totalScore = 
    acosScore * weights.acosEfficiency +
    cvrScore * weights.conversionRate +
    ctrScore * weights.ctr +
    budgetScore * weights.budgetUtilization +
    wasteScore * weights.wasteRatio;

  let grade: string;
  if (totalScore >= 90) grade = "A";
  else if (totalScore >= 75) grade = "B";
  else if (totalScore >= 60) grade = "C";
  else if (totalScore >= 40) grade = "D";
  else grade = "F";

  const breakdown: ScoreBreakdown = {
    acosEfficiency: { score: Math.round(acosScore), value: acos, weight: weights.acosEfficiency * 100 },
    conversionRate: { score: Math.round(cvrScore), value: cvr, weight: weights.conversionRate * 100 },
    ctr: { score: Math.round(ctrScore), value: ctr, weight: weights.ctr * 100 },
    budgetUtilization: { score: Math.round(budgetScore), value: roas, weight: weights.budgetUtilization * 100 },
    wasteRatio: { score: Math.round(wasteScore), value: wasteRatio, weight: weights.wasteRatio * 100 },
  };

  return { score: Math.round(totalScore), grade, breakdown };
}

// Get the previous month in YYYY-MM format
function getPreviousMonth(): { monthKey: string; monthLabel: string; auditMonth: string } {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = prevMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const auditMonth = `${monthKey}-01`;
  return { monthKey, monthLabel, auditMonth };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Historical audit scheduler started`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional trigger type
    let triggerType = "scheduled";
    try {
      const body = await req.json();
      triggerType = body.trigger || "scheduled";
    } catch {
      // No body or invalid JSON, use default
    }

    // Get previous month details
    const { monthKey, monthLabel, auditMonth } = getPreviousMonth();
    console.log(`[${requestId}] Processing audits for ${monthLabel} (${monthKey})`);

    // Create audit run record
    const { data: auditRun, error: runError } = await supabase
      .from("historical_audit_runs")
      .insert({
        audit_month: auditMonth,
        trigger_type: triggerType,
        status: "running",
      })
      .select()
      .single();

    if (runError) {
      console.error(`[${requestId}] Failed to create audit run:`, runError);
      throw new Error("Failed to create audit run record");
    }

    const runId = auditRun.id;
    console.log(`[${requestId}] Created audit run ${runId}`);

    // Fetch all active Amazon connections
    const { data: connections, error: connectionsError } = await supabase
      .from("amazon_connections")
      .select("id, user_id, profile_id, profile_name, status")
      .eq("status", "active");

    if (connectionsError) {
      throw new Error(`Failed to fetch connections: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log(`[${requestId}] No active connections found`);
      await supabase
        .from("historical_audit_runs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          profiles_processed: 0,
        })
        .eq("id", runId);

      return new Response(JSON.stringify({ success: true, processed: 0, requestId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] Found ${connections.length} active connections to process`);

    let profilesSucceeded = 0;
    let profilesFailed = 0;

    // Process each connection
    for (const connection of connections) {
      try {
        console.log(`[${requestId}] Processing profile ${connection.profile_id} (${connection.profile_name})`);

        // Calculate date range for the previous month
        const startDate = auditMonth;
        const endDate = new Date(new Date(auditMonth).getFullYear(), new Date(auditMonth).getMonth() + 1, 0)
          .toISOString().split("T")[0];

        // Fetch campaign data for the previous month only
        const { data: dailyData, error: dataError } = await supabase
          .from("v_campaign_daily")
          .select("*")
          .eq("profile_id", connection.profile_id)
          .gte("date", startDate)
          .lte("date", endDate);

        if (dataError) {
          console.error(`[${requestId}] Error fetching campaign data for ${connection.profile_id}:`, dataError);
          profilesFailed++;
          continue;
        }

        if (!dailyData || dailyData.length === 0) {
          console.log(`[${requestId}] No campaign data for ${connection.profile_id} in ${monthLabel}`);
          continue;
        }

        // Fetch search term data for the month
        const { data: searchTermData } = await supabase
          .from("fact_search_term_daily")
          .select("*")
          .eq("profile_id", connection.profile_id)
          .gte("date", startDate)
          .lte("date", endDate);

        // Fetch target data for the month
        const { data: targetData } = await supabase
          .from("fact_target_daily")
          .select("*")
          .eq("profile_id", connection.profile_id)
          .gte("date", startDate)
          .lte("date", endDate);

        // Aggregate metrics
        const metrics: MonthlyMetrics = {
          totalSpend: 0,
          totalSales: 0,
          totalClicks: 0,
          totalImpressions: 0,
          totalOrders: 0,
          avgAcos: 0,
          avgRoas: 0,
        };

        const campaignMap = new Map<string, { name: string; spend: number; sales: number; orders: number }>();

        for (const row of dailyData) {
          const spend = Number(row.spend_gbp || row.spend || 0);
          const sales = Number(row.sales_gbp || row.sales || 0);
          const clicks = Number(row.clicks || 0);
          const impressions = Number(row.impressions || 0);
          const orders = Number(row.conv_7d || row.orders || 0);

          metrics.totalSpend += spend;
          metrics.totalSales += sales;
          metrics.totalClicks += clicks;
          metrics.totalImpressions += impressions;
          metrics.totalOrders += orders;

          const campaignId = row.campaign_id;
          if (!campaignMap.has(campaignId)) {
            campaignMap.set(campaignId, { name: row.campaign_name || campaignId, spend: 0, sales: 0, orders: 0 });
          }
          const campaign = campaignMap.get(campaignId)!;
          campaign.spend += spend;
          campaign.sales += sales;
          campaign.orders += orders;
        }

        metrics.avgAcos = metrics.totalSales > 0 ? (metrics.totalSpend / metrics.totalSales) * 100 : 0;
        metrics.avgRoas = metrics.totalSpend > 0 ? metrics.totalSales / metrics.totalSpend : 0;

        // Generate insights
        const insights: Insight[] = [];
        let totalEstimatedSavings = 0;
        let totalWastedSpend = 0;

        const campaigns = Array.from(campaignMap.values());

        // Wasted campaigns
        const wastedCampaigns = campaigns.filter(c => c.spend > 10 && c.orders === 0);
        if (wastedCampaigns.length > 0) {
          const wastedSpend = wastedCampaigns.reduce((sum, c) => sum + c.spend, 0);
          totalWastedSpend += wastedSpend;
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

        // High ACOS campaigns
        const highAcosCampaigns = campaigns.filter(c => {
          const acos = c.sales > 0 ? (c.spend / c.sales) * 100 : Infinity;
          return acos > 50 && c.spend > 20 && c.orders > 0;
        });
        if (highAcosCampaigns.length > 0) {
          insights.push({
            type: "high_acos",
            severity: "warning",
            title: "High ACOS Campaigns",
            description: `${highAcosCampaigns.length} campaign(s) have ACOS above 50%.`,
            campaigns: highAcosCampaigns.map(c => c.name),
            estimatedSavings: highAcosCampaigns.reduce((sum, c) => sum + c.spend * 0.3, 0),
            impact: "medium",
            level: "campaign",
          });
        }

        // Search term wasted spend
        if (searchTermData && searchTermData.length > 0) {
          const termMap = new Map<string, { term: string; spend: number; orders: number }>();
          for (const row of searchTermData) {
            const termKey = row.search_term || "";
            if (!termMap.has(termKey)) {
              termMap.set(termKey, { term: termKey, spend: 0, orders: 0 });
            }
            const t = termMap.get(termKey)!;
            t.spend += Number(row.cost_micros || 0) / 1000000;
            t.orders += Number(row.attributed_conversions_7d || 0);
          }

          const wastedTerms = Array.from(termMap.values()).filter(t => t.spend > 5 && t.orders === 0);
          if (wastedTerms.length > 0) {
            const wastedSpend = wastedTerms.reduce((sum, t) => sum + t.spend, 0);
            totalWastedSpend += wastedSpend;
            insights.push({
              type: "wasted_search_terms",
              severity: "critical",
              title: "Wasted Search Term Spend",
              description: `${wastedTerms.length} search term(s) spent £${wastedSpend.toFixed(2)} with zero conversions.`,
              campaigns: [],
              entities: wastedTerms.slice(0, 10).map(t => `"${t.term}" (£${t.spend.toFixed(2)})`),
              estimatedSavings: wastedSpend * 0.9,
              impact: "high",
              level: "search_term",
            });
            totalEstimatedSavings += wastedSpend * 0.9;
          }
        }

        // Calculate score
        const { score, grade, breakdown } = calculateMonthlyScore(metrics, totalWastedSpend);

        // Get prior month score for trend
        const { data: priorAudit } = await supabase
          .from("historical_audits")
          .select("score")
          .eq("profile_id", connection.profile_id)
          .lt("audit_month", auditMonth)
          .order("audit_month", { ascending: false })
          .limit(1)
          .single();

        let trendVsPriorMonth = "new";
        if (priorAudit?.score !== undefined) {
          const scoreDiff = score - priorAudit.score;
          if (scoreDiff >= 5) trendVsPriorMonth = "up";
          else if (scoreDiff <= -5) trendVsPriorMonth = "down";
          else trendVsPriorMonth = "stable";
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
                    content: "You are a PPC optimization expert. Generate a brief 2-3 sentence executive summary focusing on the most impactful findings. Be direct and actionable."
                  },
                  {
                    role: "user",
                    content: `Month: ${monthLabel}\nHealth Score: ${score}/100 (Grade: ${grade})\nTotal Spend: £${metrics.totalSpend.toFixed(2)}\nTotal Sales: £${metrics.totalSales.toFixed(2)}\nACOS: ${metrics.avgAcos.toFixed(1)}%\nEstimated Savings: £${totalEstimatedSavings.toFixed(2)}\n\nCritical Issues:\n${criticalInsights.map(i => `- ${i.title}: ${i.description}`).join("\n")}`
                  }
                ],
                max_tokens: 200,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              aiSummary = aiData.choices?.[0]?.message?.content || "";
            }
          } catch (aiError) {
            console.error(`[${requestId}] AI summary generation failed:`, aiError);
          }
        }

        // Upsert audit record
        const auditData = {
          user_id: connection.user_id,
          profile_id: connection.profile_id,
          audit_month: auditMonth,
          insights,
          summary: {
            monthLabel,
            totalSpend: metrics.totalSpend,
            totalSales: metrics.totalSales,
            totalOrders: metrics.totalOrders,
            avgAcos: metrics.avgAcos,
            avgRoas: metrics.avgRoas,
            campaignCount: campaignMap.size,
            searchTermCount: searchTermData?.length || 0,
            targetCount: targetData?.length || 0,
            aiSummary,
          },
          breakdown: {
            searchTerms: { topWasters: [], topPerformers: [], highVolume: [] },
            targets: { topWasters: [], topPerformers: [], highVolume: [] },
          },
          estimated_savings: totalEstimatedSavings,
          score,
          grade,
          score_breakdown: breakdown,
          trend_vs_prior_month: trendVsPriorMonth,
          status: "completed",
        };

        const { error: upsertError } = await supabase
          .from("historical_audits")
          .upsert(auditData, { onConflict: "profile_id,audit_month" });

        if (upsertError) {
          console.error(`[${requestId}] Error upserting audit for ${connection.profile_id}:`, upsertError);
          profilesFailed++;
          continue;
        }

        // Queue notification for the user
        const notificationSubject = `${grade} Health Score for ${monthLabel}`;
        const notificationBody = `Your PPC health score for ${monthLabel} is ${score}/100 (Grade: ${grade}).\n\n` +
          `Key Metrics:\n` +
          `- Total Spend: £${metrics.totalSpend.toFixed(2)}\n` +
          `- Total Sales: £${metrics.totalSales.toFixed(2)}\n` +
          `- ACOS: ${metrics.avgAcos.toFixed(1)}%\n` +
          `- ROAS: ${metrics.avgRoas.toFixed(2)}x\n\n` +
          `${insights.filter(i => i.severity === "critical").length} critical issues identified with £${totalEstimatedSavings.toFixed(2)} potential savings.\n\n` +
          `View your full audit report in the Analytics section.`;

        // Check user notification preferences
        const { data: userPrefs } = await supabase
          .from("user_prefs")
          .select("slack_webhook, email, digest_frequency")
          .eq("user_id", connection.user_id)
          .single();

        if (userPrefs && (userPrefs.slack_webhook || userPrefs.email)) {
          const channels = [];
          if (userPrefs.slack_webhook) channels.push("slack");
          if (userPrefs.email) channels.push("email");

          for (const channel of channels) {
            await supabase
              .from("notifications_outbox")
              .insert({
                user_id: connection.user_id,
                channel,
                subject: notificationSubject,
                body: notificationBody,
                payload: {
                  type: "monthly_health_audit",
                  profile_id: connection.profile_id,
                  audit_month: auditMonth,
                  score,
                  grade,
                },
                status: "queued",
              });
          }
          console.log(`[${requestId}] Queued notifications for ${connection.profile_id}`);
        }

        profilesSucceeded++;
        console.log(`[${requestId}] Successfully processed ${connection.profile_id}: Score ${score} (${grade})`);

      } catch (profileError) {
        console.error(`[${requestId}] Error processing ${connection.profile_id}:`, profileError);
        profilesFailed++;
      }
    }

    // Update audit run with results
    await supabase
      .from("historical_audit_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        profiles_processed: connections.length,
        profiles_succeeded: profilesSucceeded,
        profiles_failed: profilesFailed,
      })
      .eq("id", runId);

    console.log(`[${requestId}] Audit scheduler completed: ${profilesSucceeded} succeeded, ${profilesFailed} failed`);

    return new Response(JSON.stringify({
      success: true,
      runId,
      month: monthLabel,
      processed: connections.length,
      succeeded: profilesSucceeded,
      failed: profilesFailed,
      requestId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[${requestId}] Audit scheduler error:`, error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      requestId,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
