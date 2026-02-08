import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('Hourly orchestrator starting...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Early exit: check if any active connections exist
    const { count } = await supabase
      .from('amazon_connections')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    if (!count || count === 0) {
      console.log('No active connections, skipping all hourly tasks');
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'no_active_connections',
        duration: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${count} active connections, running hourly tasks`);

    const results: Record<string, { status: string; duration: number; error?: string }> = {};

    // 1. AMS Aggregate
    const t1 = Date.now();
    try {
      const { error } = await supabase.functions.invoke('ams-aggregate', {
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
      });
      results['ams-aggregate'] = { status: error ? 'error' : 'ok', duration: Date.now() - t1, error: error?.message };
    } catch (e) {
      results['ams-aggregate'] = { status: 'error', duration: Date.now() - t1, error: e.message };
    }

    // 2. Daypart Executor
    const t2 = Date.now();
    try {
      const { error } = await supabase.functions.invoke('daypart-executor', {
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
      });
      results['daypart-executor'] = { status: error ? 'error' : 'ok', duration: Date.now() - t2, error: error?.message };
    } catch (e) {
      results['daypart-executor'] = { status: 'error', duration: Date.now() - t2, error: e.message };
    }

    // 3. Rules Engine Runner
    const t3 = Date.now();
    try {
      const { error } = await supabase.functions.invoke('rules-engine-runner', {
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
      });
      results['rules-engine-runner'] = { status: error ? 'error' : 'ok', duration: Date.now() - t3, error: error?.message };
    } catch (e) {
      results['rules-engine-runner'] = { status: 'error', duration: Date.now() - t3, error: e.message };
    }

    const totalDuration = Date.now() - startTime;
    console.log(`Hourly orchestrator completed in ${totalDuration}ms:`, results);

    return new Response(JSON.stringify({
      success: true,
      activeConnections: count,
      results,
      duration: totalDuration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Hourly orchestrator error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
