import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DaypartSlot {
  day: number;
  hour: number;
  enabled: boolean;
  multiplier: number;
}

interface DaypartSchedule {
  id: string;
  profile_id: string;
  campaign_id: string;
  schedule: DaypartSlot[];
  pause_multiplier: number;
  last_applied_state: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current day and hour
    const now = new Date();
    const currentDay = now.getUTCDay(); // 0-6 (Sunday-Saturday)
    const currentHour = now.getUTCHours(); // 0-23

    console.log(`Running daypart executor at ${now.toISOString()} - Day: ${currentDay}, Hour: ${currentHour}`);

    // Fetch all enabled daypart schedules
    const { data: schedules, error: fetchError } = await supabase
      .from('daypart_schedules')
      .select('*')
      .eq('enabled', true);

    if (fetchError) {
      console.error('Error fetching schedules:', fetchError);
      throw fetchError;
    }

    if (!schedules || schedules.length === 0) {
      console.log('No enabled daypart schedules found');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No schedules to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${schedules.length} enabled schedules`);

    let processed = 0;
    let errors = 0;

    for (const schedule of schedules) {
      try {
        // Parse schedule JSON
        const slots: DaypartSlot[] = typeof schedule.schedule === 'string' 
          ? JSON.parse(schedule.schedule) 
          : schedule.schedule;

        // Find the slot for current day/hour
        const currentSlot = slots.find(s => s.day === currentDay && s.hour === currentHour);
        
        if (!currentSlot) {
          console.log(`No slot found for campaign ${schedule.campaign_id} at day ${currentDay}, hour ${currentHour}`);
          continue;
        }

        const shouldBeEnabled = currentSlot.enabled;
        const currentState = schedule.last_applied_state;
        const newState = shouldBeEnabled ? 'enabled' : 'paused';

        // Only act if state needs to change
        if (currentState === newState) {
          console.log(`Campaign ${schedule.campaign_id} already in state: ${newState}`);
          continue;
        }

        console.log(`Campaign ${schedule.campaign_id}: changing from ${currentState} to ${newState}`);

        // Queue an action to change campaign state
        const { error: queueError } = await supabase
          .from('action_queue')
          .insert({
            profile_id: schedule.profile_id,
            action_type: shouldBeEnabled ? 'enable_entity' : 'pause_entity',
            payload: {
              entityType: 'campaign',
              entityId: schedule.campaign_id,
              newStatus: newState,
              source: 'dayparting',
              scheduleId: schedule.id,
            },
            idempotency_key: `daypart_${schedule.campaign_id}_${currentDay}_${currentHour}_${Date.now()}`,
            status: 'queued',
          });

        if (queueError) {
          console.error(`Error queueing action for ${schedule.campaign_id}:`, queueError);
          errors++;
          continue;
        }

        // Update last applied state
        await supabase
          .from('daypart_schedules')
          .update({ 
            last_applied_at: now.toISOString(),
            last_applied_state: newState,
          })
          .eq('id', schedule.id);

        // Log execution history
        await supabase
          .from('daypart_execution_history')
          .insert({
            schedule_id: schedule.id,
            profile_id: schedule.profile_id,
            campaign_id: schedule.campaign_id,
            action: shouldBeEnabled ? 'enabled' : 'paused',
            previous_state: currentState,
            new_state: newState,
            multiplier_applied: currentSlot.multiplier,
            success: true,
          });

        processed++;
      } catch (scheduleError) {
        console.error(`Error processing schedule ${schedule.id}:`, scheduleError);
        errors++;

        // Log failed execution
        await supabase
          .from('daypart_execution_history')
          .insert({
            schedule_id: schedule.id,
            profile_id: schedule.profile_id,
            campaign_id: schedule.campaign_id,
            action: 'error',
            success: false,
            error: scheduleError instanceof Error ? scheduleError.message : 'Unknown error',
          });
      }
    }

    console.log(`Daypart execution complete: ${processed} processed, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        errors,
        timestamp: now.toISOString(),
        day: currentDay,
        hour: currentHour,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Daypart executor error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
