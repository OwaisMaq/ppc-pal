import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignMetrics {
  campaign_id: string;
  campaign_name: string;
  spend_7d: number;
  spend_14d: number;
  spend_30d: number;
  sales_7d: number;
  sales_14d: number;
  sales_30d: number;
  clicks_7d: number;
  clicks_14d: number;
  clicks_30d: number;
  impressions_7d: number;
  impressions_14d: number;
  impressions_30d: number;
  conversions_7d: number;
  conversions_14d: number;
  conversions_30d: number;
}

interface StatisticalPrediction {
  campaign_id: string;
  campaign_name: string;
  prediction_type: 'bid_adjustment' | 'keyword_suggestion' | 'negative_keyword' | 'budget_change';
  action_numeric: number; // e.g., -0.15 for "decrease bid 15%"
  reason_code: string;
  metrics: {
    cpc_7d: number;
    cpc_14d: number;
    cpc_30d: number;
    ctr_7d: number;
    ctr_14d: number;
    ctr_30d: number;
    cvr_7d: number;
    cvr_14d: number;
    cvr_30d: number;
    acos_7d: number;
    acos_14d: number;
    acos_30d: number;
    roas_7d: number;
    roas_14d: number;
    roas_30d: number;
  };
  anomaly_scores: {
    cpc_zscore: number;
    ctr_zscore: number;
    acos_zscore: number;
  };
  confidence: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] ML Predictions started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Check if this is a scheduled run from the scheduler
    const schedulerUserId = req.headers.get('x-scheduler-user-id');
    const authHeader = req.headers.get('Authorization');
    
    let userId: string;

    if (schedulerUserId && authHeader?.includes(supabaseKey)) {
      // Scheduled run with service role auth - use the provided user ID
      console.log(`[${requestId}] Scheduled run for user: ${schedulerUserId}`);
      userId = schedulerUserId;
    } else {
      // Normal authenticated request
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader! } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = user.id;
    }

    // Use service role client for all operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's Amazon connections
    const { data: connections } = await supabase
      .from('amazon_connections_safe')
      .select('*')
      .eq('user_id', userId);

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ 
        predictions: [],
        summary: {
          total_campaigns: 0,
          waste_detected: 0,
          winners_detected: 0,
          anomalies_detected: 0,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const primaryConnection = connections[0];
    const profileId = primaryConnection.profile_id;

    // Calculate date ranges
    const now = new Date();
    const date_7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const date_14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const date_30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[${requestId}] Fetching campaign data for profile ${profileId}`);

    // Fetch campaign performance data for different windows
    const { data: campaigns_30d } = await supabase
      .from('v_campaign_daily')
      .select('*')
      .eq('profile_id', profileId)
      .gte('date', date_30d)
      .limit(1000);

    if (!campaigns_30d || campaigns_30d.length === 0) {
      return new Response(JSON.stringify({ 
        predictions: [],
        summary: {
          total_campaigns: 0,
          waste_detected: 0,
          winners_detected: 0,
          anomalies_detected: 0,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aggregate metrics by campaign and time window
    const campaignMetrics = aggregateCampaignMetrics(campaigns_30d, date_7d, date_14d, date_30d);
    
    // Generate statistical predictions
    const predictions = generateStatisticalPredictions(campaignMetrics, requestId);

    // Calculate summary statistics
    const summary = {
      total_campaigns: campaignMetrics.length,
      waste_detected: predictions.filter(p => p.reason_code === 'waste_keyword').length,
      winners_detected: predictions.filter(p => p.reason_code === 'high_performer').length,
      anomalies_detected: predictions.filter(p => 
        Math.abs(p.anomaly_scores.cpc_zscore) > 2 || 
        Math.abs(p.anomaly_scores.ctr_zscore) > 2 || 
        Math.abs(p.anomaly_scores.acos_zscore) > 2
      ).length,
    };

    console.log(`[${requestId}] Generated ${predictions.length} predictions from ${campaignMetrics.length} campaigns`);

    return new Response(JSON.stringify({
      predictions,
      summary,
      generated_at: now.toISOString(),
      profile_id: profileId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[${requestId}] ML Predictions error:`, error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      predictions: [],
      summary: {
        total_campaigns: 0,
        waste_detected: 0,
        winners_detected: 0,
        anomalies_detected: 0,
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function aggregateCampaignMetrics(
  data: any[],
  date_7d: string,
  date_14d: string,
  date_30d: string
): CampaignMetrics[] {
  const campaignMap = new Map<string, CampaignMetrics>();

  data.forEach((row: any) => {
    const id = row.campaign_id;
    if (!campaignMap.has(id)) {
      campaignMap.set(id, {
        campaign_id: id,
        campaign_name: row.campaign_name,
        spend_7d: 0, spend_14d: 0, spend_30d: 0,
        sales_7d: 0, sales_14d: 0, sales_30d: 0,
        clicks_7d: 0, clicks_14d: 0, clicks_30d: 0,
        impressions_7d: 0, impressions_14d: 0, impressions_30d: 0,
        conversions_7d: 0, conversions_14d: 0, conversions_30d: 0,
      });
    }

    const campaign = campaignMap.get(id)!;
    const rowDate = row.date;

    // Aggregate for 30-day window
    campaign.spend_30d += row.spend || 0;
    campaign.sales_30d += row.sales || 0;
    campaign.clicks_30d += row.clicks || 0;
    campaign.impressions_30d += row.impressions || 0;
    campaign.conversions_30d += Math.floor((row.sales || 0) / 25); // Assume $25 AOV

    // Aggregate for 14-day window
    if (rowDate >= date_14d) {
      campaign.spend_14d += row.spend || 0;
      campaign.sales_14d += row.sales || 0;
      campaign.clicks_14d += row.clicks || 0;
      campaign.impressions_14d += row.impressions || 0;
      campaign.conversions_14d += Math.floor((row.sales || 0) / 25);
    }

    // Aggregate for 7-day window
    if (rowDate >= date_7d) {
      campaign.spend_7d += row.spend || 0;
      campaign.sales_7d += row.sales || 0;
      campaign.clicks_7d += row.clicks || 0;
      campaign.impressions_7d += row.impressions || 0;
      campaign.conversions_7d += Math.floor((row.sales || 0) / 25);
    }
  });

  return Array.from(campaignMap.values());
}

function generateStatisticalPredictions(
  campaigns: CampaignMetrics[],
  requestId: string
): StatisticalPrediction[] {
  const predictions: StatisticalPrediction[] = [];

  // Calculate population statistics for Z-scores
  const allCpcs: number[] = [];
  const allCtrs: number[] = [];
  const allAcos: number[] = [];

  campaigns.forEach(c => {
    if (c.clicks_30d > 0) allCpcs.push(c.spend_30d / c.clicks_30d);
    if (c.impressions_30d > 0) allCtrs.push((c.clicks_30d / c.impressions_30d) * 100);
    if (c.sales_30d > 0) allAcos.push((c.spend_30d / c.sales_30d) * 100);
  });

  const cpcStats = calculateStats(allCpcs);
  const ctrStats = calculateStats(allCtrs);
  const acosStats = calculateStats(allAcos);

  console.log(`[${requestId}] Population stats - CPC: μ=${cpcStats.mean.toFixed(2)}, σ=${cpcStats.std.toFixed(2)}`);

  campaigns.forEach(campaign => {
    // Calculate metrics for all windows
    const cpc_7d = campaign.clicks_7d > 0 ? campaign.spend_7d / campaign.clicks_7d : 0;
    const cpc_14d = campaign.clicks_14d > 0 ? campaign.spend_14d / campaign.clicks_14d : 0;
    const cpc_30d = campaign.clicks_30d > 0 ? campaign.spend_30d / campaign.clicks_30d : 0;

    const ctr_7d = campaign.impressions_7d > 0 ? (campaign.clicks_7d / campaign.impressions_7d) * 100 : 0;
    const ctr_14d = campaign.impressions_14d > 0 ? (campaign.clicks_14d / campaign.impressions_14d) * 100 : 0;
    const ctr_30d = campaign.impressions_30d > 0 ? (campaign.clicks_30d / campaign.impressions_30d) * 100 : 0;

    const cvr_7d = campaign.clicks_7d > 0 ? (campaign.conversions_7d / campaign.clicks_7d) * 100 : 0;
    const cvr_14d = campaign.clicks_14d > 0 ? (campaign.conversions_14d / campaign.clicks_14d) * 100 : 0;
    const cvr_30d = campaign.clicks_30d > 0 ? (campaign.conversions_30d / campaign.clicks_30d) * 100 : 0;

    const acos_7d = campaign.sales_7d > 0 ? (campaign.spend_7d / campaign.sales_7d) * 100 : 0;
    const acos_14d = campaign.sales_14d > 0 ? (campaign.spend_14d / campaign.sales_14d) * 100 : 0;
    const acos_30d = campaign.sales_30d > 0 ? (campaign.spend_30d / campaign.sales_30d) * 100 : 0;

    const roas_7d = campaign.spend_7d > 0 ? campaign.sales_7d / campaign.spend_7d : 0;
    const roas_14d = campaign.spend_14d > 0 ? campaign.sales_14d / campaign.spend_14d : 0;
    const roas_30d = campaign.spend_30d > 0 ? campaign.sales_30d / campaign.spend_30d : 0;

    // Calculate Z-scores
    const cpc_zscore = cpcStats.std > 0 ? (cpc_30d - cpcStats.mean) / cpcStats.std : 0;
    const ctr_zscore = ctrStats.std > 0 ? (ctr_30d - ctrStats.mean) / ctrStats.std : 0;
    const acos_zscore = acosStats.std > 0 ? (acos_30d - acosStats.mean) / acosStats.std : 0;

    const metrics = {
      cpc_7d, cpc_14d, cpc_30d,
      ctr_7d, ctr_14d, ctr_30d,
      cvr_7d, cvr_14d, cvr_30d,
      acos_7d, acos_14d, acos_30d,
      roas_7d, roas_14d, roas_30d,
    };

    const anomaly_scores = {
      cpc_zscore,
      ctr_zscore,
      acos_zscore,
    };

    // Rule 1: Detect waste (spend > $100, no sales, clicks > 50)
    if (campaign.spend_14d > 100 && campaign.sales_14d === 0 && campaign.clicks_14d > 50) {
      predictions.push({
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        prediction_type: 'negative_keyword',
        action_numeric: -1, // Pause or add negatives
        reason_code: 'waste_keyword',
        metrics,
        anomaly_scores,
        confidence: 'high',
        impact: 'high',
      });
    }

    // Rule 2: High performer detection (ROAS > 3x, consistent 14+ days)
    if (roas_14d > 3 && campaign.sales_14d > 100) {
      predictions.push({
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        prediction_type: 'budget_change',
        action_numeric: 0.25, // Increase budget by 25%
        reason_code: 'high_performer',
        metrics,
        anomaly_scores,
        confidence: 'high',
        impact: 'high',
      });
    }

    // Rule 3: High ACOS anomaly (Z-score > 2)
    if (acos_zscore > 2 && acos_30d > 30) {
      predictions.push({
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        prediction_type: 'bid_adjustment',
        action_numeric: -0.15, // Decrease bid by 15%
        reason_code: 'high_acos_anomaly',
        metrics,
        anomaly_scores,
        confidence: 'high',
        impact: 'medium',
      });
    }

    // Rule 4: Low CTR anomaly (Z-score < -2)
    if (ctr_zscore < -2 && ctr_30d < 0.5) {
      predictions.push({
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        prediction_type: 'keyword_suggestion',
        action_numeric: 0, // Suggest keyword refresh
        reason_code: 'low_ctr_anomaly',
        metrics,
        anomaly_scores,
        confidence: 'medium',
        impact: 'medium',
      });
    }

    // Rule 5: High CPC without results (Z-score > 1.5 and CVR < 2%)
    if (cpc_zscore > 1.5 && cvr_14d < 2 && campaign.clicks_14d > 30) {
      predictions.push({
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        prediction_type: 'bid_adjustment',
        action_numeric: -0.20, // Decrease bid by 20%
        reason_code: 'high_cpc_low_cvr',
        metrics,
        anomaly_scores,
        confidence: 'high',
        impact: 'medium',
      });
    }

    // Rule 6: Declining performance (7d ROAS < 14d ROAS by 30%+)
    if (roas_14d > 0 && roas_7d < roas_14d * 0.7 && campaign.spend_7d > 50) {
      predictions.push({
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        prediction_type: 'bid_adjustment',
        action_numeric: -0.10, // Decrease bid by 10%
        reason_code: 'declining_performance',
        metrics,
        anomaly_scores,
        confidence: 'medium',
        impact: 'low',
      });
    }
  });

  // Sort by impact (high first) and confidence
  predictions.sort((a, b) => {
    const impactScore = { high: 3, medium: 2, low: 1 };
    const confScore = { high: 3, medium: 2, low: 1 };
    
    const scoreA = impactScore[a.impact] * 10 + confScore[a.confidence];
    const scoreB = impactScore[b.impact] * 10 + confScore[b.confidence];
    
    return scoreB - scoreA;
  });

  return predictions.slice(0, 10); // Return top 10 predictions
}

function calculateStats(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  return { mean, std };
}
