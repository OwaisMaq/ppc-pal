import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const profileId = url.searchParams.get('profileId');
    const fromDate = url.searchParams.get('fromDate') || getDateDaysAgo(7);
    const toDate = url.searchParams.get('toDate') || getDateDaysAgo(0);

    console.log(`Running conversion path ingestion for profile ${profileId} from ${fromDate} to ${toDate}`);

    if (!profileId) {
      // Run for all profiles
      const { data: connections } = await supabase
        .from('amazon_connections')
        .select('profile_id')
        .eq('status', 'active');

      if (!connections || connections.length === 0) {
        return new Response(JSON.stringify({ message: 'No active connections found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let totalPaths = 0;
      for (const conn of connections) {
        const paths = await processProfileConversionPaths(supabase, conn.profile_id, fromDate, toDate);
        totalPaths += paths;
      }

      return new Response(JSON.stringify({ 
        message: `Processed conversion paths for ${connections.length} profiles`,
        totalPaths 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const paths = await processProfileConversionPaths(supabase, profileId, fromDate, toDate);
      
      return new Response(JSON.stringify({ 
        message: `Processed conversion paths for profile ${profileId}`,
        pathsProcessed: paths 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Conversion path runner error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processProfileConversionPaths(supabase: any, profileId: string, fromDate: string, toDate: string): Promise<number> {
  console.log(`Processing conversion paths for profile ${profileId}`);

  // In a real implementation, this would:
  // 1. Request v3 conversion-path report from Amazon
  // 2. Poll for completion
  // 3. Download and parse the results
  // 4. Transform into path_json format
  // 5. Calculate time-lag buckets
  
  // For demo purposes, generate sample conversion paths
  const samplePaths = generateSampleConversionPaths(profileId, fromDate, toDate);
  
  if (samplePaths.length === 0) {
    console.log(`No conversion paths generated for profile ${profileId}`);
    return 0;
  }

  // Upsert conversion paths
  const { error: pathsError } = await supabase
    .from('conversion_paths_daily')
    .upsert(samplePaths, {
      onConflict: 'date,source,profile_id,path_fingerprint',
      ignoreDuplicates: false
    });

  if (pathsError) {
    console.error('Failed to upsert conversion paths:', pathsError);
    throw new Error(`Failed to store conversion paths: ${pathsError.message}`);
  }

  // Generate time lag data
  const timeLagData = generateTimeLagData(profileId, fromDate, toDate);
  
  if (timeLagData.length > 0) {
    const { error: lagError } = await supabase
      .from('time_lag_daily')
      .upsert(timeLagData, {
        onConflict: 'date,source,profile_id,bucket',
        ignoreDuplicates: false
      });

    if (lagError) {
      console.error('Failed to upsert time lag data:', lagError);
    }
  }

  console.log(`Successfully processed ${samplePaths.length} conversion paths for profile ${profileId}`);
  return samplePaths.length;
}

function generateSampleConversionPaths(profileId: string, fromDate: string, toDate: string): any[] {
  const paths: any[] = [];
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  
  // Generate paths for each day
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    // Sample path patterns
    const pathPatterns = [
      // Single touch patterns
      [{ type: 'sp', interaction: 'click', campaign_id: 'camp_001' }],
      [{ type: 'sb', interaction: 'view', campaign_id: 'camp_002' }],
      
      // Multi-touch patterns  
      [
        { type: 'sp', interaction: 'view', campaign_id: 'camp_001' },
        { type: 'sp', interaction: 'click', campaign_id: 'camp_001' }
      ],
      [
        { type: 'sb', interaction: 'view', campaign_id: 'camp_002' },
        { type: 'sp', interaction: 'view', campaign_id: 'camp_001' },
        { type: 'sp', interaction: 'click', campaign_id: 'camp_001' }
      ],
      [
        { type: 'sp', interaction: 'view', campaign_id: 'camp_003' },
        { type: 'sb', interaction: 'view', campaign_id: 'camp_002' },
        { type: 'sp', interaction: 'click', campaign_id: 'camp_001' },
        { type: 'sp', interaction: 'click', campaign_id: 'camp_003' }
      ]
    ];
    
    pathPatterns.forEach((pathJson, index) => {
      const pathFingerprint = generatePathFingerprint(pathJson);
      const conversions = Math.floor(Math.random() * 10) + 1;
      const salesMicros = conversions * (Math.floor(Math.random() * 50000) + 10000); // $10-60 per conversion
      
      paths.push({
        date: dateStr,
        source: 'v3',
        profile_id: profileId,
        marketplace: 'ATVPDKIKX0DER', // US marketplace
        path_fingerprint: pathFingerprint,
        path_json: pathJson,
        conversions,
        sales_micros: salesMicros,
        clicks: pathJson.filter(step => step.interaction === 'click').length * conversions,
        views: pathJson.filter(step => step.interaction === 'view').length * conversions * 5
      });
    });
  }
  
  return paths;
}

function generateTimeLagData(profileId: string, fromDate: string, toDate: string): any[] {
  const timeLag: any[] = [];
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  
  const buckets = ['0-1d', '2-3d', '4-7d', '8-14d', '15-30d'];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    buckets.forEach(bucket => {
      const conversions = Math.floor(Math.random() * 20);
      const salesMicros = conversions * (Math.floor(Math.random() * 40000) + 15000);
      
      if (conversions > 0) {
        timeLag.push({
          date: dateStr,
          source: 'v3',
          profile_id: profileId,
          bucket,
          conversions,
          sales_micros: salesMicros
        });
      }
    });
  }
  
  return timeLag;
}

function generatePathFingerprint(pathJson: any[]): string {
  // Create a stable hash from the path structure
  const pathString = JSON.stringify(pathJson.map(step => ({
    type: step.type,
    interaction: step.interaction
  })));
  
  // Simple hash function (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < pathString.length; i++) {
    const char = pathString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}