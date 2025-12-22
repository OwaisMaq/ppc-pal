/**
 * Outcome Collector Edge Function
 * Collects "after" metrics for applied actions to measure effectiveness
 * Runs daily to check for outcomes that need after-metrics captured
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutcomeRecord {
  id: string;
  action_id: string;
  profile_id: string;
  before_metrics: Record<string, number>;
  after_scheduled_at: string;
}

async function getEntityMetrics(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  entityType: string,
  entityId: string,
  lookbackDays: number = 7
): Promise<Record<string, number>> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  // Query performance data based on entity type
  let metrics: Record<string, number> = {};

  try {
    if (entityType === 'campaign') {
      const { data } = await supabase
        .from('campaigns')
        .select('spend, clicks, impressions, acos_7d, roas_7d, sales_7d, orders_7d')
        .eq('amazon_campaign_id', entityId)
        .eq('profile_id', profileId)
        .single();

      if (data) {
        metrics = {
          spend: data.spend || 0,
          clicks: data.clicks || 0,
          impressions: data.impressions || 0,
          acos: data.acos_7d || 0,
          roas: data.roas_7d || 0,
          sales: data.sales_7d || 0,
          orders: data.orders_7d || 0,
        };
      }
    } else if (entityType === 'keyword') {
      const { data } = await supabase
        .from('keywords')
        .select('spend, clicks, impressions, acos_7d, roas_7d, sales_7d, orders_7d')
        .eq('amazon_keyword_id', entityId)
        .eq('profile_id', profileId)
        .single();

      if (data) {
        metrics = {
          spend: data.spend || 0,
          clicks: data.clicks || 0,
          impressions: data.impressions || 0,
          acos: data.acos_7d || 0,
          roas: data.roas_7d || 0,
          sales: data.sales_7d || 0,
          orders: data.orders_7d || 0,
        };
      }
    } else if (entityType === 'target') {
      const { data } = await supabase
        .from('targets')
        .select('spend, clicks, impressions, acos_7d, roas_7d, sales_7d, orders_7d')
        .eq('amazon_target_id', entityId)
        .eq('profile_id', profileId)
        .single();

      if (data) {
        metrics = {
          spend: data.spend || 0,
          clicks: data.clicks || 0,
          impressions: data.impressions || 0,
          acos: data.acos_7d || 0,
          roas: data.roas_7d || 0,
          sales: data.sales_7d || 0,
          orders: data.orders_7d || 0,
        };
      }
    } else if (entityType === 'ad_group') {
      const { data } = await supabase
        .from('ad_groups')
        .select('spend, clicks, impressions, acos_7d, roas_7d, sales_7d, orders_7d')
        .eq('amazon_adgroup_id', entityId)
        .eq('profile_id', profileId)
        .single();

      if (data) {
        metrics = {
          spend: data.spend || 0,
          clicks: data.clicks || 0,
          impressions: data.impressions || 0,
          acos: data.acos_7d || 0,
          roas: data.roas_7d || 0,
          sales: data.sales_7d || 0,
          orders: data.orders_7d || 0,
        };
      }
    }
  } catch (error) {
    console.error(`[OutcomeCollector] Error fetching metrics for ${entityType} ${entityId}:`, error);
  }

  return metrics;
}

function calculateOutcome(
  before: Record<string, number>,
  after: Record<string, number>
): { delta: Record<string, number>; score: number; status: string } {
  const delta: Record<string, number> = {};
  
  // Calculate deltas
  for (const key of Object.keys(after)) {
    delta[key] = after[key] - (before[key] || 0);
  }

  // Calculate outcome score based on key metrics
  // Positive score = good outcome, Negative score = bad outcome
  let score = 0;
  let factors = 0;

  // ACOS decrease is good (lower is better)
  if (before.acos && after.acos) {
    const acosDelta = ((before.acos - after.acos) / before.acos) * 100;
    score += Math.min(Math.max(acosDelta / 10, -1), 1); // Normalize to -1 to 1
    factors++;
  }

  // ROAS increase is good (higher is better)
  if (before.roas && after.roas) {
    const roasDelta = ((after.roas - before.roas) / before.roas) * 100;
    score += Math.min(Math.max(roasDelta / 10, -1), 1);
    factors++;
  }

  // Sales increase with controlled spend is good
  if (before.sales !== undefined && after.sales !== undefined) {
    if (before.spend && after.spend && before.sales > 0) {
      const efficiencyBefore = before.sales / before.spend;
      const efficiencyAfter = after.sales / (after.spend || 1);
      const efficiencyDelta = ((efficiencyAfter - efficiencyBefore) / efficiencyBefore) * 100;
      score += Math.min(Math.max(efficiencyDelta / 10, -1), 1);
      factors++;
    }
  }

  // Normalize score
  const finalScore = factors > 0 ? score / factors : 0;

  // Determine status
  let status: string;
  if (factors === 0) {
    status = 'inconclusive';
  } else if (finalScore >= 0.2) {
    status = 'positive';
  } else if (finalScore <= -0.2) {
    status = 'negative';
  } else {
    status = 'neutral';
  }

  return { delta, score: Math.round(finalScore * 100) / 100, status };
}

function getEntityFromPayload(payload: Record<string, unknown>): { type: string; id: string } | null {
  if (payload.campaign_id) {
    return { type: 'campaign', id: payload.campaign_id as string };
  }
  if (payload.keyword_id) {
    return { type: 'keyword', id: payload.keyword_id as string };
  }
  if (payload.target_id) {
    return { type: 'target', id: payload.target_id as string };
  }
  if (payload.ad_group_id) {
    return { type: 'ad_group', id: payload.ad_group_id as string };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase configuration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[OutcomeCollector] Starting outcome collection');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find outcomes that are due for after-metrics collection
    const now = new Date().toISOString();
    const { data: pendingOutcomes, error: fetchError } = await supabase
      .from('action_outcomes')
      .select(`
        id,
        action_id,
        profile_id,
        before_metrics,
        after_scheduled_at,
        action_queue!action_outcomes_action_id_fkey (
          action_type,
          payload,
          reverted_at
        )
      `)
      .eq('outcome_status', 'pending')
      .is('after_captured_at', null)
      .lte('after_scheduled_at', now)
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch pending outcomes: ${fetchError.message}`);
    }

    console.log(`[OutcomeCollector] Found ${pendingOutcomes?.length || 0} outcomes to process`);

    const results = {
      processed: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      inconclusive: 0,
      errors: 0,
    };

    for (const outcome of pendingOutcomes || []) {
      try {
        const action = (outcome as any).action_queue;
        
        // Skip if action was reverted
        if (action?.reverted_at) {
          await supabase
            .from('action_outcomes')
            .update({
              outcome_status: 'inconclusive',
              after_captured_at: now,
              after_metrics: {},
              metric_delta: {},
            })
            .eq('id', outcome.id);
          
          results.inconclusive++;
          results.processed++;
          continue;
        }

        // Get entity from payload
        const entity = getEntityFromPayload(action?.payload || {});
        
        if (!entity) {
          console.log(`[OutcomeCollector] No entity found for outcome ${outcome.id}`);
          results.inconclusive++;
          results.processed++;
          continue;
        }

        // Fetch current metrics
        const afterMetrics = await getEntityMetrics(
          supabase,
          outcome.profile_id,
          entity.type,
          entity.id
        );

        // Calculate outcome
        const { delta, score, status } = calculateOutcome(
          outcome.before_metrics as Record<string, number>,
          afterMetrics
        );

        // Update outcome record
        await supabase
          .from('action_outcomes')
          .update({
            after_metrics: afterMetrics,
            after_captured_at: now,
            metric_delta: delta,
            outcome_score: score,
            outcome_status: status,
          })
          .eq('id', outcome.id);

        results[status as keyof typeof results]++;
        results.processed++;

        console.log(`[OutcomeCollector] Outcome ${outcome.id}: ${status} (score: ${score})`);

      } catch (error) {
        console.error(`[OutcomeCollector] Error processing outcome ${outcome.id}:`, error);
        results.errors++;
      }
    }

    console.log('[OutcomeCollector] Completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OutcomeCollector] Error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Outcome collection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
