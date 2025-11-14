import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { trigger, userId } = await req.json();
    console.log(`🔄 Auto-sync triggered by: ${trigger}, userId: ${userId || 'all'}`);

    // Get all active connections (optionally filtered by userId)
    let query = supabase
      .from('amazon_connections')
      .select('id, profile_id, user_id, status, token_expires_at, last_sync_at')
      .eq('status', 'active')
      .gt('token_expires_at', new Date().toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: connections, error: connError } = await query;

    if (connError) {
      throw new Error(`Failed to fetch connections: ${connError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log('⚠️ No active connections found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active connections to sync',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${connections.length} active connections to sync`);

    // Trigger entity sync for each connection
    const syncResults = [];
    for (const connection of connections) {
      const startTime = Date.now();
      try {
        console.log(`🔄 Syncing connection ${connection.profile_id} (${connection.id})`);
        
        // Call entities-sync-runner for this profile
        const { data, error } = await supabase.functions.invoke('entities-sync-runner', {
          body: {
            profileId: connection.profile_id,
            entity: 'all',
            mode: 'incremental'
          }
        });

        if (error) {
          console.error(`❌ Sync failed for ${connection.profile_id}:`, error);
          syncResults.push({
            profileId: connection.profile_id,
            success: false,
            error: error.message
          });

          // Log to history
          await supabase.from('auto_sync_history').insert({
            trigger_type: trigger,
            user_id: connection.user_id,
            connection_id: connection.id,
            profile_id: connection.profile_id,
            status: 'failed',
            error_details: { message: error.message },
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime
          });
        } else {
          console.log(`✅ Sync completed for ${connection.profile_id}`);
          
          // Update last_sync_at timestamp
          await supabase
            .from('amazon_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', connection.id);

          syncResults.push({
            profileId: connection.profile_id,
            success: true,
            result: data
          });

          // Log to history
          await supabase.from('auto_sync_history').insert({
            trigger_type: trigger,
            user_id: connection.user_id,
            connection_id: connection.id,
            profile_id: connection.profile_id,
            status: 'success',
            entities_synced: data?.synced || {},
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime
          });
        }
      } catch (err) {
        console.error(`❌ Exception syncing ${connection.profile_id}:`, err);
        syncResults.push({
          profileId: connection.profile_id,
          success: false,
          error: err.message
        });

        // Log error to history
        await supabase.from('auto_sync_history').insert({
          trigger_type: trigger,
          user_id: connection.user_id,
          connection_id: connection.id,
          profile_id: connection.profile_id,
          status: 'failed',
          error_details: { message: err.message },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    const failCount = syncResults.filter(r => !r.success).length;

    console.log(`✅ Auto-sync completed: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        trigger,
        total: connections.length,
        succeeded: successCount,
        failed: failCount,
        results: syncResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Auto-sync scheduler error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
