import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignDailyData {
  campaign_id: string;
  campaign_name: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
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
  campaigns: Map<string, {
    name: string;
    spend: number;
    sales: number;
    clicks: number;
    impressions: number;
    orders: number;
  }>;
}

interface Insight {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  campaigns: string[];
  estimatedSavings: number;
  impact: string;
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
        return new Response(JSON.stringify({ 
          audits: existingAudits,
          fromCache: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch campaign performance data from v_campaign_daily view
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
          name: campaignName,
          spend: 0,
          sales: 0,
          clicks: 0,
          impressions: 0,
          orders: 0,
        });
      }

      const campaign = monthMetrics.campaigns.get(campaignId)!;
      campaign.spend += spend;
      campaign.sales += sales;
      campaign.clicks += clicks;
      campaign.impressions += impressions;
      campaign.orders += orders;
    }

    // Calculate ACOS and ROAS for each month
    for (const [, metrics] of monthlyData) {
      metrics.avgAcos = metrics.totalSales > 0 
        ? (metrics.totalSpend / metrics.totalSales) * 100 
        : 0;
      metrics.avgRoas = metrics.totalSpend > 0 
        ? metrics.totalSales / metrics.totalSpend 
        : 0;
    }

    // Generate insights for each month
    const audits: any[] = [];

    for (const [monthKey, metrics] of monthlyData) {
      const insights: Insight[] = [];
      let totalEstimatedSavings = 0;

      const campaignsArray = Array.from(metrics.campaigns.entries()).map(([id, data]) => ({
        id,
        ...data,
        acos: data.sales > 0 ? (data.spend / data.sales) * 100 : Infinity,
        roas: data.spend > 0 ? data.sales / data.spend : 0,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cvr: data.clicks > 0 ? (data.orders / data.clicks) * 100 : 0,
      }));

      // 1. Waste Detection: High spend with no/low conversions
      const wastedCampaigns = campaignsArray.filter(c => 
        c.spend > 10 && c.orders === 0
      );
      if (wastedCampaigns.length > 0) {
        const wastedSpend = wastedCampaigns.reduce((sum, c) => sum + c.spend, 0);
        insights.push({
          type: "waste_detection",
          severity: "critical",
          title: "Wasted Ad Spend Detected",
          description: `${wastedCampaigns.length} campaign(s) spent £${wastedSpend.toFixed(2)} with zero conversions. Adding negative keywords or pausing underperforming targets could have saved this spend.`,
          campaigns: wastedCampaigns.map(c => c.name),
          estimatedSavings: wastedSpend * 0.8, // Assume 80% could be saved
          impact: "high",
        });
        totalEstimatedSavings += wastedSpend * 0.8;
      }

      // 2. High ACOS campaigns
      const highAcosCampaigns = campaignsArray.filter(c => 
        c.acos > 50 && c.spend > 20 && c.orders > 0
      );
      if (highAcosCampaigns.length > 0) {
        const potentialSavings = highAcosCampaigns.reduce((sum, c) => {
          const targetAcos = 30;
          const excessSpend = c.spend - (c.sales * (targetAcos / 100));
          return sum + Math.max(0, excessSpend);
        }, 0);
        insights.push({
          type: "high_acos",
          severity: "warning",
          title: "High ACOS Campaigns Need Optimization",
          description: `${highAcosCampaigns.length} campaign(s) have ACOS above 50%. Bid adjustments and target refinement could improve efficiency.`,
          campaigns: highAcosCampaigns.map(c => `${c.name} (${c.acos.toFixed(1)}% ACOS)`),
          estimatedSavings: potentialSavings * 0.5,
          impact: "medium",
        });
        totalEstimatedSavings += potentialSavings * 0.5;
      }

      // 3. High Performers with limited budget
      const highPerformers = campaignsArray.filter(c => 
        c.roas > 3 && c.spend > 10
      );
      if (highPerformers.length > 0) {
        const potentialUpside = highPerformers.reduce((sum, c) => {
          // Estimate 30% budget increase could yield proportional sales increase
          return sum + (c.sales * 0.3);
        }, 0);
        insights.push({
          type: "high_performer",
          severity: "info",
          title: "High-Performing Campaigns Identified",
          description: `${highPerformers.length} campaign(s) achieved ROAS above 3x. Increasing budget could have driven additional sales.`,
          campaigns: highPerformers.map(c => `${c.name} (${c.roas.toFixed(1)}x ROAS)`),
          estimatedSavings: 0,
          impact: "opportunity",
        });
      }

      // 4. Low CTR campaigns
      const lowCtrCampaigns = campaignsArray.filter(c => 
        c.ctr < 0.3 && c.impressions > 1000
      );
      if (lowCtrCampaigns.length > 0) {
        insights.push({
          type: "low_ctr",
          severity: "warning",
          title: "Low Click-Through Rate",
          description: `${lowCtrCampaigns.length} campaign(s) have CTR below 0.3%. Improving ad copy or targeting could boost engagement.`,
          campaigns: lowCtrCampaigns.map(c => `${c.name} (${c.ctr.toFixed(2)}% CTR)`),
          estimatedSavings: 0,
          impact: "medium",
        });
      }

      // 5. Low Conversion Rate campaigns
      const lowCvrCampaigns = campaignsArray.filter(c => 
        c.cvr < 5 && c.clicks > 50 && c.spend > 20
      );
      if (lowCvrCampaigns.length > 0) {
        const wastedClicks = lowCvrCampaigns.reduce((sum, c) => {
          const avgCpc = c.clicks > 0 ? c.spend / c.clicks : 0;
          return sum + (avgCpc * c.clicks * 0.3); // Assume 30% clicks are low-quality
        }, 0);
        insights.push({
          type: "low_cvr",
          severity: "warning",
          title: "Low Conversion Rate Detected",
          description: `${lowCvrCampaigns.length} campaign(s) have conversion rates below 5%. Reviewing product targeting or pricing could help.`,
          campaigns: lowCvrCampaigns.map(c => `${c.name} (${c.cvr.toFixed(1)}% CVR)`),
          estimatedSavings: wastedClicks * 0.4,
          impact: "medium",
        });
        totalEstimatedSavings += wastedClicks * 0.4;
      }

      // Generate AI summary if API key available
      let aiSummary = "";
      if (lovableApiKey && insights.length > 0) {
        try {
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
                  content: "You are a PPC optimization expert. Generate a brief 2-3 sentence executive summary of the monthly audit findings. Be specific about the potential savings and key actions. Keep it professional and actionable."
                },
                {
                  role: "user",
                  content: `Month: ${metrics.monthLabel}
Total Spend: £${metrics.totalSpend.toFixed(2)}
Total Sales: £${metrics.totalSales.toFixed(2)}
ACOS: ${metrics.avgAcos.toFixed(1)}%
ROAS: ${metrics.avgRoas.toFixed(2)}x
Estimated Savings Potential: £${totalEstimatedSavings.toFixed(2)}

Key Findings:
${insights.map(i => `- ${i.title}: ${i.description}`).join("\n")}`
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
          console.error("AI summary generation failed:", aiError);
        }
      }

      // Create the audit date (first day of the month)
      const [year, month] = monthKey.split("-");
      const auditMonth = `${year}-${month}-01`;

      // Upsert the audit
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
          aiSummary,
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

    console.log(`Historical audit completed for profile ${profileId}: ${audits.length} months analyzed`);

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
