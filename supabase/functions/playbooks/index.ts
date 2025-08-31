import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaybookTemplate {
  key: string;
  name: string;
  description: string;
  defaultParams: any;
  requiredParams: string[];
}

const TEMPLATES: PlaybookTemplate[] = [
  {
    key: 'harvest_then_negate',
    name: 'Harvest → Negate',
    description: 'Promote converting search terms/ASINs to exact/product targets, then add negatives to source',
    defaultParams: {
      minConversions: 2,
      minSales: 50,
      maxACOS: 30,
      lookbackDays: 14,
      exactBidMultiplier: 1.2,
      negativeMatchType: 'negative_exact'
    },
    requiredParams: ['minConversions', 'minSales', 'maxACOS']
  },
  {
    key: 'bid_down_high_acos',
    name: 'Bid Down High ACOS',
    description: 'Lower bids on targets above ACOS goal',
    defaultParams: {
      acosThreshold: 30,
      bidReductionPercent: 20,
      minBidMicros: 100000, // $0.10
      lookbackDays: 7
    },
    requiredParams: ['acosThreshold', 'bidReductionPercent']
  },
  {
    key: 'placement_optimizer',
    name: 'Placement Optimizer',
    description: 'Adjust Top-of-Search up/down based on relative ACOS',
    defaultParams: {
      targetACOS: 25,
      topOfSearchBoost: 50,
      topOfSearchReduction: 25,
      minPerformanceDays: 7
    },
    requiredParams: ['targetACOS']
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Set user context for RLS
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        await supabase.rpc('set_config', {
          key: 'request.jwt.claims',
          value: JSON.stringify({ sub: user.id }),
        });
      }
    }

    switch (req.method) {
      case 'GET':
        switch (path) {
          case 'templates':
            return handleGetTemplates();
          case 'list':
            return await handleListPlaybooks(supabase);
          case 'runs':
            return await handleGetRuns(req, supabase);
          default:
            return new Response('Not Found', { status: 404, headers: corsHeaders });
        }
      
      case 'POST':
        switch (path) {
          case 'create':
            return await handleCreatePlaybook(req, supabase, userId);
          case 'run':
            return await handleRunPlaybook(req, supabase, userId);
          case 'toggle':
            return await handleTogglePlaybook(req, supabase);
          default:
            return new Response('Not Found', { status: 404, headers: corsHeaders });
        }
      
      default:
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Error in playbooks function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function handleGetTemplates() {
  return new Response(
    JSON.stringify({ templates: TEMPLATES }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleListPlaybooks(supabase: any) {
  const { data, error } = await supabase
    .from('playbooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ playbooks: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCreatePlaybook(req: Request, supabase: any, userId: string | null) {
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json();
  const { name, description, templateKey, params, mode = 'dry_run' } = body;

  // Validate template
  const template = TEMPLATES.find(t => t.key === templateKey);
  if (!template) {
    return new Response(
      JSON.stringify({ error: 'Invalid template key' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate required params
  for (const requiredParam of template.requiredParams) {
    if (!(requiredParam in params)) {
      return new Response(
        JSON.stringify({ error: `Missing required parameter: ${requiredParam}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Merge with default params
  const finalParams = { ...template.defaultParams, ...params };

  const { data, error } = await supabase
    .from('playbooks')
    .insert({
      user_id: userId,
      name,
      description,
      template_key: templateKey,
      params: finalParams,
      mode
    })
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ playbook: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRunPlaybook(req: Request, supabase: any, userId: string | null) {
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const playbookId = url.searchParams.get('playbookId');
  const profileId = url.searchParams.get('profileId');
  const mode = url.searchParams.get('mode') || 'dry_run';

  if (!playbookId || !profileId) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: playbookId, profileId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get playbook
  const { data: playbook, error: playbookError } = await supabase
    .from('playbooks')
    .select('*')
    .eq('id', playbookId)
    .eq('user_id', userId)
    .single();

  if (playbookError) throw playbookError;
  if (!playbook) {
    return new Response(
      JSON.stringify({ error: 'Playbook not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create playbook run
  const { data: run, error: runError } = await supabase
    .from('playbook_runs')
    .insert({
      playbook_id: playbookId,
      profile_id: profileId,
      status: 'running'
    })
    .select()
    .single();

  if (runError) throw runError;

  try {
    // Execute playbook based on template
    const result = await executePlaybook(supabase, playbook, profileId, mode, run.id);

    // Update run with results
    await supabase
      .from('playbook_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'success',
        steps: result.steps,
        actions_enqueued: result.actionsEnqueued,
        alerts_created: result.alertsCreated
      })
      .eq('id', run.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        runId: run.id,
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Update run with error
    await supabase
      .from('playbook_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'failed',
        error: error.message
      })
      .eq('id', run.id);

    throw error;
  }
}

async function executePlaybook(supabase: any, playbook: any, profileId: string, mode: string, runId: string) {
  const template = TEMPLATES.find(t => t.key === playbook.template_key);
  if (!template) {
    throw new Error('Invalid template');
  }

  switch (template.key) {
    case 'harvest_then_negate':
      return await executeHarvestThenNegate(supabase, playbook.params, profileId, mode);
    
    case 'bid_down_high_acos':
      return await executeBidDownHighACOS(supabase, playbook.params, profileId, mode);
    
    case 'placement_optimizer':
      return await executePlacementOptimizer(supabase, playbook.params, profileId, mode);
    
    default:
      throw new Error('Unsupported template');
  }
}

async function executeHarvestThenNegate(supabase: any, params: any, profileId: string, mode: string) {
  const { minConversions, minSales, maxACOS, lookbackDays, exactBidMultiplier, negativeMatchType } = params;
  
  // Find converting search terms to harvest
  const { data: searchTerms } = await supabase
    .from('v_studio_search_terms')
    .select('*')
    .eq('profile_id', profileId)
    .gte('conv_14d', minConversions)
    .gte('sales_14d', minSales)
    .lte('acos', maxACOS)
    .eq('is_brand', false)
    .eq('ignored', false);

  const actions = [];
  let actionsEnqueued = 0;

  for (const term of searchTerms || []) {
    // Create exact keyword target
    const exactAction = {
      rule_id: crypto.randomUUID(),
      profile_id: profileId,
      action_type: 'create_keyword',
      payload: {
        adGroupId: term.ad_group_id,
        keywordText: term.search_term,
        matchType: 'exact',
        bidMicros: Math.round(term.cpc_14d * exactBidMultiplier * 1000000)
      },
      idempotency_key: `harvest_exact_${term.search_term}_${Date.now()}`
    };

    // Add negative to source
    const negativeAction = {
      rule_id: crypto.randomUUID(),
      profile_id: profileId,
      action_type: 'add_adgroup_negative',
      payload: {
        adGroupId: term.ad_group_id,
        keywordText: term.search_term,
        matchType: negativeMatchType
      },
      idempotency_key: `harvest_negative_${term.search_term}_${Date.now()}`
    };

    actions.push(exactAction, negativeAction);
  }

  if (mode === 'auto' && actions.length > 0) {
    const { error } = await supabase.from('action_queue').insert(actions);
    if (error) throw error;
    actionsEnqueued = actions.length;
  }

  return {
    steps: {
      searchTermsEvaluated: searchTerms?.length || 0,
      harvestOpportunities: (searchTerms?.length || 0),
      actionsGenerated: actions.length
    },
    actionsEnqueued,
    alertsCreated: 0
  };
}

async function executeBidDownHighACOS(supabase: any, params: any, profileId: string, mode: string) {
  const { acosThreshold, bidReductionPercent, minBidMicros, lookbackDays } = params;

  // Find high ACOS targets
  const fromDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = new Date().toISOString().split('T')[0];

  const { data: targets } = await supabase.rpc('get_high_acos_targets', {
    p_profile_id: profileId,
    p_from_date: fromDate,
    p_to_date: toDate,
    p_acos_threshold: acosThreshold
  }).select();

  const actions = [];
  let actionsEnqueued = 0;

  for (const target of targets || []) {
    const currentBidMicros = target.bid_micros || 1000000; // Default $1.00
    const newBidMicros = Math.max(
      Math.round(currentBidMicros * (1 - bidReductionPercent / 100)),
      minBidMicros
    );

    if (newBidMicros < currentBidMicros) {
      const action = {
        rule_id: crypto.randomUUID(),
        profile_id: profileId,
        action_type: 'set_bid',
        payload: {
          targetId: target.target_id,
          bidMicros: newBidMicros
        },
        idempotency_key: `bid_down_${target.target_id}_${Date.now()}`
      };

      actions.push(action);
    }
  }

  if (mode === 'auto' && actions.length > 0) {
    const { error } = await supabase.from('action_queue').insert(actions);
    if (error) throw error;
    actionsEnqueued = actions.length;
  }

  return {
    steps: {
      targetsEvaluated: targets?.length || 0,
      highACOSTargets: actions.length,
      actionsGenerated: actions.length
    },
    actionsEnqueued,
    alertsCreated: 0
  };
}

async function executePlacementOptimizer(supabase: any, params: any, profileId: string, mode: string) {
  // Placeholder implementation
  return {
    steps: {
      campaignsEvaluated: 0,
      placementAdjustments: 0,
      actionsGenerated: 0
    },
    actionsEnqueued: 0,
    alertsCreated: 0
  };
}

async function handleTogglePlaybook(req: Request, supabase: any) {
  const body = await req.json();
  const { playbookId, enabled } = body;

  const { data, error } = await supabase
    .from('playbooks')
    .update({ enabled })
    .eq('id', playbookId)
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ playbook: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetRuns(req: Request, supabase: any) {
  const url = new URL(req.url);
  const playbookId = url.searchParams.get('playbookId');

  let query = supabase
    .from('playbook_runs')
    .select('*')
    .order('started_at', { ascending: false });

  if (playbookId) {
    query = query.eq('playbook_id', playbookId);
  }

  const { data, error } = await query.limit(50);

  if (error) throw error;

  return new Response(
    JSON.stringify({ runs: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}