import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttributionRequest {
  profileId: string;
  model: 'last_click' | 'first_click' | 'position' | 'time_decay' | 'markov';
  params?: any;
  dateFrom: string;
  dateTo: string;
  level?: 'campaign' | 'ad_group' | 'target';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // GET /models - list available models
    if (req.method === 'GET' && path.endsWith('/models')) {
      const models = [
        {
          id: 'last_click',
          name: 'Last Click',
          description: 'Credit entire conversion to the last click touch',
          free: true
        },
        {
          id: 'first_click',
          name: 'First Click', 
          description: 'Credit entire conversion to the first click touch',
          free: true
        },
        {
          id: 'position',
          name: 'Position-Based',
          description: 'Weight first and last touches more heavily',
          free: false
        },
        {
          id: 'time_decay',
          name: 'Time Decay',
          description: 'Exponentially decay credit based on time to conversion',
          free: false
        },
        {
          id: 'markov',
          name: 'Markov Chain',
          description: 'Data-driven model based on removal effects',
          free: false,
          experimental: true
        }
      ];

      return new Response(JSON.stringify({ models }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /run - start attribution modeling
    if (req.method === 'POST' && path.endsWith('/run')) {
      const body: AttributionRequest = await req.json();
      
      console.log('Starting attribution run:', body);

      // Create attribution run record
      const { data: run, error: runError } = await supabase
        .from('attribution_runs')
        .insert({
          profile_id: body.profileId,
          model: body.model,
          params: body.params || {},
          date_from: body.dateFrom,
          date_to: body.dateTo,
          status: 'running'
        })
        .select()
        .single();

      if (runError) {
        throw new Error(`Failed to create run: ${runError.message}`);
      }

      try {
        // Get conversion paths for the date range
        const { data: paths, error: pathsError } = await supabase
          .from('conversion_paths_daily')
          .select('*')
          .eq('profile_id', body.profileId)
          .eq('source', 'v3')
          .gte('date', body.dateFrom)
          .lte('date', body.dateTo);

        if (pathsError) {
          throw new Error(`Failed to fetch paths: ${pathsError.message}`);
        }

        console.log(`Processing ${paths.length} conversion paths`);

        // Run attribution modeling
        const results = await runAttributionModel(body.model, paths || [], body.params);
        
        // Store results
        if (results.length > 0) {
          const { error: resultsError } = await supabase
            .from('attribution_results')
            .insert(results.map(r => ({
              run_id: run.id,
              profile_id: body.profileId,
              ...r
            })));

          if (resultsError) {
            throw new Error(`Failed to store results: ${resultsError.message}`);
          }
        }

        // Update run status
        await supabase
          .from('attribution_runs')
          .update({ status: 'success' })
          .eq('id', run.id);

        console.log(`Attribution run ${run.id} completed with ${results.length} results`);

        return new Response(JSON.stringify({ 
          runId: run.id, 
          status: 'success',
          resultsCount: results.length 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        // Update run with error
        await supabase
          .from('attribution_runs')
          .update({ 
            status: 'error',
            error: error.message 
          })
          .eq('id', run.id);

        throw error;
      }
    }

    // GET /summary - get attributed results
    if (req.method === 'GET' && path.endsWith('/summary')) {
      const profileId = url.searchParams.get('profileId');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const model = url.searchParams.get('model') || 'last_click';

      if (!profileId || !from || !to) {
        return new Response('Missing required parameters', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Get latest run for this model and date range
      const { data: run } = await supabase
        .from('attribution_runs')
        .select('id')
        .eq('profile_id', profileId)
        .eq('model', model)
        .eq('date_from', from)
        .eq('date_to', to)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!run) {
        return new Response(JSON.stringify({ 
          error: 'No attribution run found for these parameters' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get results
      const { data: results } = await supabase
        .from('attribution_results')
        .select('*')
        .eq('run_id', run.id);

      return new Response(JSON.stringify({ results: results || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /paths - get top conversion paths
    if (req.method === 'GET' && path.endsWith('/paths')) {
      const profileId = url.searchParams.get('profileId');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const source = url.searchParams.get('source') || 'v3';
      const limit = parseInt(url.searchParams.get('limit') || '25');

      if (!profileId || !from || !to) {
        return new Response('Missing required parameters', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const { data: paths } = await supabase
        .from('conversion_paths_daily')
        .select('*')
        .eq('profile_id', profileId)
        .eq('source', source)
        .gte('date', from)
        .lte('date', to)
        .order('conversions', { ascending: false })
        .limit(limit);

      // Aggregate by path_json
      const pathSummary = (paths || []).reduce((acc: any, path: any) => {
        const key = JSON.stringify(path.path_json);
        if (!acc[key]) {
          acc[key] = {
            path_json: path.path_json,
            touch_count: path.touch_count,
            conversions: 0,
            sales_micros: 0,
            clicks: 0,
            views: 0
          };
        }
        acc[key].conversions += path.conversions;
        acc[key].sales_micros += path.sales_micros;
        acc[key].clicks += path.clicks;
        acc[key].views += path.views;
        return acc;
      }, {});

      const topPaths = Object.values(pathSummary)
        .sort((a: any, b: any) => b.conversions - a.conversions)
        .slice(0, limit);

      return new Response(JSON.stringify({ paths: topPaths }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /time-lag - get time to conversion histogram
    if (req.method === 'GET' && path.endsWith('/time-lag')) {
      const profileId = url.searchParams.get('profileId');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const source = url.searchParams.get('source') || 'v3';

      if (!profileId || !from || !to) {
        return new Response('Missing required parameters', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const { data: timeLag } = await supabase
        .from('time_lag_daily')
        .select('*')
        .eq('profile_id', profileId)
        .eq('source', source)
        .gte('date', from)
        .lte('date', to);

      // Aggregate by bucket
      const lagSummary = (timeLag || []).reduce((acc: any, lag: any) => {
        if (!acc[lag.bucket]) {
          acc[lag.bucket] = { bucket: lag.bucket, conversions: 0, sales_micros: 0 };
        }
        acc[lag.bucket].conversions += lag.conversions;
        acc[lag.bucket].sales_micros += lag.sales_micros;
        return acc;
      }, {});

      const buckets = Object.values(lagSummary);

      return new Response(JSON.stringify({ buckets }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Attribution API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Attribution modeling functions
async function runAttributionModel(model: string, paths: any[], params: any = {}) {
  console.log(`Running ${model} attribution model on ${paths.length} paths`);
  
  const results: any[] = [];
  
  // For each path, extract entity touchpoints and attribute conversions/sales
  for (const pathData of paths) {
    const pathSteps = pathData.path_json;
    const conversions = pathData.conversions;
    const salesMicros = pathData.sales_micros;
    
    if (!pathSteps || pathSteps.length === 0) continue;
    
    let weights: number[] = [];
    
    switch (model) {
      case 'last_click':
        weights = getLastClickWeights(pathSteps);
        break;
      case 'first_click':
        weights = getFirstClickWeights(pathSteps);
        break;
      case 'position':
        weights = getPositionWeights(pathSteps, params);
        break;
      case 'time_decay':
        weights = getTimeDecayWeights(pathSteps, params);
        break;
      case 'markov':
        // For now, fallback to position-based
        weights = getPositionWeights(pathSteps, params);
        break;
      default:
        weights = getLastClickWeights(pathSteps);
    }
    
    // Apply weights to touchpoints
    pathSteps.forEach((step: any, index: number) => {
      if (weights[index] > 0) {
        const weightedConversions = conversions * weights[index];
        const weightedSales = salesMicros * weights[index];
        
        // Create results for campaign level
        if (step.campaign_id) {
          results.push({
            level: 'campaign',
            campaign_id: step.campaign_id,
            ad_group_id: '',
            target_id: '',
            conversions_weighted: weightedConversions,
            sales_weighted_micros: weightedSales
          });
        }
      }
    });
  }
  
  // Aggregate results by entity
  const aggregated = results.reduce((acc: any, result: any) => {
    const key = `${result.level}-${result.campaign_id}-${result.ad_group_id}-${result.target_id}`;
    if (!acc[key]) {
      acc[key] = { ...result };
    } else {
      acc[key].conversions_weighted += result.conversions_weighted;
      acc[key].sales_weighted_micros += result.sales_weighted_micros;
    }
    return acc;
  }, {});
  
  return Object.values(aggregated);
}

function getLastClickWeights(pathSteps: any[]): number[] {
  const weights = new Array(pathSteps.length).fill(0);
  
  // Find last click, fallback to last view
  let lastClickIndex = -1;
  let lastViewIndex = -1;
  
  for (let i = pathSteps.length - 1; i >= 0; i--) {
    if (pathSteps[i].interaction === 'click' && lastClickIndex === -1) {
      lastClickIndex = i;
    }
    if (lastViewIndex === -1) {
      lastViewIndex = i;
    }
  }
  
  if (lastClickIndex >= 0) {
    weights[lastClickIndex] = 1;
  } else if (lastViewIndex >= 0) {
    weights[lastViewIndex] = 1;
  }
  
  return weights;
}

function getFirstClickWeights(pathSteps: any[]): number[] {
  const weights = new Array(pathSteps.length).fill(0);
  
  // Find first click, fallback to first view
  let firstClickIndex = -1;
  let firstViewIndex = -1;
  
  for (let i = 0; i < pathSteps.length; i++) {
    if (pathSteps[i].interaction === 'click' && firstClickIndex === -1) {
      firstClickIndex = i;
      break;
    }
    if (firstViewIndex === -1) {
      firstViewIndex = i;
    }
  }
  
  if (firstClickIndex >= 0) {
    weights[firstClickIndex] = 1;
  } else if (firstViewIndex >= 0) {
    weights[firstViewIndex] = 1;
  }
  
  return weights;
}

function getPositionWeights(pathSteps: any[], params: any): number[] {
  const weights = new Array(pathSteps.length).fill(0);
  const firstWeight = params.firstWeight || 0.4;
  const lastWeight = params.lastWeight || 0.4;
  
  if (pathSteps.length === 1) {
    weights[0] = 1;
  } else if (pathSteps.length === 2) {
    weights[0] = firstWeight;
    weights[1] = lastWeight;
  } else {
    weights[0] = firstWeight;
    weights[pathSteps.length - 1] = lastWeight;
    
    const middleWeight = (1 - firstWeight - lastWeight) / (pathSteps.length - 2);
    for (let i = 1; i < pathSteps.length - 1; i++) {
      weights[i] = middleWeight;
    }
  }
  
  return weights;
}

function getTimeDecayWeights(pathSteps: any[], params: any): number[] {
  const weights = new Array(pathSteps.length).fill(0);
  const halfLife = params.halfLife || 7; // days
  
  // For v3 data, we don't have exact timestamps, so use position as proxy
  // In a real implementation, you'd use actual timestamp differences
  for (let i = 0; i < pathSteps.length; i++) {
    const daysFromConversion = (pathSteps.length - 1 - i) + 1;
    weights[i] = Math.pow(0.5, daysFromConversion / halfLife);
  }
  
  // Normalize weights to sum to 1
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < weights.length; i++) {
      weights[i] /= sum;
    }
  }
  
  return weights;
}