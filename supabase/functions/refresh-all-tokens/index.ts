import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hmac-signature',
};

// HMAC signature validation
async function validateHmacSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('x-hmac-signature');
  const secret = Deno.env.get('TOKEN_REFRESH_SECRET');
  
  if (!secret) {
    console.error('TOKEN_REFRESH_SECRET not configured');
    return false;
  }
  
  if (!signature) {
    console.error('No HMAC signature provided');
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  const body = await req.clone().text();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === computedSignature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate HMAC signature for security
    const isValid = await validateHmacSignature(req);
    if (!isValid) {
      console.error('Invalid HMAC signature');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Starting token refresh job...');

    // Query connections with tokens expiring in next 45 minutes or already expired
    const expiryThreshold = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    const { data: connections, error: fetchError } = await supabase
      .from('amazon_connections')
      .select('id, profile_id, token_expires_at, user_id')
      .eq('status', 'active')
      .lte('token_expires_at', expiryThreshold);

    if (fetchError) {
      console.error('Error fetching connections:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${connections?.length || 0} connections needing refresh`);

    const results = {
      total: connections?.length || 0,
      refreshed: 0,
      failed: 0,
      errors: [] as Array<{ connection_id: string; error: string }>,
    };

    // Refresh each connection
    for (const connection of connections || []) {
      try {
        console.log(`Refreshing token for connection ${connection.id} (profile: ${connection.profile_id})`);

        const { data: refreshData, error: refreshError } = await supabase.functions.invoke(
          'refresh-amazon-token',
          {
            body: { connectionId: connection.id },
          }
        );

        if (refreshError || !refreshData?.success) {
          const errorMsg = refreshError?.message || refreshData?.error || 'Unknown error';
          console.error(`Failed to refresh connection ${connection.id}:`, errorMsg);
          results.failed++;
          results.errors.push({
            connection_id: connection.id,
            error: errorMsg,
          });

          // Log failure
          await supabase.from('token_refresh_log').insert({
            connection_id: connection.id,
            profile_id: connection.profile_id,
            status: 'failed',
            error_message: errorMsg,
          });
        } else {
          console.log(`Successfully refreshed connection ${connection.id}`);
          results.refreshed++;

          // Log success
          await supabase.from('token_refresh_log').insert({
            connection_id: connection.id,
            profile_id: connection.profile_id,
            status: 'success',
          });
        }
      } catch (error) {
        console.error(`Exception refreshing connection ${connection.id}:`, error);
        results.failed++;
        results.errors.push({
          connection_id: connection.id,
          error: error.message,
        });

        // Log failure
        await supabase.from('token_refresh_log').insert({
          connection_id: connection.id,
          profile_id: connection.profile_id,
          status: 'failed',
          error_message: error.message,
        });
      }
    }

    console.log('Token refresh job completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Token refresh job error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
