import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import {
  isAutomationPaused,
  isEntityProtected,
  applyBidGuardrails,
  clearGovernanceCache,
} from '../_shared/governance-checker.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RuleParams {
  [key: string]: any;
}

interface AutomationRule {
  id: string;
  user_id: string;
  profile_id: string;
  name: string;
  rule_type: string;
  mode: 'dry_run' | 'suggestion' | 'auto';
  enabled: boolean;
  severity: 'info' | 'warn' | 'critical';
  params: RuleParams;
  action: any;
  throttle?: {
    cooldownHours?: number;
    maxActionsPerDay?: number;
  };
}

// Rule evaluators
class RuleEvaluator {
  constructor(private supabase: any) {}

  async evaluateBudgetDepletion(rule: AutomationRule): Promise<{alerts: any[], actions: any[]}> {
    const { percentThreshold = 80, beforeHourLocal = 16 } = rule.params;
    const alerts: any[] = [];
    const actions: any[] = [];

    console.log(`Evaluating budget depletion for profile ${rule.profile_id}`);

    // Query budget usage from fact table
    const today = new Date().toISOString().split('T')[0];
    const { data: budgetData, error } = await this.supabase
      .from('fact_budget_usage')
      .select('*')
      .eq('profile_id', rule.profile_id)
      .gte('minute', `${today}T00:00:00Z`)
      .order('minute', { ascending: false })
      .limit(100);

    if (error || !budgetData?.length) {
      console.log('No budget data found');
      return { alerts, actions };
    }

    // Group by campaign and find latest status
    const campaignBudgets = new Map();
    budgetData.forEach(row => {
      const key = row.campaign_id;
      if (!campaignBudgets.has(key) || new Date(row.minute) > new Date(campaignBudgets.get(key).minute)) {
        campaignBudgets.set(key, row);
      }
    });

    // Check for budget depletion
    for (const [campaignId, budgetRow] of campaignBudgets) {
      const usagePercent = budgetRow.budget_micros > 0 
        ? (budgetRow.spend_micros / budgetRow.budget_micros) * 100 
        : 0;

      if (usagePercent >= percentThreshold) {
        const alert = {
          rule_id: rule.id,
          profile_id: rule.profile_id,
          entity_type: 'campaign',
          entity_id: campaignId,
          level: 'critical',
          title: 'Budget Depletion Alert',
          message: `Campaign ${campaignId} has used ${usagePercent.toFixed(1)}% of daily budget`,
          data: { 
            usage_percent: usagePercent,
            spend_micros: budgetRow.spend_micros,
            budget_micros: budgetRow.budget_micros,
            threshold: percentThreshold
          }
        };
        alerts.push(alert);

        // Create action if in auto mode
        if (rule.mode === 'auto') {
          // Look up campaign name for enriched payload
          const { data: campaignData } = await this.supabase
            .from('campaigns')
            .select('name')
            .eq('amazon_campaign_id', campaignId)
            .single();

          const action = {
            rule_id: rule.id,
            profile_id: rule.profile_id,
            action_type: 'pause_campaign',
            payload: {
              campaign_id: campaignId,
              entity_name: campaignData?.name || `Campaign ${campaignId.slice(-6)}`,
              entity_type: 'campaign',
              reason: `Budget ${usagePercent.toFixed(0)}% depleted`,
              trigger_metrics: {
                usage_percent: usagePercent,
                spend: budgetRow.spend_micros / 1e6,
                budget: budgetRow.budget_micros / 1e6,
                threshold: percentThreshold
              },
              estimated_impact: `Paused to prevent overspend - budget was ${usagePercent.toFixed(0)}% used`
            },
            idempotency_key: this.generateIdempotencyKey(rule.profile_id, 'pause_campaign', campaignId)
          };
          actions.push(action);
        }
      }
    }

    return { alerts, actions };
  }

  async evaluateSpendSpike(rule: AutomationRule): Promise<{alerts: any[], actions: any[]}> {
    const { lookbackDays = 7, stdevMultiplier = 2.0, minSpend = 5.0 } = rule.params;
    const alerts: any[] = [];
    const actions: any[] = [];

    console.log(`Evaluating spend spike for profile ${rule.profile_id}`);

    // Get historical spend data from views
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (lookbackDays + 1) * 24 * 60 * 60 * 1000);
    
    const { data: spendData, error } = await this.supabase
      .from('v_campaign_daily')
      .select('date, campaign_id, campaign_name, cost_micros')
      .eq('profile_id', rule.profile_id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (error || !spendData?.length) {
      console.log('No spend data found');
      return { alerts, actions };
    }

    // Group by campaign and calculate stats
    const campaignSpend = new Map();
    spendData.forEach(row => {
      const key = row.campaign_id;
      if (!campaignSpend.has(key)) {
        campaignSpend.set(key, {
          name: row.campaign_name,
          dailySpends: [],
          todaySpend: 0
        });
      }
      
      const spendDollars = (row.cost_micros || 0) / 1e6;
      const isToday = row.date === endDate.toISOString().split('T')[0];
      
      if (isToday) {
        campaignSpend.get(key).todaySpend = spendDollars;
      } else {
        campaignSpend.get(key).dailySpends.push(spendDollars);
      }
    });

    // Check for spend spikes
    for (const [campaignId, data] of campaignSpend) {
      if (data.dailySpends.length < 3 || data.todaySpend < minSpend) continue;

      const mean = data.dailySpends.reduce((a: number, b: number) => a + b, 0) / data.dailySpends.length;
      const variance = data.dailySpends.reduce((acc: number, val: number) => acc + Math.pow(val - mean, 2), 0) / data.dailySpends.length;
      const stdev = Math.sqrt(variance);
      const threshold = mean + (stdevMultiplier * stdev);

      if (data.todaySpend > threshold) {
        const alert = {
          rule_id: rule.id,
          profile_id: rule.profile_id,
          entity_type: 'campaign',
          entity_id: campaignId,
          level: 'warn',
          title: 'Spend Spike Detected',
          message: `Campaign "${data.name}" spend is ${((data.todaySpend / mean - 1) * 100).toFixed(1)}% above baseline`,
          data: {
            today_spend: data.todaySpend,
            baseline_mean: mean,
            threshold: threshold,
            spike_multiplier: data.todaySpend / mean
          }
        };
        alerts.push(alert);
      }
    }

    return { alerts, actions };
  }

  async evaluateSearchTermHarvest(rule: AutomationRule): Promise<{alerts: any[], actions: any[]}> {
    const { windowDays = 14, minConvs = 2, maxAcos = 35, exactTo = "same_ad_group" } = rule.params;
    const alerts: any[] = [];
    const actions: any[] = [];

    console.log(`Evaluating search term harvest for profile ${rule.profile_id} (window: ${windowDays}d, minConvs: ${minConvs}, maxAcos: ${maxAcos}%)`);
    
    // Query search terms with good performance that are NOT already exact match keywords
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);

    const { data: harvestCandidates, error } = await this.supabase
      .from('fact_search_term_daily')
      .select('*')
      .eq('profile_id', rule.profile_id)
      .gte('date', startDate.toISOString().split('T')[0])
      .neq('match_type', 'EXACT');

    if (error) {
      console.error('Error fetching search terms for harvest:', error);
      return { alerts, actions };
    }

    if (!harvestCandidates?.length) {
      console.log('No search term candidates found for harvest');
      return { alerts, actions };
    }

    // Aggregate by search term
    const termAggregates = new Map<string, {
      search_term: string;
      campaign_id: string;
      ad_group_id: string;
      total_clicks: number;
      total_impressions: number;
      total_cost_micros: number;
      total_conversions: number;
      total_sales_micros: number;
    }>();

    for (const row of harvestCandidates) {
      const key = `${row.ad_group_id}:${row.search_term}`;
      const existing = termAggregates.get(key) || {
        search_term: row.search_term,
        campaign_id: row.campaign_id,
        ad_group_id: row.ad_group_id,
        total_clicks: 0,
        total_impressions: 0,
        total_cost_micros: 0,
        total_conversions: 0,
        total_sales_micros: 0
      };

      existing.total_clicks += row.clicks || 0;
      existing.total_impressions += row.impressions || 0;
      existing.total_cost_micros += row.cost_micros || 0;
      existing.total_conversions += (row.attributed_conversions_7d || 0);
      existing.total_sales_micros += row.attributed_sales_7d_micros || 0;
      termAggregates.set(key, existing);
    }

    // Filter for harvest candidates: minConvs and profitable ACoS
    for (const [key, agg] of termAggregates) {
      if (agg.total_conversions < minConvs) continue;
      
      const acos = agg.total_sales_micros > 0 
        ? (agg.total_cost_micros / agg.total_sales_micros) * 100 
        : 100;
      
      if (acos > maxAcos) continue;

      // This is a harvest candidate!
      const alert = {
        rule_id: rule.id,
        profile_id: rule.profile_id,
        entity_type: 'search_term',
        entity_id: key,
        level: 'info',
        title: 'Keyword Harvest Opportunity',
        message: `"${agg.search_term}" has ${agg.total_conversions} conversions at ${acos.toFixed(1)}% ACoS - recommend adding as exact match`,
        data: {
          search_term: agg.search_term,
          campaign_id: agg.campaign_id,
          ad_group_id: agg.ad_group_id,
          conversions: agg.total_conversions,
          acos: acos,
          sales: agg.total_sales_micros / 1e6,
          spend: agg.total_cost_micros / 1e6,
          clicks: agg.total_clicks
        }
      };
      alerts.push(alert);

      // Create action if in auto mode
      if (rule.mode === 'auto') {
        const cpc = agg.total_cost_micros / Math.max(agg.total_clicks, 1);
        const salesDollars = agg.total_sales_micros / 1e6;
        const spendDollars = agg.total_cost_micros / 1e6;
        
        const action = {
          rule_id: rule.id,
          profile_id: rule.profile_id,
          action_type: 'create_keyword',
          payload: {
            campaign_id: agg.campaign_id,
            ad_group_id: agg.ad_group_id,
            keyword_text: agg.search_term,
            entity_name: `"${agg.search_term}"`,
            entity_type: 'keyword',
            match_type: 'EXACT',
            bid_micros: Math.round(cpc),
            reason: `${agg.total_conversions} conversions at ${acos.toFixed(0)}% ACOS`,
            trigger_metrics: {
              conversions: agg.total_conversions,
              acos: acos,
              sales: salesDollars,
              spend: spendDollars,
              clicks: agg.total_clicks
            },
            estimated_impact: `Harvest winning term - $${salesDollars.toFixed(2)} in sales at ${acos.toFixed(0)}% ACOS`
          },
          idempotency_key: this.generateIdempotencyKey(rule.profile_id, 'create_keyword', `${agg.ad_group_id}:${agg.search_term}`)
        };
        actions.push(action);
      }
    }

    console.log(`Search term harvest: found ${alerts.length} candidates`);
    return { alerts, actions };
  }

  async evaluateSearchTermPrune(rule: AutomationRule): Promise<{alerts: any[], actions: any[]}> {
    const { windowDays = 14, minClicks = 20, minSpend = 10, maxConvs = 0, negateScope = "ad_group" } = rule.params;
    const alerts: any[] = [];
    const actions: any[] = [];

    console.log(`Evaluating search term prune for profile ${rule.profile_id} (window: ${windowDays}d, minClicks: ${minClicks}, minSpend: $${minSpend}, maxConvs: ${maxConvs})`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);

    const { data: pruneData, error } = await this.supabase
      .from('fact_search_term_daily')
      .select('*')
      .eq('profile_id', rule.profile_id)
      .gte('date', startDate.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching search terms for prune:', error);
      return { alerts, actions };
    }

    if (!pruneData?.length) {
      console.log('No search term data found for prune evaluation');
      return { alerts, actions };
    }

    // Aggregate by search term
    const termAggregates = new Map<string, {
      search_term: string;
      campaign_id: string;
      ad_group_id: string;
      total_clicks: number;
      total_cost_micros: number;
      total_conversions: number;
    }>();

    for (const row of pruneData) {
      const key = negateScope === 'campaign' 
        ? `${row.campaign_id}:${row.search_term}`
        : `${row.ad_group_id}:${row.search_term}`;
        
      const existing = termAggregates.get(key) || {
        search_term: row.search_term,
        campaign_id: row.campaign_id,
        ad_group_id: row.ad_group_id,
        total_clicks: 0,
        total_cost_micros: 0,
        total_conversions: 0
      };

      existing.total_clicks += row.clicks || 0;
      existing.total_cost_micros += row.cost_micros || 0;
      existing.total_conversions += (row.attributed_conversions_7d || 0);
      termAggregates.set(key, existing);
    }

    // Filter for prune candidates: high spend/clicks but no conversions
    const minSpendMicros = minSpend * 1e6;
    
    for (const [key, agg] of termAggregates) {
      const meetsClickThreshold = agg.total_clicks >= minClicks;
      const meetsSpendThreshold = agg.total_cost_micros >= minSpendMicros;
      const meetsConvThreshold = agg.total_conversions <= maxConvs;
      
      if (!meetsConvThreshold) continue;
      if (!meetsClickThreshold && !meetsSpendThreshold) continue;

      // This is a prune candidate!
      const spendDollars = agg.total_cost_micros / 1e6;
      const alert = {
        rule_id: rule.id,
        profile_id: rule.profile_id,
        entity_type: 'search_term',
        entity_id: key,
        level: 'warn',
        title: 'Negative Keyword Candidate',
        message: `"${agg.search_term}" has ${agg.total_clicks} clicks, $${spendDollars.toFixed(2)} spend, but only ${agg.total_conversions} conversions`,
        data: {
          search_term: agg.search_term,
          campaign_id: agg.campaign_id,
          ad_group_id: agg.ad_group_id,
          clicks: agg.total_clicks,
          spend: spendDollars,
          conversions: agg.total_conversions,
          negate_scope: negateScope
        }
      };
      alerts.push(alert);

      // Create action if in auto mode
      if (rule.mode === 'auto') {
        const action = {
          rule_id: rule.id,
          profile_id: rule.profile_id,
          action_type: negateScope === 'campaign' ? 'add_campaign_negative' : 'add_adgroup_negative',
          payload: {
            campaign_id: agg.campaign_id,
            ad_group_id: agg.ad_group_id,
            keyword_text: agg.search_term,
            entity_name: `"${agg.search_term}"`,
            entity_type: 'negative_keyword',
            match_type: 'NEGATIVE_EXACT',
            reason: `${agg.total_clicks} clicks, $${spendDollars.toFixed(2)} spent, ${agg.total_conversions} conversions`,
            trigger_metrics: {
              clicks: agg.total_clicks,
              spend: spendDollars,
              conversions: agg.total_conversions
            },
            estimated_impact: `Stop wasted spend - saved ~$${spendDollars.toFixed(2)} from non-converting traffic`
          },
          idempotency_key: this.generateIdempotencyKey(rule.profile_id, 'add_negative', key)
        };
        actions.push(action);
      }
    }

    console.log(`Search term prune: found ${alerts.length} candidates`);
    return { alerts, actions };
  }

  private generateIdempotencyKey(profileId: string, actionType: string, entityId: string): string {
    const data = `${profileId}:${actionType}:${entityId}:${new Date().toISOString().split('T')[0]}`;
    return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }
}

// Check user entitlements
async function checkEntitlements(supabase: any, userId: string, ruleType: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single();
  
  const plan = subscription?.plan || 'free';
  
  switch (plan) {
    case 'free':
      return ['budget_depletion', 'spend_spike'].includes(ruleType); // alerts only
    case 'starter':
      return ['budget_depletion', 'spend_spike', 'st_harvest', 'st_prune'].includes(ruleType);
    case 'pro':
      return true; // all rule types
    default:
      return false;
  }
}

// Check action throttling
async function checkThrottle(supabase: any, rule: AutomationRule): Promise<boolean> {
  if (!rule.throttle) return true;

  const { cooldownHours = 24, maxActionsPerDay = 100 } = rule.throttle;
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check daily action count
  const { data: todayActions } = await supabase
    .from('action_queue')
    .select('id')
    .eq('rule_id', rule.id)
    .gte('created_at', dayStart.toISOString());
  
  if (todayActions && todayActions.length >= maxActionsPerDay) {
    console.log(`Rule ${rule.id} exceeded daily action limit`);
    return false;
  }

  return true;
}

/**
 * Get entity type from action for governance checks
 */
function getEntityTypeFromAction(action: any): 'campaign' | 'ad_group' | 'keyword' | 'target' | null {
  const actionType = action.action_type;
  
  if (actionType.includes('campaign')) return 'campaign';
  if (actionType.includes('adgroup') || actionType.includes('ad_group')) return 'ad_group';
  if (actionType.includes('keyword') || actionType.includes('negative')) return 'keyword';
  if (actionType.includes('target') || action.payload?.target_id) return 'target';
  
  return null;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
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
    console.log(`Rules engine runner started - ${requestId}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const evaluator = new RuleEvaluator(supabase);
    
    // Get all enabled rules
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select(`
        *,
        user_id
      `)
      .eq('enabled', true);

    if (rulesError) {
      throw new Error(`Failed to fetch rules: ${rulesError.message}`);
    }

    console.log(`Found ${rules?.length || 0} enabled rules`);
    
    const results = {
      processed_rules: 0,
      total_alerts: 0,
      total_actions: 0,
      errors: []
    };

    for (const rule of rules || []) {
      try {
        // Clear governance cache for each rule
        clearGovernanceCache();
        
        // === GOVERNANCE CHECK: Kill Switch ===
        const pauseCheck = await isAutomationPaused(supabase, rule.profile_id);
        if (pauseCheck.paused) {
          console.log(`Rule ${rule.id} skipped - automation paused for profile: ${pauseCheck.reason}`);
          continue;
        }
        
        // Check entitlements
        const hasAccess = await checkEntitlements(supabase, rule.user_id, rule.rule_type);
        if (!hasAccess) {
          console.log(`User ${rule.user_id} lacks entitlement for rule type ${rule.rule_type}`);
          continue;
        }

        // Check throttling
        const canRun = await checkThrottle(supabase, rule);
        if (!canRun) {
          console.log(`Rule ${rule.id} throttled`);
          continue;
        }

        // Start rule run tracking
        const { data: runRecord } = await supabase
          .from('automation_rule_runs')
          .insert({
            rule_id: rule.id,
            profile_id: rule.profile_id,
            status: 'success'
          })
          .select()
          .single();

        let alerts: any[] = [];
        let actions: any[] = [];

        // Evaluate rule based on type
        switch (rule.rule_type) {
          case 'budget_depletion':
            ({ alerts, actions } = await evaluator.evaluateBudgetDepletion(rule));
            break;
          case 'spend_spike':
            ({ alerts, actions } = await evaluator.evaluateSpendSpike(rule));
            break;
          case 'st_harvest':
            ({ alerts, actions } = await evaluator.evaluateSearchTermHarvest(rule));
            break;
          case 'st_prune':
            ({ alerts, actions } = await evaluator.evaluateSearchTermPrune(rule));
            break;
          default:
            console.log(`Unknown rule type: ${rule.rule_type}`);
            continue;
        }

        // === GOVERNANCE: Filter actions for protected entities and apply bid guardrails ===
        const filteredActions: any[] = [];
        for (const action of actions) {
          // Determine entity type and ID
          const entityType = getEntityTypeFromAction(action);
          const entityId = action.payload?.campaign_id || action.payload?.ad_group_id || 
                          action.payload?.keyword_id || action.payload?.target_id;
          
          if (entityType && entityId) {
            const protectedCheck = await isEntityProtected(supabase, rule.profile_id, entityType, entityId);
            if (protectedCheck.protected) {
              console.log(`Action for ${entityType} ${entityId} skipped - protected: ${protectedCheck.reason}`);
              continue;
            }
          }
          
          // Apply bid guardrails if this is a bid action
          if (action.payload?.bid_micros) {
            const currentBid = action.payload.current_bid_micros || action.payload.bid_micros;
            const bidCheck = await applyBidGuardrails(
              supabase, 
              rule.profile_id, 
              currentBid, 
              action.payload.bid_micros
            );
            
            if (bidCheck.wasAdjusted) {
              action.payload.bid_micros = bidCheck.bidMicros;
              action.payload.governance_adjustment = bidCheck.reason;
              console.log(`Bid adjusted for action: ${bidCheck.reason}`);
            }
          }
          
          filteredActions.push(action);
        }

        // Insert alerts
        if (alerts.length > 0) {
          const { error: alertError } = await supabase
            .from('alerts')
            .insert(alerts);
          
          if (alertError) {
            console.error(`Failed to insert alerts for rule ${rule.id}:`, alertError);
          }
        }

        // Insert filtered actions (only if not dry_run)
        let actionCount = 0;
        if (filteredActions.length > 0 && rule.mode !== 'dry_run') {
          const { error: actionError } = await supabase
            .from('action_queue')
            .insert(filteredActions)
            .select();
          
          if (actionError) {
            console.error(`Failed to insert actions for rule ${rule.id}:`, actionError);
          } else {
            actionCount = filteredActions.length;
          }
        }

        // Update run record
        if (runRecord) {
          await supabase
            .from('automation_rule_runs')
            .update({
              finished_at: new Date().toISOString(),
              alerts_created: alerts.length,
              actions_enqueued: actionCount,
              evaluated: 1
            })
            .eq('id', runRecord.id);
        }

        results.processed_rules++;
        results.total_alerts += alerts.length;
        results.total_actions += actionCount;

        console.log(`Rule ${rule.id} processed: ${alerts.length} alerts, ${actionCount} actions`);

      } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
        results.errors.push({
          rule_id: rule.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Rules engine completed - ${requestId}:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        ...results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Rules engine error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Rules engine failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});