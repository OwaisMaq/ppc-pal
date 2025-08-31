
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { z } from 'https://esm.sh/zod@3.22.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

// Schema validation for AMS records
const AmsRecordSchema = z.object({
  recordId: z.string(),
  profileId: z.string(),
  eventTime: z.string().datetime(),
  payload: z.record(z.any()),
});

const AmsIngestRequestSchema = z.object({
  dataset: z.string(),
  records: z.array(AmsRecordSchema),
});

// HMAC signature verification
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    if (!signature.startsWith('sha256=')) {
      return false;
    }
    
    const expectedSignature = signature.slice(7); // Remove 'sha256=' prefix
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature_buffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computedSignature = Array.from(new Uint8Array(signature_buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return computedSignature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const ingestSecret = Deno.env.get('SUPABASE_INGEST_SECRET');

  if (!supabaseUrl || !supabaseServiceKey || !ingestSecret) {
    console.error('Missing required environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get the raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('X-Signature');

    if (!signature) {
      console.error('Missing X-Signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify HMAC signature
    const isValidSignature = await verifySignature(rawBody, signature, ingestSecret);
    if (!isValidSignature) {
      console.error('Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate the request
    let requestData;
    try {
      requestData = JSON.parse(rawBody);
    } catch (error) {
      console.error('Invalid JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = AmsIngestRequestSchema.safeParse(requestData);
    if (!validationResult.success) {
      console.error('Schema validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request schema', 
          details: validationResult.error.format() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dataset, records } = validationResult.data;
    
    console.log(`Processing AMS ingest: dataset=${dataset}, records=${records.length}`);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let inserted = 0;
    let deduped = 0;

    // Process records in batches of 100
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const stagingRecords = batch.map(record => ({
        profile_id: record.profileId,
        dataset: dataset,
        record_id: record.recordId,
        event_time: record.eventTime,
        payload: record.payload,
        received_at: new Date().toISOString()
      }));

      // Upsert into staging table (dedupe on dataset + record_id)
      const { error, count } = await supabase
        .from('ams_staging')
        .upsert(stagingRecords, {
          onConflict: 'dataset,record_id',
          ignoreDuplicates: false
        })
        .select('id', { count: 'exact' });

      if (error) {
        console.error('Database upsert error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Track stats (rough approximation since we can't easily tell inserts vs updates)
      const batchInserted = count || 0;
      const batchDeduped = batch.length - batchInserted;
      
      inserted += batchInserted;
      deduped += batchDeduped;

      console.log(`Batch ${Math.floor(i / batchSize) + 1}: inserted=${batchInserted}, deduped=${batchDeduped}`);
    }

    console.log(`AMS ingest completed: dataset=${dataset}, total_inserted=${inserted}, total_deduped=${deduped}`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        dataset,
        total_records: records.length,
        inserted,
        deduped 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('AMS ingest error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
