import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🧹 Cleaning up stuck syncs for user ${user.id}`)

    // Find sync jobs that have been running for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    
    const { data: stuckJobs, error: fetchError } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'running')
      .lt('started_at', tenMinutesAgo)

    if (fetchError) {
      throw fetchError
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No stuck sync jobs found',
        cleaned: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${stuckJobs.length} stuck sync jobs`)

    // Mark them as failed
    const { error: updateError } = await supabase
      .from('sync_jobs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_details: {
          error: 'Sync job timed out after 10 minutes',
          code: 'TIMEOUT',
          cleanup_timestamp: new Date().toISOString()
        }
      })
      .in('id', stuckJobs.map(job => job.id))

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({ 
      message: `Cleaned up ${stuckJobs.length} stuck sync jobs`,
      cleaned: stuckJobs.length,
      jobs: stuckJobs.map(j => ({ id: j.id, phase: j.phase, started_at: j.started_at }))
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error cleaning up stuck syncs:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
