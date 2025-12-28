import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// INCREMENTALITY ENGINE - Synthetic Control Method
// =====================================================
// Measures true causal impact of advertising
// Uses synthetic control to estimate counterfactual

interface ExperimentConfig {
  name: string;
  experiment_type: 'holdout' | 'synthetic_control';
  entity_type: string;
  entity_id: string;
  treatment_start_date: string;
  treatment_end_date: string;
  warmup_days?: number;
  cooldown_days?: number;
}

interface TimeSeriesPoint {
  date: string;
  spend: number;
  sales: number;
  conversions: number;
  impressions: number;
}

// =====================================================
// Synthetic Control Method
// =====================================================

function buildSyntheticControl(
  treatmentPrePeriod: TimeSeriesPoint[],
  candidatesPrePeriod: Map<string, TimeSeriesPoint[]>
): Map<string, number> {
  // Find weights that minimize pre-treatment prediction error
  // Using simple regression-based approach
  
  const weights = new Map<string, number>();
  const candidateIds = Array.from(candidatesPrePeriod.keys());
  
  if (candidateIds.length === 0) return weights;
  
  // Build matrices for least squares
  // y = treatment sales, X = candidate sales
  const n = treatmentPrePeriod.length;
  const k = candidateIds.length;
  
  const y: number[] = treatmentPrePeriod.map(p => p.sales);
  const X: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (const candId of candidateIds) {
      const candData = candidatesPrePeriod.get(candId)!;
      row.push(candData[i]?.sales || 0);
    }
    X.push(row);
  }
  
  // Simple approach: use correlation-weighted average
  // (Full least squares with constraints would be ideal but complex)
  
  const treatmentMean = y.reduce((a, b) => a + b, 0) / n;
  const treatmentVar = y.reduce((sum, val) => sum + Math.pow(val - treatmentMean, 2), 0) / n;
  
  const correlations: { id: string; corr: number }[] = [];
  
  for (let j = 0; j < k; j++) {
    const candId = candidateIds[j];
    const candSales = X.map(row => row[j]);
    const candMean = candSales.reduce((a, b) => a + b, 0) / n;
    const candVar = candSales.reduce((sum, val) => sum + Math.pow(val - candMean, 2), 0) / n;
    
    if (candVar === 0 || treatmentVar === 0) {
      correlations.push({ id: candId, corr: 0 });
      continue;
    }
    
    // Calculate correlation
    let cov = 0;
    for (let i = 0; i < n; i++) {
      cov += (y[i] - treatmentMean) * (candSales[i] - candMean);
    }
    cov /= n;
    
    const corr = cov / Math.sqrt(treatmentVar * candVar);
    correlations.push({ id: candId, corr: Math.abs(corr) });
  }
  
  // Use top correlated candidates with positive weights summing to 1
  const topCandidates = correlations
    .filter(c => c.corr > 0.3)
    .sort((a, b) => b.corr - a.corr)
    .slice(0, 5);
  
  if (topCandidates.length === 0) {
    // Fallback: equal weights for all
    for (const id of candidateIds) {
      weights.set(id, 1 / k);
    }
  } else {
    const totalCorr = topCandidates.reduce((sum, c) => sum + c.corr, 0);
    for (const c of topCandidates) {
      weights.set(c.id, c.corr / totalCorr);
    }
  }
  
  return weights;
}

function predictSyntheticOutcome(
  weights: Map<string, number>,
  candidatesPostPeriod: Map<string, TimeSeriesPoint[]>
): TimeSeriesPoint[] {
  const predictions: TimeSeriesPoint[] = [];
  const candidateIds = Array.from(weights.keys());
  
  if (candidateIds.length === 0) return predictions;
  
  // Get the length from the first candidate
  const firstCand = candidatesPostPeriod.get(candidateIds[0]);
  if (!firstCand) return predictions;
  
  for (let i = 0; i < firstCand.length; i++) {
    let weightedSales = 0;
    let weightedConversions = 0;
    let weightedImpressions = 0;
    
    for (const [candId, weight] of weights) {
      const candData = candidatesPostPeriod.get(candId);
      if (candData && candData[i]) {
        weightedSales += candData[i].sales * weight;
        weightedConversions += candData[i].conversions * weight;
        weightedImpressions += candData[i].impressions * weight;
      }
    }
    
    predictions.push({
      date: firstCand[i].date,
      spend: 0,
      sales: weightedSales,
      conversions: weightedConversions,
      impressions: weightedImpressions
    });
  }
  
  return predictions;
}

function calculateLiftAndSignificance(
  actualPostPeriod: TimeSeriesPoint[],
  syntheticPostPeriod: TimeSeriesPoint[]
): { lift: number; liftPercent: number; pValue: number; significant: boolean; ci: [number, number] } {
  
  const n = Math.min(actualPostPeriod.length, syntheticPostPeriod.length);
  if (n === 0) return { lift: 0, liftPercent: 0, pValue: 1, significant: false, ci: [0, 0] };
  
  const differences: number[] = [];
  let totalActual = 0;
  let totalSynthetic = 0;
  
  for (let i = 0; i < n; i++) {
    const actual = actualPostPeriod[i].sales;
    const synthetic = syntheticPostPeriod[i].sales;
    differences.push(actual - synthetic);
    totalActual += actual;
    totalSynthetic += synthetic;
  }
  
  const lift = totalActual - totalSynthetic;
  const liftPercent = totalSynthetic > 0 ? (lift / totalSynthetic) * 100 : 0;
  
  // Calculate standard error and t-statistic
  const meanDiff = differences.reduce((a, b) => a + b, 0) / n;
  const variance = differences.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (n - 1);
  const stdError = Math.sqrt(variance / n);
  
  // t-statistic
  const tStat = stdError > 0 ? meanDiff / stdError : 0;
  
  // Approximate p-value using normal distribution (for large n)
  // For small n, would need t-distribution
  const pValue = 2 * (1 - normalCdf(Math.abs(tStat)));
  
  // 95% confidence interval
  const z = 1.96;
  const ciLower = lift - z * stdError * n;
  const ciUpper = lift + z * stdError * n;
  
  return {
    lift,
    liftPercent,
    pValue,
    significant: pValue < 0.05,
    ci: [ciLower, ciUpper]
  };
}

function normalCdf(x: number): number {
  // Approximation of normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// =====================================================
// Main Handler
// =====================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    const body = await req.json().catch(() => ({}));

    // Route actions
    switch (action) {
      case 'create':
        return handleCreateExperiment(supabase, body);
      case 'analyze':
        return handleAnalyzeExperiment(supabase, body);
      case 'list':
        return handleListExperiments(supabase, body);
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[Incrementality Analyzer] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCreateExperiment(supabase: any, body: any) {
  const { profile_id, user_id, config }: { profile_id: string; user_id: string; config: ExperimentConfig } = body;

  if (!profile_id || !user_id || !config) {
    return new Response(
      JSON.stringify({ error: 'profile_id, user_id, and config are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Calculate dates
  const warmupDays = config.warmup_days || 7;
  const cooldownDays = config.cooldown_days || 7;
  
  const treatmentStart = new Date(config.treatment_start_date);
  const treatmentEnd = new Date(config.treatment_end_date);
  
  const warmupStart = new Date(treatmentStart);
  warmupStart.setDate(warmupStart.getDate() - warmupDays);
  
  const cooldownEnd = new Date(treatmentEnd);
  cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays);

  const { data: experiment, error } = await supabase
    .from('incrementality_experiments')
    .insert({
      profile_id,
      user_id,
      name: config.name,
      experiment_type: config.experiment_type,
      entity_type: config.entity_type,
      entity_id: config.entity_id,
      warmup_start_date: warmupStart.toISOString().split('T')[0],
      treatment_start_date: config.treatment_start_date,
      treatment_end_date: config.treatment_end_date,
      cooldown_end_date: cooldownEnd.toISOString().split('T')[0],
      status: 'draft'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating experiment:', error);
    throw error;
  }

  return new Response(
    JSON.stringify({ experiment }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAnalyzeExperiment(supabase: any, body: any) {
  const { experiment_id } = body;

  if (!experiment_id) {
    return new Response(
      JSON.stringify({ error: 'experiment_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch experiment
  const { data: experiment, error: expError } = await supabase
    .from('incrementality_experiments')
    .select('*')
    .eq('id', experiment_id)
    .single();

  if (expError || !experiment) {
    return new Response(
      JSON.stringify({ error: 'Experiment not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[Incrementality] Analyzing experiment ${experiment_id}`);

  // Fetch treatment entity performance
  const { data: treatmentData, error: treatError } = await supabase
    .from('campaign_performance_history')
    .select('date, spend, sales, orders, impressions')
    .eq('campaign_id', experiment.entity_id)
    .gte('date', experiment.warmup_start_date)
    .lte('date', experiment.cooldown_end_date)
    .order('date');

  if (treatError) {
    console.error('Error fetching treatment data:', treatError);
    throw treatError;
  }

  // Fetch control candidates (other campaigns in same profile)
  const { data: controlCampaigns, error: controlError } = await supabase
    .from('campaigns')
    .select('id, amazon_campaign_id, name')
    .eq('profile_id', experiment.profile_id)
    .neq('id', experiment.entity_id);

  if (controlError) {
    console.error('Error fetching control campaigns:', controlError);
    throw controlError;
  }

  // Fetch control data
  const controlDataMap = new Map<string, TimeSeriesPoint[]>();
  
  for (const control of controlCampaigns || []) {
    const { data: controlData } = await supabase
      .from('campaign_performance_history')
      .select('date, spend, sales, orders, impressions')
      .eq('campaign_id', control.id)
      .gte('date', experiment.warmup_start_date)
      .lte('date', experiment.cooldown_end_date)
      .order('date');

    if (controlData && controlData.length > 0) {
      controlDataMap.set(control.id, controlData.map(d => ({
        date: d.date,
        spend: d.spend || 0,
        sales: d.sales || 0,
        conversions: d.orders || 0,
        impressions: d.impressions || 0
      })));
    }
  }

  // Split into pre and post periods
  const treatmentStartDate = new Date(experiment.treatment_start_date);
  
  const treatmentPrePeriod: TimeSeriesPoint[] = [];
  const treatmentPostPeriod: TimeSeriesPoint[] = [];
  
  for (const d of treatmentData || []) {
    const point: TimeSeriesPoint = {
      date: d.date,
      spend: d.spend || 0,
      sales: d.sales || 0,
      conversions: d.orders || 0,
      impressions: d.impressions || 0
    };
    
    if (new Date(d.date) < treatmentStartDate) {
      treatmentPrePeriod.push(point);
    } else {
      treatmentPostPeriod.push(point);
    }
  }

  // Split control data similarly
  const controlsPrePeriod = new Map<string, TimeSeriesPoint[]>();
  const controlsPostPeriod = new Map<string, TimeSeriesPoint[]>();
  
  for (const [id, data] of controlDataMap) {
    const pre: TimeSeriesPoint[] = [];
    const post: TimeSeriesPoint[] = [];
    
    for (const d of data) {
      if (new Date(d.date) < treatmentStartDate) {
        pre.push(d);
      } else {
        post.push(d);
      }
    }
    
    if (pre.length > 0) controlsPrePeriod.set(id, pre);
    if (post.length > 0) controlsPostPeriod.set(id, post);
  }

  // Build synthetic control
  const weights = buildSyntheticControl(treatmentPrePeriod, controlsPrePeriod);
  
  // Store weights
  for (const [controlId, weight] of weights) {
    if (weight > 0) {
      await supabase
        .from('synthetic_control_weights')
        .upsert({
          experiment_id,
          control_entity_type: 'campaign',
          control_entity_id: controlId,
          weight
        }, {
          onConflict: 'experiment_id,control_entity_type,control_entity_id'
        });
    }
  }

  // Predict synthetic outcome
  const syntheticOutcome = predictSyntheticOutcome(weights, controlsPostPeriod);
  
  // Calculate lift and significance
  const { lift, liftPercent, pValue, significant, ci } = calculateLiftAndSignificance(
    treatmentPostPeriod,
    syntheticOutcome
  );

  // Calculate baseline metrics
  const baselineMetrics = {
    impressions: treatmentPrePeriod.reduce((sum, d) => sum + d.impressions, 0),
    conversions: treatmentPrePeriod.reduce((sum, d) => sum + d.conversions, 0),
    spend: treatmentPrePeriod.reduce((sum, d) => sum + d.spend, 0),
    sales: treatmentPrePeriod.reduce((sum, d) => sum + d.sales, 0)
  };

  const treatmentMetrics = {
    impressions: treatmentPostPeriod.reduce((sum, d) => sum + d.impressions, 0),
    conversions: treatmentPostPeriod.reduce((sum, d) => sum + d.conversions, 0),
    spend: treatmentPostPeriod.reduce((sum, d) => sum + d.spend, 0),
    sales: treatmentPostPeriod.reduce((sum, d) => sum + d.sales, 0)
  };

  // Update experiment with results
  await supabase
    .from('incrementality_experiments')
    .update({
      status: 'completed',
      baseline_metrics: baselineMetrics,
      treatment_metrics: treatmentMetrics,
      incremental_lift: lift,
      incremental_lift_percent: liftPercent,
      incremental_sales_micros: lift * 1000000,
      statistical_significance: pValue,
      confidence_interval: { lower: ci[0], upper: ci[1] },
      is_significant: significant,
      experiment_cost_micros: treatmentMetrics.spend * 1000000
    })
    .eq('id', experiment_id);

  console.log(`[Incrementality] Analysis complete: lift=${lift}, p=${pValue}`);

  return new Response(
    JSON.stringify({
      experiment_id,
      status: 'completed',
      results: {
        incremental_lift: lift,
        incremental_lift_percent: liftPercent,
        p_value: pValue,
        is_significant: significant,
        confidence_interval: ci,
        synthetic_control_entities: Array.from(weights.keys()).length,
        baseline_metrics: baselineMetrics,
        treatment_metrics: treatmentMetrics
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleListExperiments(supabase: any, body: any) {
  const { profile_id } = body;

  if (!profile_id) {
    return new Response(
      JSON.stringify({ error: 'profile_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: experiments, error } = await supabase
    .from('incrementality_experiments')
    .select('*')
    .eq('profile_id', profile_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing experiments:', error);
    throw error;
  }

  return new Response(
    JSON.stringify({ experiments }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
