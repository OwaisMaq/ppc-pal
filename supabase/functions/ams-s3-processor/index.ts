import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.400.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize S3 client
function createS3Client(region: string) {
  return new S3Client({
    region,
    credentials: {
      accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
    },
  });
}

// Parse S3 ARN to extract bucket name
function parseBucketArn(arn: string): string {
  // arn:aws:s3:::bucket-name
  const parts = arn.split(':');
  return parts[parts.length - 1];
}

// Download and parse S3 object
async function downloadS3Object(s3Client: S3Client, bucket: string, key: string): Promise<any> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error('Empty S3 object body');
  }
  
  // Read the stream
  const reader = response.Body.transformToString();
  const content = await reader;
  
  return JSON.parse(content);
}

// Delete S3 object after processing
async function deleteS3Object(s3Client: S3Client, bucket: string, key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await s3Client.send(command);
}

// Send data to ams-ingest function
async function sendToIngest(dataset: string, records: any[]): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const ingestSecret = Deno.env.get('AMS_INGEST_SECRET')!;
  
  const body = JSON.stringify({ dataset, records });
  
  // Generate HMAC signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ingestSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature_buffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const signature = 'sha256=' + Array.from(new Uint8Array(signature_buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const response = await fetch(`${supabaseUrl}/functions/v1/ams-ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
    },
    body,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ingest failed: ${error}`);
  }
  
  return response.json();
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

  try {
    const { connectionId } = await req.json();
    
    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Missing connectionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const s3BucketArn = Deno.env.get('AWS_S3_BUCKET_ARN_EU');
    const s3Region = Deno.env.get('AWS_REGION_EU');

    if (!s3BucketArn || !s3Region) {
      console.error('Missing S3 configuration');
      return new Response(
        JSON.stringify({ error: 'S3 not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connection details
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: connection, error: connError } = await supabase
      .from('amazon_connections')
      .select('profile_id, marketplace_id')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      console.error('Connection not found:', connError);
      return new Response(
        JSON.stringify({ error: 'Connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bucketName = parseBucketArn(s3BucketArn);
    const s3Client = createS3Client(s3Region);

    console.log(`Processing S3 bucket: ${bucketName} for profile: ${connection.profile_id}`);

    // List objects in S3 bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: '', // No prefix - scan all files
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];

    console.log(`Found ${objects.length} objects in S3 bucket`);

    let processedFiles = 0;
    let totalRecords = 0;
    const errors: string[] = [];

    // Process each file
    for (const obj of objects) {
      if (!obj.Key || !obj.Key.endsWith('.json')) {
        continue; // Skip non-JSON files
      }

      try {
        console.log(`Processing file: ${obj.Key}`);
        
        // Download and parse the file
        const data = await downloadS3Object(s3Client, bucketName, obj.Key);
        
        // Extract dataset and records from the file
        // Assuming the file structure matches AMS data format
        const dataset = data.dataset || 'sp-traffic'; // Default to sp-traffic
        const records = Array.isArray(data.records) ? data.records : [data];
        
        // Filter records for this profile
        const profileRecords = records.filter((r: any) => 
          r.profileId === connection.profile_id
        );

        if (profileRecords.length > 0) {
          // Send to ingest function
          const result = await sendToIngest(dataset, profileRecords);
          console.log(`Ingested ${profileRecords.length} records from ${obj.Key}:`, result);
          totalRecords += profileRecords.length;
        }

        // Delete the processed file
        await deleteS3Object(s3Client, bucketName, obj.Key);
        processedFiles++;
        
      } catch (error) {
        console.error(`Error processing ${obj.Key}:`, error);
        errors.push(`${obj.Key}: ${(error as Error).message}`);
      }
    }

    console.log(`S3 processing completed: ${processedFiles} files, ${totalRecords} records`);

    return new Response(
      JSON.stringify({
        ok: true,
        processedFiles,
        totalRecords,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('S3 processor error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: (error as Error).message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
