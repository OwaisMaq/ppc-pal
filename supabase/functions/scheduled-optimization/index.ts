
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Import Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting scheduled optimization check...')

    // Get all automation preferences where auto_optimization is enabled
    const { data: preferences, error: prefsError } = await supabase
      .from('automation_preferences')
      .select(`
        *,
        amazon_connections!inner(*)
      `)
      .eq('auto_optimization_enabled', true)

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError)
      throw prefsError
    }

    console.log(`Found ${preferences?.length || 0} accounts with auto-optimization enabled`)

    const now = new Date()
    const optimizationsToRun = []

    for (const pref of preferences || []) {
      const lastRun = pref.last_optimization_run ? new Date(pref.last_optimization_run) : null
      const hoursSinceLastRun = lastRun 
        ? (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)
        : Infinity

      console.log(`Account ${pref.connection_id}: Last run ${hoursSinceLastRun} hours ago, frequency: ${pref.optimization_frequency_hours} hours`)

      if (hoursSinceLastRun >= pref.optimization_frequency_hours) {
        optimizationsToRun.push(pref)
      }
    }

    console.log(`${optimizationsToRun.length} optimizations need to run`)

    // Run optimizations
    const results = []
    for (const pref of optimizationsToRun) {
      try {
        console.log(`Starting optimization for connection ${pref.connection_id}`)

        // Create optimization batch
        const { data: optimizationId, error: batchError } = await supabase
          .rpc('create_optimization_batch', {
            user_uuid: pref.user_id,
            connection_uuid: pref.connection_id
          })

        if (batchError) throw batchError

        // Call the optimization function
        const { data: optimizationResult, error: optError } = await supabase.functions.invoke('run-optimization', {
          body: { 
            connectionId: pref.connection_id, 
            optimizationId 
          }
        })

        if (optError) throw optError

        // Update last optimization run time
        await supabase
          .from('automation_preferences')
          .update({ last_optimization_run: now.toISOString() })
          .eq('id', pref.id)

        results.push({
          connectionId: pref.connection_id,
          status: 'success',
          optimizationId
        })

        console.log(`Optimization completed for connection ${pref.connection_id}`)

      } catch (error) {
        console.error(`Error running optimization for connection ${pref.connection_id}:`, error)
        results.push({
          connectionId: pref.connection_id,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scheduled optimization check completed`,
        totalPreferences: preferences?.length || 0,
        optimizationsRun: optimizationsToRun.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in scheduled optimization:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
