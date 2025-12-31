import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default rule templates
const DEFAULT_RULES = {
  budget_depletion: {
    name: 'Budget Depletion Alert',
    rule_type: 'budget_depletion',
    severity: 'critical',
    params: {
      percentThreshold: 80,
      beforeHourLocal: 16
    },
    action: {
      type: 'alert_only'
    },
    throttle: {
      cooldownHours: 24,
      maxActionsPerDay: 5
    }
  },
  spend_spike: {
    name: 'Spend Spike Detection',
    rule_type: 'spend_spike',
    severity: 'warn',
    params: {
      lookbackDays: 7,
      stdevMultiplier: 2.0,
      minSpend: 5.0
    },
    action: {
      type: 'alert_only'
    },
    throttle: {
      cooldownHours: 12,
      maxActionsPerDay: 10
    }
  },
  st_harvest: {
    name: 'Search Term Harvest',
    rule_type: 'st_harvest',
    severity: 'info',
    params: {
      windowDays: 14,
      minConvs: 2,
      maxAcos: 0.35,
      exactTo: 'same_ad_group'
    },
    action: {
      type: 'create_keyword',
      negateSource: true
    },
    throttle: {
      cooldownHours: 48,
      maxActionsPerDay: 50
    }
  },
  st_prune: {
    name: 'Search Term Pruning',
    rule_type: 'st_prune',
    severity: 'info',
    params: {
      windowDays: 14,
      minClicks: 20,
      maxConvs: 0,
      negateScope: 'ad_group'
    },
    action: {
      type: 'negative_keyword'
    },
    throttle: {
      cooldownHours: 72,
      maxActionsPerDay: 100
    }
  }
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase configuration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader && req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let user = null;
    if (authHeader) {
      // Create a client with the user's JWT for auth verification
      const token = authHeader.replace('Bearer ', '');
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Auth error:', authError?.message);
        return new Response(
          JSON.stringify({ error: 'Invalid authorization' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = authUser;
    }

    switch (path) {
      case 'rules': {
        if (req.method === 'GET') {
          const profileId = url.searchParams.get('profileId');
          
          let query = supabase
            .from('automation_rules')
            .select(`
              *,
              automation_rule_runs(
                id,
                started_at,
                finished_at,
                status,
                alerts_created,
                actions_enqueued,
                error
              )
            `)
            .order('created_at', { ascending: false });
          
          if (user) {
            query = query.eq('user_id', user.id);
          }
          
          if (profileId) {
            query = query.eq('profile_id', profileId);
          }

          const { data: rules, error } = await query;
          
          if (error) throw error;
          
          return new Response(
            JSON.stringify({ rules }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (req.method === 'POST' && user) {
          const body = await req.json();
          const { profile_id, rule_type, name, params, action, mode = 'dry_run' } = body;
          
          if (!profile_id || !rule_type) {
            return new Response(
              JSON.stringify({ error: 'Missing required fields' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { data: rule, error } = await supabase
            .from('automation_rules')
            .insert({
              user_id: user.id,
              profile_id,
              name: name || DEFAULT_RULES[rule_type as keyof typeof DEFAULT_RULES]?.name || 'Custom Rule',
              rule_type,
              mode,
              params: params || DEFAULT_RULES[rule_type as keyof typeof DEFAULT_RULES]?.params || {},
              action: action || DEFAULT_RULES[rule_type as keyof typeof DEFAULT_RULES]?.action || {},
              throttle: DEFAULT_RULES[rule_type as keyof typeof DEFAULT_RULES]?.throttle
            })
            .select()
            .single();
          
          if (error) throw error;
          
          return new Response(
            JSON.stringify({ rule }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }

      case 'toggle': {
        if (req.method === 'POST' && user) {
          const { rule_id, enabled } = await req.json();
          
          const { data: rule, error } = await supabase
            .from('automation_rules')
            .update({ enabled })
            .eq('id', rule_id)
            .eq('user_id', user.id)
            .select()
            .single();
          
          if (error) throw error;
          
          return new Response(
            JSON.stringify({ rule }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }

      case 'mode': {
        if (req.method === 'POST' && user) {
          const { rule_id, mode } = await req.json();
          
          if (!['dry_run', 'suggestion', 'auto'].includes(mode)) {
            return new Response(
              JSON.stringify({ error: 'Invalid mode' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { data: rule, error } = await supabase
            .from('automation_rules')
            .update({ mode })
            .eq('id', rule_id)
            .eq('user_id', user.id)
            .select()
            .single();
          
          if (error) throw error;
          
          return new Response(
            JSON.stringify({ rule }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }

      case 'run': {
        if (req.method === 'POST') {
          const ruleId = url.searchParams.get('ruleId');
          const mode = url.searchParams.get('mode') || 'dry_run';
          
          if (!ruleId) {
            return new Response(
              JSON.stringify({ error: 'Missing ruleId parameter' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Trigger rules engine for specific rule
          const { data, error } = await supabase.functions.invoke('rules-engine-runner', {
            body: { rule_id: ruleId, mode }
          });
          
          if (error) throw error;
          
          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }

      case 'alerts': {
        if (req.method === 'GET') {
          const profileId = url.searchParams.get('profileId');
          const state = url.searchParams.get('state');
          const limit = parseInt(url.searchParams.get('limit') || '50');
          
          let query = supabase
            .from('alerts')
            .select(`
              *,
              automation_rules(name, rule_type)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
          
          if (profileId) {
            query = query.eq('profile_id', profileId);
          }
          
          if (state) {
            query = query.eq('state', state);
          }

          const { data: alerts, error } = await query;
          
          if (error) throw error;
          
          return new Response(
            JSON.stringify({ alerts }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (req.method === 'POST' && user) {
          const { alert_ids, action } = await req.json();
          
          if (action === 'acknowledge') {
            const { error } = await supabase
              .from('alerts')
              .update({
                state: 'acknowledged',
                acknowledged_at: new Date().toISOString()
              })
              .in('id', alert_ids);
            
            if (error) throw error;
            
            return new Response(
              JSON.stringify({ success: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        break;
      }

      case 'initialize': {
        if (req.method === 'POST' && user) {
          const { profile_id } = await req.json();
          
          if (!profile_id) {
            return new Response(
              JSON.stringify({ error: 'Missing profile_id' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Create default rules for the profile
          const defaultRules = Object.values(DEFAULT_RULES).map(rule => ({
            user_id: user.id,
            profile_id,
            name: rule.name,
            rule_type: rule.rule_type,
            enabled: false, // Start disabled
            severity: rule.severity,
            params: rule.params,
            action: rule.action,
            throttle: rule.throttle
          }));

          const { data: rules, error } = await supabase
            .from('automation_rules')
            .insert(defaultRules)
            .select();
          
          if (error) throw error;
          
          return new Response(
            JSON.stringify({ rules }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Rules API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
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