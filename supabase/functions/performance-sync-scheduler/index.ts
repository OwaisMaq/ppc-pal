import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[performance-sync-scheduler] Starting scheduled performance data sync');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active Amazon connections
    const { data: connections, error: connectionsError } = await supabase
      .from('amazon_connections')
      .select('id, user_id, profile_id, profile_name, status')
      .eq('status', 'active');

    if (connectionsError) {
      console.error('[performance-sync-scheduler] Error fetching connections:', connectionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch connections', details: connectionsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connections || connections.length === 0) {
      console.log('[performance-sync-scheduler] No active connections found');
      return new Response(
        JSON.stringify({ message: 'No active connections to sync', synced: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[performance-sync-scheduler] Found ${connections.length} active connections`);

    const results = {
      total: connections.length,
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ profile_id: string; error: string }>,
    };

    // Request performance reports for each connection
    for (const connection of connections) {
      try {
        console.log(`[performance-sync-scheduler] Requesting reports for profile ${connection.profile_id}`);

        const syncUrl = `${supabaseUrl}/functions/v1/sync-amazon-data`;
        const syncResponse = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            connectionId: connection.id,
            trigger: 'scheduled',
          }),
        });

        if (syncResponse.ok) {
          results.succeeded++;
          console.log(`[performance-sync-scheduler] Successfully requested reports for ${connection.profile_id}`);
        } else {
          const errorText = await syncResponse.text();
          results.failed++;
          results.errors.push({
            profile_id: connection.profile_id,
            error: errorText,
          });
          console.error(`[performance-sync-scheduler] Failed to request reports for ${connection.profile_id}:`, errorText);
        }
      } catch (err) {
        results.failed++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push({
          profile_id: connection.profile_id,
          error: errorMsg,
        });
        console.error(`[performance-sync-scheduler] Exception requesting reports for ${connection.profile_id}:`, err);
      }
    }

    console.log('[performance-sync-scheduler] Sync completed:', results);

    return new Response(
      JSON.stringify({
        message: 'Performance sync scheduler completed',
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[performance-sync-scheduler] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: 'Performance sync scheduler failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
