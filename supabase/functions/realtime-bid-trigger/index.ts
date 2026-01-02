import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiter (per entity, max once per hour)
const lastOptimized = new Map<string, number>();
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

interface TriggerPayload {
  profile_id: string;
  entity_type: 'keyword' | 'target';
  entity_id: string;
  impressions?: number;
  clicks?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: TriggerPayload = await req.json();
    const { profile_id, entity_type, entity_id, impressions, clicks } = body;

    if (!profile_id || !entity_type || !entity_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const cacheKey = `${profile_id}_${entity_type}_${entity_id}`;
    const lastRun = lastOptimized.get(cacheKey);
    const now = Date.now();

    if (lastRun && now - lastRun < RATE_LIMIT_MS) {
      console.log(`[Realtime Bid] Rate limited: ${cacheKey}, last run ${Math.round((now - lastRun) / 1000)}s ago`);
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: 'rate_limited',
          next_allowed_in_seconds: Math.round((RATE_LIMIT_MS - (now - lastRun)) / 1000)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if entity has enough data for optimization
    const { data: bidState, error: stateError } = await supabase
      .from('bid_states')
      .select('*')
      .eq('profile_id', profile_id)
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .eq('optimization_enabled', true)
      .single();

    if (stateError || !bidState) {
      console.log(`[Realtime Bid] No eligible bid state found for ${entity_type} ${entity_id}`);
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: 'no_bid_state_or_disabled'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check minimum thresholds
    const MIN_OBSERVATIONS = 7;
    const MIN_IMPRESSIONS = 100;

    if (bidState.observations_count < MIN_OBSERVATIONS || bidState.total_impressions < MIN_IMPRESSIONS) {
      console.log(`[Realtime Bid] Insufficient data for ${entity_type} ${entity_id}: obs=${bidState.observations_count}, impr=${bidState.total_impressions}`);
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: 'insufficient_data',
          current_observations: bidState.observations_count,
          current_impressions: bidState.total_impressions
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the Bayesian optimizer for just this entity
    console.log(`[Realtime Bid] Triggering optimization for ${entity_type} ${entity_id}`);
    
    const optimizerResponse = await supabase.functions.invoke('bayesian-bid-optimizer', {
      body: {
        profile_id,
        single_entity: {
          entity_type,
          entity_id
        },
        dry_run: false
      }
    });

    if (optimizerResponse.error) {
      console.error('[Realtime Bid] Optimizer error:', optimizerResponse.error);
      return new Response(
        JSON.stringify({ error: 'Optimizer failed', details: optimizerResponse.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update rate limit cache
    lastOptimized.set(cacheKey, now);

    // Clean up old entries periodically
    if (lastOptimized.size > 10000) {
      const cutoff = now - RATE_LIMIT_MS;
      for (const [key, time] of lastOptimized.entries()) {
        if (time < cutoff) {
          lastOptimized.delete(key);
        }
      }
    }

    console.log(`[Realtime Bid] Optimization complete for ${entity_type} ${entity_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        entity_type,
        entity_id,
        optimizer_result: optimizerResponse.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Realtime Bid] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
