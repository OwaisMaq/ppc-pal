import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// BID OBSERVATION COLLECTOR
// =====================================================
// Collects daily observations for Bayesian bid optimization
// Updates bid_observations and bid_states tables

interface KeywordMetrics {
  keyword_id: string;
  campaign_id: string;
  ad_group_id: string;
  bid_micros: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_micros: number;
  sales_micros: number;
}

interface TargetMetrics {
  target_id: string;
  campaign_id: string;
  ad_group_id: string;
  bid_micros: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_micros: number;
  sales_micros: number;
}

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
    const { profile_id, date } = body;

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default to yesterday if no date provided
    const observationDate = date || new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    console.log(`[Bid Observation Collector] Collecting for profile ${profile_id}, date ${observationDate}`);

    // Fetch keyword performance from keywords table
    const { data: keywords, error: kwError } = await supabase
      .from('keywords')
      .select('id, keyword_id, campaign_id, ad_group_id, bid, impressions, clicks, orders, spend, sales')
      .eq('profile_id', profile_id);

    if (kwError) {
      console.error('Error fetching keywords:', kwError);
      throw kwError;
    }

    // Fetch target performance from targets table
    const { data: targets, error: tgtError } = await supabase
      .from('targets')
      .select('id, target_id, campaign_id, ad_group_id, bid, impressions, clicks, orders, spend, sales')
      .eq('profile_id', profile_id);

    if (tgtError) {
      console.error('Error fetching targets:', tgtError);
      throw tgtError;
    }

    const observations: any[] = [];
    const stateUpdates: any[] = [];

    // Process keywords
    for (const kw of keywords || []) {
      const entityId = kw.keyword_id || kw.id;
      
      // Create observation
      observations.push({
        profile_id,
        entity_type: 'keyword',
        entity_id: entityId,
        date: observationDate,
        bid_at_time_micros: Math.round((kw.bid || 0) * 1000000),
        impressions: kw.impressions || 0,
        clicks: kw.clicks || 0,
        conversions: kw.orders || 0,
        spend_micros: Math.round((kw.spend || 0) * 1000000),
        sales_micros: Math.round((kw.sales || 0) * 1000000),
        reward: kw.clicks > 0 ? (kw.orders || 0) / kw.clicks : 0,
        reward_type: 'conversion_rate'
      });

      // Prepare state update
      stateUpdates.push({
        profile_id,
        entity_type: 'keyword',
        entity_id: entityId,
        campaign_id: kw.campaign_id,
        ad_group_id: kw.ad_group_id,
        current_bid_micros: Math.round((kw.bid || 0) * 1000000),
        // Will be updated with aggregates after upsert
        impressions: kw.impressions || 0,
        clicks: kw.clicks || 0,
        conversions: kw.orders || 0,
        spend_micros: Math.round((kw.spend || 0) * 1000000),
        sales_micros: Math.round((kw.sales || 0) * 1000000)
      });
    }

    // Process targets
    for (const tgt of targets || []) {
      const entityId = tgt.target_id || tgt.id;
      
      observations.push({
        profile_id,
        entity_type: 'target',
        entity_id: entityId,
        date: observationDate,
        bid_at_time_micros: Math.round((tgt.bid || 0) * 1000000),
        impressions: tgt.impressions || 0,
        clicks: tgt.clicks || 0,
        conversions: tgt.orders || 0,
        spend_micros: Math.round((tgt.spend || 0) * 1000000),
        sales_micros: Math.round((tgt.sales || 0) * 1000000),
        reward: tgt.clicks > 0 ? (tgt.orders || 0) / tgt.clicks : 0,
        reward_type: 'conversion_rate'
      });

      stateUpdates.push({
        profile_id,
        entity_type: 'target',
        entity_id: entityId,
        campaign_id: tgt.campaign_id,
        ad_group_id: tgt.ad_group_id,
        current_bid_micros: Math.round((tgt.bid || 0) * 1000000),
        impressions: tgt.impressions || 0,
        clicks: tgt.clicks || 0,
        conversions: tgt.orders || 0,
        spend_micros: Math.round((tgt.spend || 0) * 1000000),
        sales_micros: Math.round((tgt.sales || 0) * 1000000)
      });
    }

    // Upsert observations
    let observationsInserted = 0;
    if (observations.length > 0) {
      const { error: obsError } = await supabase
        .from('bid_observations')
        .upsert(observations, {
          onConflict: 'profile_id,entity_type,entity_id,date,attribution_window'
        });

      if (obsError) {
        console.error('Error inserting observations:', obsError);
      } else {
        observationsInserted = observations.length;
      }
    }

    // Update bid states with Bayesian updates
    let statesUpdated = 0;
    for (const state of stateUpdates) {
      // Fetch existing state
      const { data: existing } = await supabase
        .from('bid_states')
        .select('*')
        .eq('profile_id', state.profile_id)
        .eq('entity_type', state.entity_type)
        .eq('entity_id', state.entity_id)
        .single();

      if (existing) {
        // Bayesian update: add today's observations to posterior
        // alpha += conversions, beta += clicks - conversions
        const newAlpha = existing.alpha + state.conversions;
        const newBeta = existing.beta + Math.max(0, state.clicks - state.conversions);
        
        const { error: updateError } = await supabase
          .from('bid_states')
          .update({
            alpha: newAlpha,
            beta: newBeta,
            current_bid_micros: state.current_bid_micros,
            observations_count: existing.observations_count + 1,
            total_conversions: existing.total_conversions + state.conversions,
            total_clicks: existing.total_clicks + state.clicks,
            total_impressions: existing.total_impressions + state.impressions,
            total_spend_micros: existing.total_spend_micros + state.spend_micros,
            total_sales_micros: existing.total_sales_micros + state.sales_micros,
            last_observation_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (!updateError) statesUpdated++;
      } else {
        // Create new state with initial priors
        // Using Jeffrey's prior: alpha = 0.5, beta = 0.5
        const { error: insertError } = await supabase
          .from('bid_states')
          .insert({
            profile_id: state.profile_id,
            entity_type: state.entity_type,
            entity_id: state.entity_id,
            campaign_id: state.campaign_id,
            ad_group_id: state.ad_group_id,
            alpha: 0.5 + state.conversions,
            beta: 0.5 + Math.max(0, state.clicks - state.conversions),
            prior_alpha: 0.5,
            prior_beta: 0.5,
            current_bid_micros: state.current_bid_micros,
            observations_count: 1,
            total_conversions: state.conversions,
            total_clicks: state.clicks,
            total_impressions: state.impressions,
            total_spend_micros: state.spend_micros,
            total_sales_micros: state.sales_micros,
            last_observation_at: new Date().toISOString()
          });

        if (!insertError) statesUpdated++;
      }
    }

    console.log(`[Bid Observation Collector] Completed in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        date: observationDate,
        observations_inserted: observationsInserted,
        states_updated: statesUpdated,
        keywords_processed: keywords?.length || 0,
        targets_processed: targets?.length || 0,
        duration_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Bid Observation Collector] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
