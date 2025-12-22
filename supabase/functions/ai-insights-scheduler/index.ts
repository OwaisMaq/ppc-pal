import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('AI Insights Scheduler starting...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all users with auto_apply_enabled = true
    const { data: usersWithAutoApply, error: usersError } = await supabase
      .from('user_ai_settings')
      .select('user_id')
      .eq('auto_apply_enabled', true);

    if (usersError) {
      console.error('Error fetching users with auto-apply:', usersError);
      throw usersError;
    }

    if (!usersWithAutoApply || usersWithAutoApply.length === 0) {
      console.log('No users with auto-apply enabled');
      return new Response(JSON.stringify({
        success: true,
        message: 'No users with auto-apply enabled',
        processed: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${usersWithAutoApply.length} users with auto-apply enabled`);

    const results: Array<{ userId: string; status: string; insightsGenerated?: number; autoApplied?: number; error?: string }> = [];

    // Process each user
    for (const { user_id } of usersWithAutoApply) {
      console.log(`Processing user: ${user_id}`);

      try {
        // Get user's active Amazon connections
        const { data: connections, error: connError } = await supabase
          .from('amazon_connections')
          .select('id, profile_id, user_id')
          .eq('user_id', user_id)
          .eq('status', 'active');

        if (connError) {
          console.error(`Error fetching connections for user ${user_id}:`, connError);
          results.push({ userId: user_id, status: 'error', error: connError.message });
          continue;
        }

        if (!connections || connections.length === 0) {
          console.log(`No active connections for user ${user_id}`);
          results.push({ userId: user_id, status: 'skipped', error: 'No active connections' });
          continue;
        }

        // Generate insights for this user by calling the ai-insights function
        // We need to invoke it with service role and pass user context
        const { data: insightsData, error: insightsError } = await supabase.functions.invoke('ai-insights', {
          headers: {
            // Create a minimal JWT-like header for the user context
            'x-scheduler-user-id': user_id,
          },
          body: { scheduledRun: true, userId: user_id }
        });

        if (insightsError) {
          console.error(`Error generating insights for user ${user_id}:`, insightsError);
          results.push({ userId: user_id, status: 'error', error: insightsError.message });
          continue;
        }

        const insightsGenerated = insightsData?.insights?.length || 0;
        const autoApplied = insightsData?.autoAppliedCount || 0;

        console.log(`User ${user_id}: Generated ${insightsGenerated} insights, auto-applied ${autoApplied}`);
        results.push({
          userId: user_id,
          status: 'success',
          insightsGenerated,
          autoApplied,
        });

      } catch (userError) {
        console.error(`Unexpected error for user ${user_id}:`, userError);
        results.push({
          userId: user_id,
          status: 'error',
          error: userError instanceof Error ? userError.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const totalAutoApplied = results.reduce((sum, r) => sum + (r.autoApplied || 0), 0);

    console.log(`AI Insights Scheduler completed in ${duration}ms. Processed ${successCount}/${usersWithAutoApply.length} users. Auto-applied ${totalAutoApplied} actions.`);

    return new Response(JSON.stringify({
      success: true,
      processed: usersWithAutoApply.length,
      succeeded: successCount,
      totalAutoApplied,
      duration,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Insights Scheduler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
