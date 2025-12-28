import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// PORTFOLIO-LEVEL BUDGET OPTIMIZER
// =====================================================
// Allocates budget across campaigns based on marginal ROAS
// Shifts spend from diminishing-returns campaigns to high-opportunity ones

interface CampaignData {
  id: string;
  campaign_id: string;
  name: string;
  current_budget_micros: number;
  spend_micros: number;
  sales_micros: number;
  conversions: number;
  impressions: number;
  clicks: number;
}

interface MarginalCurvePoint {
  spend_level_micros: number;
  marginal_roas: number;
  cumulative_roas: number;
}

interface ReallocationRecommendation {
  campaign_id: string;
  campaign_name: string;
  current_budget_micros: number;
  recommended_budget_micros: number;
  change_micros: number;
  change_percent: number;
  current_roas: number;
  marginal_roas: number;
  reason: string;
}

// =====================================================
// Marginal ROAS Calculation
// =====================================================

function calculateMarginalCurve(
  historicalData: { spend_micros: number; sales_micros: number }[]
): MarginalCurvePoint[] {
  if (historicalData.length < 3) return [];

  // Sort by spend level
  const sorted = [...historicalData].sort((a, b) => a.spend_micros - b.spend_micros);
  
  const curve: MarginalCurvePoint[] = [];
  
  for (let i = 1; i < sorted.length; i++) {
    const prevSpend = sorted[i - 1].spend_micros;
    const currSpend = sorted[i].spend_micros;
    const prevSales = sorted[i - 1].sales_micros;
    const currSales = sorted[i].sales_micros;
    
    const deltaSpend = currSpend - prevSpend;
    const deltaSales = currSales - prevSales;
    
    if (deltaSpend > 0) {
      const marginalRoas = deltaSales / deltaSpend;
      const cumulativeRoas = currSpend > 0 ? currSales / currSpend : 0;
      
      curve.push({
        spend_level_micros: currSpend,
        marginal_roas: marginalRoas,
        cumulative_roas: cumulativeRoas
      });
    }
  }
  
  return curve;
}

function estimateMarginalRoasAtSpend(
  curve: MarginalCurvePoint[],
  targetSpend: number
): number {
  if (curve.length === 0) return 0;
  
  // Find the closest points
  let lower: MarginalCurvePoint | null = null;
  let upper: MarginalCurvePoint | null = null;
  
  for (const point of curve) {
    if (point.spend_level_micros <= targetSpend) {
      lower = point;
    }
    if (point.spend_level_micros >= targetSpend && !upper) {
      upper = point;
    }
  }
  
  if (!lower && !upper) return 0;
  if (!lower) return upper!.marginal_roas;
  if (!upper) return lower.marginal_roas;
  if (lower === upper) return lower.marginal_roas;
  
  // Linear interpolation
  const t = (targetSpend - lower.spend_level_micros) / 
            (upper.spend_level_micros - lower.spend_level_micros);
  
  return lower.marginal_roas + t * (upper.marginal_roas - lower.marginal_roas);
}

// =====================================================
// Portfolio Optimization Algorithm
// =====================================================

function optimizePortfolio(
  campaigns: CampaignData[],
  marginalCurves: Map<string, MarginalCurvePoint[]>,
  totalBudget: number,
  minBudgetPercent: number = 0.1,
  maxBudgetPercent: number = 0.5
): ReallocationRecommendation[] {
  
  const recommendations: ReallocationRecommendation[] = [];
  const n = campaigns.length;
  
  if (n === 0) return recommendations;
  
  // Calculate current marginal ROAS for each campaign
  const campaignMarginals = campaigns.map(c => {
    const curve = marginalCurves.get(c.campaign_id) || [];
    const marginalRoas = estimateMarginalRoasAtSpend(curve, c.spend_micros);
    const currentRoas = c.spend_micros > 0 ? c.sales_micros / c.spend_micros : 0;
    
    return {
      ...c,
      marginal_roas: marginalRoas,
      current_roas: currentRoas
    };
  });
  
  // Sort by marginal ROAS descending
  campaignMarginals.sort((a, b) => b.marginal_roas - a.marginal_roas);
  
  // Calculate average marginal ROAS
  const avgMarginalRoas = campaignMarginals.reduce((sum, c) => sum + c.marginal_roas, 0) / n;
  
  // Determine reallocation
  const minBudget = totalBudget * minBudgetPercent / n;
  const maxBudget = totalBudget * maxBudgetPercent;
  
  let remainingBudget = totalBudget;
  const allocations = new Map<string, number>();
  
  // First pass: allocate based on marginal ROAS ranking
  for (const campaign of campaignMarginals) {
    // High marginal ROAS gets more budget
    const roasRatio = avgMarginalRoas > 0 ? campaign.marginal_roas / avgMarginalRoas : 1;
    
    // Base allocation proportional to current budget, adjusted by ROAS ratio
    let allocation = campaign.current_budget_micros * roasRatio;
    
    // Apply constraints
    allocation = Math.max(minBudget, Math.min(maxBudget, allocation));
    allocation = Math.min(allocation, remainingBudget);
    
    allocations.set(campaign.campaign_id, allocation);
    remainingBudget -= allocation;
  }
  
  // Second pass: distribute any remaining budget to top performers
  if (remainingBudget > 0) {
    const topPerformers = campaignMarginals.filter(c => c.marginal_roas > avgMarginalRoas);
    const bonusPerCampaign = remainingBudget / (topPerformers.length || 1);
    
    for (const campaign of topPerformers) {
      const current = allocations.get(campaign.campaign_id) || 0;
      allocations.set(campaign.campaign_id, Math.min(maxBudget, current + bonusPerCampaign));
    }
  }
  
  // Generate recommendations
  for (const campaign of campaignMarginals) {
    const recommendedBudget = allocations.get(campaign.campaign_id) || campaign.current_budget_micros;
    const changeMicros = recommendedBudget - campaign.current_budget_micros;
    const changePercent = campaign.current_budget_micros > 0 
      ? (changeMicros / campaign.current_budget_micros) * 100 
      : 0;
    
    // Only include significant changes (>5%)
    if (Math.abs(changePercent) > 5) {
      let reason = '';
      if (changeMicros > 0) {
        reason = `High marginal ROAS (${campaign.marginal_roas.toFixed(2)}) indicates opportunity for scale`;
      } else {
        reason = `Low marginal ROAS (${campaign.marginal_roas.toFixed(2)}) suggests diminishing returns`;
      }
      
      recommendations.push({
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.name,
        current_budget_micros: campaign.current_budget_micros,
        recommended_budget_micros: recommendedBudget,
        change_micros: changeMicros,
        change_percent: changePercent,
        current_roas: campaign.current_roas,
        marginal_roas: campaign.marginal_roas,
        reason
      });
    }
  }
  
  // Sort by change magnitude
  recommendations.sort((a, b) => Math.abs(b.change_micros) - Math.abs(a.change_micros));
  
  return recommendations;
}

// =====================================================
// Main Handler
// =====================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { profile_id, lookback_days = 30, dry_run = true } = body;

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Portfolio Optimizer] Starting for profile ${profile_id}`);

    // Create run record
    const { data: run, error: runError } = await supabase
      .from('portfolio_optimization_runs')
      .insert({
        profile_id,
        status: 'running',
        optimization_goal: 'maximize_roas'
      })
      .select()
      .single();

    if (runError) {
      console.error('Error creating run:', runError);
      throw runError;
    }

    // Fetch campaigns with current metrics
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id, name, daily_budget, cost_7d, attributed_sales_7d, attributed_conversions_7d, impressions_7d, clicks_7d')
      .eq('profile_id', profile_id)
      .eq('status', 'enabled');

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      await supabase
        .from('portfolio_optimization_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          campaigns_included: 0,
          reallocation_summary: []
        })
        .eq('id', run.id);

      return new Response(
        JSON.stringify({ 
          run_id: run.id,
          message: 'No active campaigns found',
          recommendations: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform campaign data
    const campaignData: CampaignData[] = campaigns.map(c => ({
      id: c.id,
      campaign_id: c.amazon_campaign_id,
      name: c.name,
      current_budget_micros: (c.daily_budget || 0) * 1000000,
      spend_micros: (c.cost_7d || 0) * 1000000,
      sales_micros: (c.attributed_sales_7d || 0) * 1000000,
      conversions: c.attributed_conversions_7d || 0,
      impressions: c.impressions_7d || 0,
      clicks: c.clicks_7d || 0
    }));

    // Calculate total budget
    const totalBudget = campaignData.reduce((sum, c) => sum + c.current_budget_micros, 0);

    // Fetch historical performance for marginal curves
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - lookback_days);

    const { data: history, error: historyError } = await supabase
      .from('campaign_performance_history')
      .select('campaign_id, date, spend, sales')
      .in('campaign_id', campaigns.map(c => c.id))
      .gte('date', fromDate.toISOString().split('T')[0])
      .order('date');

    // Build marginal curves from history
    const marginalCurves = new Map<string, MarginalCurvePoint[]>();
    
    if (history && history.length > 0) {
      // Group by campaign
      const campaignHistory = new Map<string, { spend_micros: number; sales_micros: number }[]>();
      
      for (const h of history) {
        // Find the amazon_campaign_id for this campaign
        const campaign = campaigns.find(c => c.id === h.campaign_id);
        if (!campaign) continue;
        
        const key = campaign.amazon_campaign_id;
        if (!campaignHistory.has(key)) {
          campaignHistory.set(key, []);
        }
        
        campaignHistory.get(key)!.push({
          spend_micros: (h.spend || 0) * 1000000,
          sales_micros: (h.sales || 0) * 1000000
        });
      }
      
      // Calculate marginal curves
      for (const [campaignId, histData] of campaignHistory) {
        const curve = calculateMarginalCurve(histData);
        marginalCurves.set(campaignId, curve);
        
        // Store the curve in the database
        const campaignInfo = campaignData.find(c => c.campaign_id === campaignId);
        if (campaignInfo && curve.length > 0) {
          const currentRoas = campaignInfo.spend_micros > 0 
            ? campaignInfo.sales_micros / campaignInfo.spend_micros 
            : 0;
          const currentAcos = currentRoas > 0 ? 1 / currentRoas : 0;
          
          await supabase
            .from('portfolio_marginal_curves')
            .upsert({
              profile_id,
              campaign_id: campaignId,
              current_spend_micros: campaignInfo.spend_micros,
              current_sales_micros: campaignInfo.sales_micros,
              current_roas: currentRoas,
              current_acos: currentAcos * 100,
              marginal_curve: curve,
              marginal_roas_at_current: estimateMarginalRoasAtSpend(curve, campaignInfo.spend_micros),
              data_points: histData.length,
              last_calculated_at: new Date().toISOString()
            }, {
              onConflict: 'profile_id,campaign_id'
            });
        }
      }
    }

    // Run optimization
    const recommendations = optimizePortfolio(campaignData, marginalCurves, totalBudget);

    // Calculate projected improvement
    let projectedIncrementalSales = 0;
    for (const rec of recommendations) {
      if (rec.change_micros > 0) {
        // More budget to high-marginal campaigns
        projectedIncrementalSales += rec.change_micros * rec.marginal_roas;
      }
    }

    // Queue actions if not dry run
    let actionsQueued = 0;
    if (!dry_run && recommendations.length > 0) {
      for (const rec of recommendations) {
        const idempotencyKey = `portfolio_${profile_id}_${rec.campaign_id}_${new Date().toISOString().split('T')[0]}`;
        
        const { error: actionError } = await supabase
          .from('action_queue')
          .upsert({
            profile_id,
            action_type: 'set_budget',
            idempotency_key: idempotencyKey,
            status: 'queued',
            payload: {
              campaign_id: rec.campaign_id,
              campaign_name: rec.campaign_name,
              current_budget_micros: rec.current_budget_micros,
              new_budget_micros: rec.recommended_budget_micros,
              optimization_source: 'portfolio_optimizer',
              reason: rec.reason
            }
          }, {
            onConflict: 'idempotency_key',
            ignoreDuplicates: true
          });

        if (!actionError) actionsQueued++;
      }
    }

    // Update run record
    await supabase
      .from('portfolio_optimization_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        total_budget_micros: totalBudget,
        campaigns_included: campaigns.length,
        reallocation_summary: recommendations,
        projected_incremental_sales_micros: projectedIncrementalSales,
        actions_queued: actionsQueued
      })
      .eq('id', run.id);

    console.log(`[Portfolio Optimizer] Completed in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        run_id: run.id,
        campaigns_analyzed: campaigns.length,
        recommendations: recommendations.length,
        projected_incremental_sales: projectedIncrementalSales / 1000000,
        actions_queued: actionsQueued,
        dry_run,
        details: recommendations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Portfolio Optimizer] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
