import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getGovernanceWithDefaults,
  isAutomationPaused,
  isEntityProtected,
  applyBidGuardrails,
} from '../_shared/governance-checker.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// BAYESIAN BID OPTIMIZER - Thompson Sampling
// =====================================================
// Uses Beta-Bernoulli model for conversion rate estimation
// Samples from posterior to balance exploration-exploitation

interface BidState {
  id: string;
  profile_id: string;
  entity_type: string;
  entity_id: string;
  campaign_id: string | null;
  ad_group_id: string | null;
  alpha: number;
  beta: number;
  current_bid_micros: number | null;
  observations_count: number;
  total_conversions: number;
  total_clicks: number;
  total_impressions: number;
  total_spend_micros: number;
  total_sales_micros: number;
}

interface OptimizerConfig {
  min_observations: number;          // Minimum data points before optimizing
  min_impressions: number;           // Minimum impressions for eligibility
  target_acos: number;               // Target ACoS (e.g., 0.25 = 25%)
  max_bid_change_percent: number;    // Maximum bid change per iteration
  min_bid_micros: number;            // Floor bid
  max_bid_micros: number;            // Ceiling bid
  exploration_bonus: number;         // Bonus for high-uncertainty entities
  avg_order_value_micros: number;    // Default AOV if unknown
}

const DEFAULT_CONFIG: OptimizerConfig = {
  min_observations: 7,
  min_impressions: 100,
  target_acos: 0.20,
  max_bid_change_percent: 0.25,
  min_bid_micros: 100000,     // $0.10
  max_bid_micros: 10000000,   // $10.00
  exploration_bonus: 0.1,
  avg_order_value_micros: 25000000, // $25.00
};

// =====================================================
// Statistical Functions
// =====================================================

// Beta function using Lanczos approximation for gamma
function gammaLn(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
  }

  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }

  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaLn(a: number, b: number): number {
  return gammaLn(a) + gammaLn(b) - gammaLn(a + b);
}

// Sample from Beta distribution using rejection sampling
function betaSample(alpha: number, beta: number): number {
  // Use gamma variates method for more stable sampling
  const gammaA = gammaSample(alpha, 1);
  const gammaB = gammaSample(beta, 1);
  return gammaA / (gammaA + gammaB);
}

// Sample from Gamma distribution using Marsaglia and Tsang's method
function gammaSample(shape: number, scale: number): number {
  if (shape < 1) {
    return gammaSample(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v * scale;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}

// Box-Muller transform for normal distribution
function normalSample(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Calculate Beta distribution quantiles for confidence intervals
function betaQuantile(p: number, alpha: number, beta: number): number {
  // Newton-Raphson method to find quantile
  // Starting guess using normal approximation
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  let x = Math.max(0.001, Math.min(0.999, mean + normalSample() * Math.sqrt(variance)));

  for (let i = 0; i < 20; i++) {
    const cdf = betaCdf(x, alpha, beta);
    const pdf = betaPdf(x, alpha, beta);
    
    if (pdf < 1e-10) break;
    
    const diff = cdf - p;
    x = x - diff / pdf;
    x = Math.max(0.001, Math.min(0.999, x));
    
    if (Math.abs(diff) < 1e-6) break;
  }

  return x;
}

function betaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return 0;
  return Math.exp(
    (alpha - 1) * Math.log(x) + 
    (beta - 1) * Math.log(1 - x) - 
    betaLn(alpha, beta)
  );
}

function betaCdf(x: number, alpha: number, beta: number): number {
  // Regularized incomplete beta function using continued fraction
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const bt = Math.exp(
    alpha * Math.log(x) + 
    beta * Math.log(1 - x) - 
    betaLn(alpha, beta)
  );

  if (x < (alpha + 1) / (alpha + beta + 2)) {
    return bt * betaContinuedFraction(x, alpha, beta) / alpha;
  } else {
    return 1 - bt * betaContinuedFraction(1 - x, beta, alpha) / beta;
  }
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const epsilon = 1e-10;
  
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < epsilon) d = epsilon;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    
    // Even step
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    h *= d * c;

    // Odd step  
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < epsilon) break;
  }

  return h;
}

// =====================================================
// Thompson Sampling Optimizer
// =====================================================

function calculateOptimalBid(
  state: BidState,
  config: OptimizerConfig,
  avgOrderValue: number
): { newBidMicros: number; sampledCvr: number; expectedValue: number; confidence: number } {
  
  // Sample conversion rate from posterior Beta distribution
  const sampledCvr = betaSample(state.alpha, state.beta);
  
  // Calculate expected value per click
  const expectedValue = sampledCvr * avgOrderValue;
  
  // Calculate optimal bid based on target ACoS
  // bid = expected_value * (1 - target_margin)
  // If target ACoS is 30%, we want to pay max 30% of expected sale value
  const optimalBid = expectedValue * config.target_acos;
  
  // Add exploration bonus for high-uncertainty entities
  const uncertainty = Math.sqrt(
    (state.alpha * state.beta) / 
    ((state.alpha + state.beta) ** 2 * (state.alpha + state.beta + 1))
  );
  const explorationBonus = config.exploration_bonus * uncertainty * optimalBid;
  
  let newBidMicros = Math.round(optimalBid + explorationBonus);
  
  // Apply guardrails
  if (state.current_bid_micros) {
    const maxChange = state.current_bid_micros * config.max_bid_change_percent;
    const minBid = state.current_bid_micros - maxChange;
    const maxBid = state.current_bid_micros + maxChange;
    newBidMicros = Math.max(minBid, Math.min(maxBid, newBidMicros));
  }
  
  // Apply absolute limits
  newBidMicros = Math.max(config.min_bid_micros, Math.min(config.max_bid_micros, newBidMicros));
  
  // Calculate confidence (inverse of credible interval width)
  const ci_lower = betaQuantile(0.025, state.alpha, state.beta);
  const ci_upper = betaQuantile(0.975, state.alpha, state.beta);
  const intervalWidth = ci_upper - ci_lower;
  const pointEstimate = state.alpha / (state.alpha + state.beta);
  const confidence = pointEstimate > 0 ? 1 - (intervalWidth / pointEstimate) : 0;
  
  return {
    newBidMicros,
    sampledCvr,
    expectedValue,
    confidence: Math.max(0, Math.min(1, confidence))
  };
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
    const { profile_id, config: userConfig, dry_run = false } = body;

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === GOVERNANCE CHECK: Kill Switch ===
    const pauseCheck = await isAutomationPaused(supabase, profile_id);
    if (pauseCheck.paused) {
      console.log(`[Bayesian Optimizer] Profile ${profile_id} automation is paused: ${pauseCheck.reason}`);
      return new Response(
        JSON.stringify({ 
          error: 'Automation paused', 
          reason: pauseCheck.reason,
          profile_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load governance settings and merge with user config
    const governanceSettings = await getGovernanceWithDefaults(supabase, profile_id);
    
    // Build config from governance settings + user overrides
    const config: OptimizerConfig = { 
      ...DEFAULT_CONFIG, 
      // Apply governance settings (these take precedence over defaults)
      max_bid_change_percent: governanceSettings.max_bid_change_percent / 100, // Convert from percentage
      min_bid_micros: governanceSettings.min_bid_micros,
      max_bid_micros: governanceSettings.max_bid_micros,
      // Allow userConfig to override other settings (not guardrails)
      ...userConfig,
      // But ensure guardrails from governance are always enforced
      max_bid_change_percent: Math.min(
        userConfig?.max_bid_change_percent ?? DEFAULT_CONFIG.max_bid_change_percent,
        governanceSettings.max_bid_change_percent / 100
      ),
    };

    console.log(`[Bayesian Optimizer] Starting for profile ${profile_id}`, { 
      config, 
      dry_run,
      governance: {
        max_change: governanceSettings.max_bid_change_percent,
        min_bid: governanceSettings.min_bid_micros / 1000000,
        max_bid: governanceSettings.max_bid_micros / 1000000
      }
    });

    // Create optimizer run record
    const { data: run, error: runError } = await supabase
      .from('bid_optimizer_runs')
      .insert({
        profile_id,
        status: 'running',
        config
      })
      .select()
      .single();

    if (runError) {
      console.error('Error creating run record:', runError);
      throw runError;
    }

    // Fetch bid states that have enough data
    // Supports keywords, targets, and ad groups
    const { data: states, error: statesError } = await supabase
      .from('bid_states')
      .select('*')
      .eq('profile_id', profile_id)
      .eq('optimization_enabled', true)
      .gte('observations_count', config.min_observations)
      .gte('total_impressions', config.min_impressions);

    if (statesError) {
      console.error('Error fetching bid states:', statesError);
      throw statesError;
    }

    console.log(`[Bayesian Optimizer] Found ${states?.length || 0} eligible entities`);

    const results = {
      entities_evaluated: states?.length || 0,
      entities_eligible: 0,
      bids_sampled: 0,
      bids_changed: 0,
      actions_queued: 0,
      recommendations: [] as any[]
    };

    if (!states || states.length === 0) {
      await supabase
        .from('bid_optimizer_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          ...results,
          summary: { message: 'No eligible entities found' }
        })
        .eq('id', run.id);

      return new Response(
        JSON.stringify({ run_id: run.id, ...results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate average order value from historical data
    let avgOrderValue = config.avg_order_value_micros;
    const totalSales = states.reduce((sum, s) => sum + (s.total_sales_micros || 0), 0);
    const totalConversions = states.reduce((sum, s) => sum + (s.total_conversions || 0), 0);
    if (totalConversions > 0) {
      avgOrderValue = totalSales / totalConversions;
    }

    // Collect entity IDs for name lookups
    const keywordIds = new Set<string>();
    const targetIds = new Set<string>();
    const adGroupIds = new Set<string>();
    const adGroupEntityIds = new Set<string>(); // For ad groups being directly optimized
    
    for (const state of states) {
      if (state.entity_type === 'keyword') keywordIds.add(state.entity_id);
      else if (state.entity_type === 'target') targetIds.add(state.entity_id);
      else if (state.entity_type === 'adgroup') adGroupEntityIds.add(state.entity_id);
      if (state.ad_group_id) adGroupIds.add(state.ad_group_id);
    }

    // Fetch entity names for enrichment
    const entityNames = new Map<string, string>();
    const adGroupNames = new Map<string, string>();

    if (keywordIds.size > 0) {
      const { data: keywords } = await supabase
        .from('keywords')
        .select('amazon_keyword_id, keyword_text, match_type')
        .in('amazon_keyword_id', Array.from(keywordIds));
      keywords?.forEach(k => {
        entityNames.set(k.amazon_keyword_id, `"${k.keyword_text}" (${k.match_type})`);
      });
    }

    if (targetIds.size > 0) {
      const { data: targets } = await supabase
        .from('targets')
        .select('amazon_target_id, expression_type, expression')
        .in('amazon_target_id', Array.from(targetIds));
      targets?.forEach(t => {
        const expr = t.expression || t.expression_type || 'Target';
        entityNames.set(t.amazon_target_id, expr.length > 50 ? expr.substring(0, 47) + '...' : expr);
      });
    }

    if (adGroupIds.size > 0 || adGroupEntityIds.size > 0) {
      const allAdGroupIds = new Set([...adGroupIds, ...adGroupEntityIds]);
      const { data: adGroups } = await supabase
        .from('ad_groups')
        .select('amazon_adgroup_id, name')
        .in('amazon_adgroup_id', Array.from(allAdGroupIds));
      adGroups?.forEach(ag => adGroupNames.set(ag.amazon_adgroup_id, ag.name));
    }

    // Process each entity
    const bidUpdates: any[] = [];
    const actions: any[] = [];

    for (const state of states) {
      // === GOVERNANCE CHECK: Protected Entities ===
      const entityType = state.entity_type === 'adgroup' ? 'ad_group' : state.entity_type as 'keyword' | 'target';
      const protectedCheck = await isEntityProtected(supabase, profile_id, entityType, state.entity_id);
      if (protectedCheck.protected) {
        console.log(`[Bayesian Optimizer] Entity ${state.entity_id} skipped - protected: ${protectedCheck.reason}`);
        continue;
      }
      
      results.entities_eligible++;
      
      const { newBidMicros: rawBidMicros, sampledCvr, expectedValue, confidence } = calculateOptimalBid(
        state as BidState,
        config,
        avgOrderValue
      );

      // === GOVERNANCE: Apply bid guardrails ===
      const bidGuardrails = await applyBidGuardrails(
        supabase,
        profile_id,
        state.current_bid_micros,
        rawBidMicros
      );
      const newBidMicros = bidGuardrails.bidMicros;
      
      if (bidGuardrails.wasAdjusted) {
        console.log(`[Bayesian Optimizer] Bid adjusted for ${state.entity_id}: ${bidGuardrails.reason}`);
      }

      results.bids_sampled++;

      // Calculate confidence intervals
      const ci_lower = betaQuantile(0.025, state.alpha, state.beta);
      const ci_upper = betaQuantile(0.975, state.alpha, state.beta);
      const confidenceLevel = 
        (ci_upper - ci_lower) < 0.2 * (state.alpha / (state.alpha + state.beta)) ? 'high' :
        (ci_upper - ci_lower) < 0.5 * (state.alpha / (state.alpha + state.beta)) ? 'medium' : 'low';

      // Update bid state with new confidence metrics
      bidUpdates.push({
        id: state.id,
        last_sampled_bid_micros: newBidMicros,
        confidence_lower: ci_lower,
        confidence_upper: ci_upper,
        credible_interval_width: ci_upper - ci_lower,
        confidence_level: confidenceLevel,
        last_optimized_at: new Date().toISOString()
      });

      // Check if bid change is significant (>2% difference)
      const currentBid = state.current_bid_micros || newBidMicros;
      const bidChangePercent = Math.abs(newBidMicros - currentBid) / currentBid;

      if (bidChangePercent > 0.02) {
        results.bids_changed++;

        // Get entity name for enriched display
        const entityName = state.entity_type === 'adgroup' 
          ? adGroupNames.get(state.entity_id) || `Ad Group ...${state.entity_id.slice(-6)}`
          : entityNames.get(state.entity_id) || 
            (state.ad_group_id ? adGroupNames.get(state.ad_group_id) : null) ||
            `${state.entity_type} ...${state.entity_id.slice(-6)}`;

        // Format bid change for display
        const currentBidDollars = (currentBid / 1000000).toFixed(2);
        const newBidDollars = (newBidMicros / 1000000).toFixed(2);
        const changeDirection = newBidMicros > currentBid ? '+' : '';
        const changePercentFormatted = `${changeDirection}${(bidChangePercent * 100).toFixed(0)}%`;

        // Build reason based on CVR improvement/decline
        const baseCvr = state.total_conversions / Math.max(1, state.total_clicks);
        let reason = '';
        if (newBidMicros > currentBid) {
          reason = `CVR improved to ${(sampledCvr * 100).toFixed(1)}%`;
        } else {
          reason = `Optimizing for ${(config.target_acos * 100).toFixed(0)}% target ACOS`;
        }

        const recommendation = {
          entity_type: state.entity_type,
          entity_id: state.entity_id,
          campaign_id: state.campaign_id,
          ad_group_id: state.ad_group_id,
          current_bid_micros: currentBid,
          new_bid_micros: newBidMicros,
          change_percent: bidChangePercent * 100,
          sampled_cvr: sampledCvr,
          expected_value_micros: expectedValue,
          confidence,
          confidence_level: confidenceLevel,
          ci_lower,
          ci_upper
        };

        results.recommendations.push(recommendation);

        if (!dry_run) {
          // Queue action for bid change with enriched payload
          const idempotencyKey = `bid_opt_${profile_id}_${state.entity_type}_${state.entity_id}_${new Date().toISOString().split('T')[0]}`;
          
          // Determine action type based on entity type
          const actionType = state.entity_type === 'adgroup' ? 'set_adgroup_bid' : 'set_bid';
          
          actions.push({
            profile_id,
            action_type: actionType,
            idempotency_key: idempotencyKey,
            status: 'queued',
            payload: {
              entity_type: state.entity_type,
              entity_id: state.entity_id,
              campaign_id: state.campaign_id,
              ad_group_id: state.ad_group_id,
              current_bid_micros: currentBid,
              new_bid_micros: newBidMicros,
              optimization_source: 'bayesian_thompson_sampling',
              confidence,
              confidence_level: confidenceLevel,
              // Enriched fields for display
              entity_name: entityName,
              reason: reason,
              bid_display: `$${currentBidDollars} → $${newBidDollars} (${changePercentFormatted})`,
              trigger_metrics: {
                sampled_cvr: sampledCvr * 100,
                confidence: confidence * 100,
                current_bid: parseFloat(currentBidDollars),
                new_bid: parseFloat(newBidDollars),
                change_percent: bidChangePercent * 100
              },
              estimated_impact: `${confidenceLevel} confidence bid optimization`
            },
            rule_id: null
          });
        }
      }
    }

    // Batch update bid states
    if (bidUpdates.length > 0) {
      for (const update of bidUpdates) {
        await supabase
          .from('bid_states')
          .update(update)
          .eq('id', update.id);
      }
    }

    // Batch insert actions
    if (actions.length > 0) {
      const { error: actionsError } = await supabase
        .from('action_queue')
        .upsert(actions, { onConflict: 'idempotency_key', ignoreDuplicates: true });

      if (actionsError) {
        console.error('Error queuing actions:', actionsError);
      } else {
        results.actions_queued = actions.length;
      }
    }

    // Update run record
    await supabase
      .from('bid_optimizer_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        entities_evaluated: results.entities_evaluated,
        entities_eligible: results.entities_eligible,
        bids_sampled: results.bids_sampled,
        bids_changed: results.bids_changed,
        actions_queued: results.actions_queued,
        summary: {
          avg_order_value_micros: avgOrderValue,
          dry_run,
          duration_ms: Date.now() - startTime
        }
      })
      .eq('id', run.id);

    console.log(`[Bayesian Optimizer] Completed in ${Date.now() - startTime}ms`, results);

    return new Response(
      JSON.stringify({ run_id: run.id, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Bayesian Optimizer] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
