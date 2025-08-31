import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
          const action = {
            rule_id: rule.id,
            profile_id: rule.profile_id,
            action_type: 'pause_campaign',
            payload: {
              campaign_id: campaignId,
              reason: 'budget_depletion',
              usage_percent: usagePercent
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
    const { windowDays = 14, minConvs = 2, maxAcos = 0.35, exactTo = "same_ad_group" } = rule.params;
    const alerts: any[] = [];
    const actions: any[] = [];

    console.log(`Evaluating search term harvest for profile ${rule.profile_id}`);
    
    // Note: This would require search term data which we don't have in our current schema
    // For now, return empty results with a placeholder alert
    const alert = {
      rule_id: rule.id,
      profile_id: rule.profile_id,
      entity_type: 'search_term',
      entity_id: 'placeholder',
      level: 'info',
      title: 'Search Term Harvest Check',
      message: 'Search term data not available - requires AMS search term reports',
      data: { note: 'Feature pending search term data integration' }
    };
    alerts.push(alert);

    return { alerts, actions };
  }

  async evaluateSearchTermPrune(rule: AutomationRule): Promise<{alerts: any[], actions: any[]}> {
    const { windowDays = 14, minClicks = 20, maxConvs = 0, negateScope = "ad_group" } = rule.params;
    const alerts: any[] = [];
    const actions: any[] = [];

    console.log(`Evaluating search term prune for profile ${rule.profile_id}`);

    // Placeholder - would need search term data
    const alert = {
      rule_id: rule.id,
      profile_id: rule.profile_id,
      entity_type: 'search_term',
      entity_id: 'placeholder',
      level: 'info',
      title: 'Search Term Prune Check',
      message: 'Search term data not available - requires AMS search term reports',
      data: { note: 'Feature pending search term data integration' }
    };
    alerts.push(alert);

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

        // Insert alerts
        if (alerts.length > 0) {
          const { error: alertError } = await supabase
            .from('alerts')
            .insert(alerts);
          
          if (alertError) {
            console.error(`Failed to insert alerts for rule ${rule.id}:`, alertError);
          }
        }

        // Insert actions (only if not dry_run)
        let actionCount = 0;
        if (actions.length > 0 && rule.mode !== 'dry_run') {
          const { error: actionError } = await supabase
            .from('action_queue')
            .insert(actions)
            .select();
          
          if (actionError) {
            console.error(`Failed to insert actions for rule ${rule.id}:`, actionError);
          } else {
            actionCount = actions.length;
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