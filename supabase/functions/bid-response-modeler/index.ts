import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// BID RESPONSE MODELER
// =====================================================
// Fits sigmoid and log-linear curves to bid-impression data
// Identifies optimal bid points and saturation levels

interface DataPoint {
  bid_micros: number;
  impressions: number;
}

interface ModelResult {
  model_type: 'sigmoid' | 'log_linear' | 'linear';
  params: Record<string, number>;
  r_squared: number;
  rmse: number;
  optimal_bid_micros: number;
  saturation_bid_micros: number;
  knee_bid_micros: number;
}

// =====================================================
// Curve Fitting Functions
// =====================================================

// Sigmoid: impressions = L / (1 + e^(-k(bid - x0)))
function fitSigmoid(data: DataPoint[]): ModelResult | null {
  if (data.length < 5) return null;

  // Initial parameter estimates
  const maxImp = Math.max(...data.map(d => d.impressions));
  const minImp = Math.min(...data.map(d => d.impressions));
  const midImp = (maxImp + minImp) / 2;
  
  // Find bid at midpoint
  const sortedData = [...data].sort((a, b) => a.impressions - b.impressions);
  const midIndex = Math.floor(sortedData.length / 2);
  const x0_init = sortedData[midIndex].bid_micros;
  
  let L = maxImp * 1.1;  // Saturation level
  let k = 0.000001;      // Growth rate
  let x0 = x0_init;      // Midpoint

  // Gradient descent optimization
  const learningRate = 0.0001;
  const iterations = 1000;

  for (let iter = 0; iter < iterations; iter++) {
    let dL = 0, dk = 0, dx0 = 0;
    let totalError = 0;

    for (const point of data) {
      const x = point.bid_micros;
      const y = point.impressions;
      
      const exp_term = Math.exp(-k * (x - x0));
      const pred = L / (1 + exp_term);
      const error = pred - y;
      totalError += error * error;

      // Gradients
      dL += error / (1 + exp_term);
      dk += error * L * (x - x0) * exp_term / Math.pow(1 + exp_term, 2);
      dx0 += error * L * k * exp_term / Math.pow(1 + exp_term, 2);
    }

    L -= learningRate * dL;
    k -= learningRate * 0.00001 * dk;
    x0 -= learningRate * dx0;

    // Clamp parameters
    L = Math.max(maxImp, L);
    k = Math.max(0.0000001, k);
  }

  // Calculate R² and RMSE
  const predictions = data.map(d => L / (1 + Math.exp(-k * (d.bid_micros - x0))));
  const meanY = data.reduce((sum, d) => sum + d.impressions, 0) / data.length;
  
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < data.length; i++) {
    ssRes += Math.pow(data[i].impressions - predictions[i], 2);
    ssTot += Math.pow(data[i].impressions - meanY, 2);
  }

  const r_squared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const rmse = Math.sqrt(ssRes / data.length);

  // Find optimal and saturation points
  // Saturation: where additional bid increase yields <5% more impressions
  let saturation_bid = x0;
  for (let bid = x0; bid < x0 + 10000000; bid += 100000) {
    const imp1 = L / (1 + Math.exp(-k * (bid - x0)));
    const imp2 = L / (1 + Math.exp(-k * (bid + 100000 - x0)));
    if ((imp2 - imp1) / imp1 < 0.01) {
      saturation_bid = bid;
      break;
    }
  }

  // Knee: point of maximum curvature (inflection point is x0 for sigmoid)
  const knee_bid = x0;

  // Optimal: balance between impressions and cost (max impressions/bid)
  let optimal_bid = data[0].bid_micros;
  let maxEfficiency = 0;
  for (const point of data) {
    const efficiency = point.impressions / point.bid_micros;
    if (efficiency > maxEfficiency) {
      maxEfficiency = efficiency;
      optimal_bid = point.bid_micros;
    }
  }

  return {
    model_type: 'sigmoid',
    params: { L, k, x0 },
    r_squared: Math.max(0, r_squared),
    rmse,
    optimal_bid_micros: optimal_bid,
    saturation_bid_micros: saturation_bid,
    knee_bid_micros: knee_bid
  };
}

// Log-linear: impressions = a * log(bid) + b
function fitLogLinear(data: DataPoint[]): ModelResult | null {
  if (data.length < 3) return null;

  // Transform to log space and use linear regression
  const logData = data.map(d => ({
    x: Math.log(d.bid_micros),
    y: d.impressions
  }));

  const n = logData.length;
  const sumX = logData.reduce((sum, d) => sum + d.x, 0);
  const sumY = logData.reduce((sum, d) => sum + d.y, 0);
  const sumXY = logData.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumX2 = logData.reduce((sum, d) => sum + d.x * d.x, 0);

  const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - a * sumX) / n;

  // Calculate R² and RMSE
  const predictions = data.map(d => a * Math.log(d.bid_micros) + b);
  const meanY = sumY / n;

  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < data.length; i++) {
    ssRes += Math.pow(data[i].impressions - predictions[i], 2);
    ssTot += Math.pow(data[i].impressions - meanY, 2);
  }

  const r_squared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const rmse = Math.sqrt(ssRes / data.length);

  // For log-linear, there's no true saturation
  const maxBid = Math.max(...data.map(d => d.bid_micros));
  
  // Optimal: where marginal impressions per bid is maximized
  // d(impressions)/d(bid) = a/bid, so efficiency decreases with bid
  // Optimal is the minimum viable bid
  const optimal_bid = Math.min(...data.map(d => d.bid_micros));

  return {
    model_type: 'log_linear',
    params: { a, b },
    r_squared: Math.max(0, r_squared),
    rmse,
    optimal_bid_micros: optimal_bid,
    saturation_bid_micros: maxBid * 2,
    knee_bid_micros: optimal_bid
  };
}

// Linear: impressions = m * bid + c
function fitLinear(data: DataPoint[]): ModelResult | null {
  if (data.length < 2) return null;

  const n = data.length;
  const sumX = data.reduce((sum, d) => sum + d.bid_micros, 0);
  const sumY = data.reduce((sum, d) => sum + d.impressions, 0);
  const sumXY = data.reduce((sum, d) => sum + d.bid_micros * d.impressions, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.bid_micros * d.bid_micros, 0);

  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const c = (sumY - m * sumX) / n;

  // Calculate R² and RMSE
  const predictions = data.map(d => m * d.bid_micros + c);
  const meanY = sumY / n;

  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < data.length; i++) {
    ssRes += Math.pow(data[i].impressions - predictions[i], 2);
    ssTot += Math.pow(data[i].impressions - meanY, 2);
  }

  const r_squared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const rmse = Math.sqrt(ssRes / data.length);

  const maxBid = Math.max(...data.map(d => d.bid_micros));
  const minBid = Math.min(...data.map(d => d.bid_micros));

  return {
    model_type: 'linear',
    params: { m, c },
    r_squared: Math.max(0, r_squared),
    rmse,
    optimal_bid_micros: minBid,
    saturation_bid_micros: maxBid * 2,
    knee_bid_micros: (maxBid + minBid) / 2
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
    const { profile_id, lookback_days = 30 } = body;

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Bid Response Modeler] Starting for profile ${profile_id}`);

    // Fetch historical bid observations
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - lookback_days);

    const { data: observations, error: obsError } = await supabase
      .from('bid_observations')
      .select('entity_type, entity_id, bid_at_time_micros, impressions')
      .eq('profile_id', profile_id)
      .gte('date', fromDate.toISOString().split('T')[0])
      .not('bid_at_time_micros', 'is', null);

    if (obsError) {
      console.error('Error fetching observations:', obsError);
      throw obsError;
    }

    if (!observations || observations.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No bid observations found',
          models_fitted: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by entity
    const entityData = new Map<string, DataPoint[]>();
    for (const obs of observations) {
      const key = `${obs.entity_type}:${obs.entity_id}`;
      if (!entityData.has(key)) {
        entityData.set(key, []);
      }
      entityData.get(key)!.push({
        bid_micros: obs.bid_at_time_micros!,
        impressions: obs.impressions
      });
    }

    console.log(`[Bid Response Modeler] Processing ${entityData.size} entities`);

    let modelsFitted = 0;
    const results: any[] = [];

    for (const [key, data] of entityData) {
      const [entity_type, entity_id] = key.split(':');
      
      if (data.length < 5) continue;

      // Fit all models and pick the best
      const sigmoidResult = fitSigmoid(data);
      const logLinearResult = fitLogLinear(data);
      const linearResult = fitLinear(data);

      const models = [sigmoidResult, logLinearResult, linearResult].filter(m => m !== null) as ModelResult[];
      if (models.length === 0) continue;

      // Select best model by R²
      const bestModel = models.reduce((best, current) => 
        current.r_squared > best.r_squared ? current : best
      );

      // Upsert the model
      const { error: upsertError } = await supabase
        .from('bid_response_models')
        .upsert({
          profile_id,
          entity_type,
          entity_id,
          model_type: bestModel.model_type,
          params: bestModel.params,
          r_squared: bestModel.r_squared,
          rmse: bestModel.rmse,
          samples_used: data.length,
          optimal_bid_micros: bestModel.optimal_bid_micros,
          saturation_bid_micros: bestModel.saturation_bid_micros,
          knee_bid_micros: bestModel.knee_bid_micros,
          last_fitted_at: new Date().toISOString()
        }, {
          onConflict: 'profile_id,entity_type,entity_id'
        });

      if (!upsertError) {
        modelsFitted++;
        results.push({
          entity_type,
          entity_id,
          model_type: bestModel.model_type,
          r_squared: bestModel.r_squared,
          data_points: data.length
        });
      }
    }

    console.log(`[Bid Response Modeler] Completed in ${Date.now() - startTime}ms, fitted ${modelsFitted} models`);

    return new Response(
      JSON.stringify({
        models_fitted: modelsFitted,
        duration_ms: Date.now() - startTime,
        results: results.slice(0, 50) // Return sample
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Bid Response Modeler] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
