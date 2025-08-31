import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HourlyFact {
  hour: string;
  profile_id: string;
  campaign_id: string;
  ad_group_id: string;
  target_id: string;
  clicks: number;
  impressions: number;
  cost_micros: number;
  attributed_conversions_1d: number;
  attributed_conversions_7d: number;
  attributed_sales_1d_micros: number;
  attributed_sales_7d_micros: number;
}

interface BudgetFact {
  minute: string;
  profile_id: string;
  campaign_id: string;
  budget_micros: number;
  spend_micros: number;
  pace: number;
  status: string;
}

async function getWatermark(supabase: any, key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('meta_kv')
    .select('v')
    .eq('k', key)
    .maybeSingle();

  if (error) {
    console.error(`Failed to get watermark ${key}:`, error);
    return null;
  }

  return data?.v?.timestamp || null;
}

async function setWatermark(supabase: any, key: string, timestamp: string): Promise<void> {
  const { error } = await supabase
    .from('meta_kv')
    .upsert({
      k: key,
      v: { timestamp },
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'k',
      ignoreDuplicates: false
    });

  if (error) {
    console.error(`Failed to set watermark ${key}:`, error);
    throw error;
  }
}

async function compactDataset(
  supabase: any, 
  dataset: string, 
  lastWatermark: string | null
): Promise<{ processed: number; maxTimestamp: string | null }> {
  
  console.log(`Compacting dataset: ${dataset}, from watermark: ${lastWatermark}`);

  // Query new staging records since last watermark
  let query = supabase
    .from('ams_staging')
    .select('*')
    .eq('dataset', dataset)
    .order('event_time', { ascending: true })
    .limit(10000); // Process in chunks

  if (lastWatermark) {
    query = query.gt('event_time', lastWatermark);
  }

  const { data: stagingRecords, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch staging records: ${error.message}`);
  }

  if (!stagingRecords || stagingRecords.length === 0) {
    console.log(`No new records for dataset ${dataset}`);
    return { processed: 0, maxTimestamp: null };
  }

  console.log(`Processing ${stagingRecords.length} records for ${dataset}`);

  // Group records by hour and aggregate
  const hourlyAggregates = new Map<string, HourlyFact>();
  const budgetAggregates = new Map<string, BudgetFact>();
  let maxTimestamp: string | null = null;

  for (const record of stagingRecords) {
    const eventTime = new Date(record.event_time);
    maxTimestamp = record.event_time;

    if (dataset.includes('budget-usage')) {
      // Budget usage - aggregate by minute
      const minute = new Date(eventTime.getFullYear(), eventTime.getMonth(), eventTime.getDate(), 
                             eventTime.getHours(), eventTime.getMinutes()).toISOString();
      
      const key = `${minute}_${record.profile_id}_${record.payload.campaign_id || ''}`;
      
      if (!budgetAggregates.has(key)) {
        budgetAggregates.set(key, {
          minute,
          profile_id: record.profile_id,
          campaign_id: record.payload.campaign_id || '',
          budget_micros: 0,
          spend_micros: 0,
          pace: 0,
          status: 'unknown'
        });
      }

      const agg = budgetAggregates.get(key)!;
      agg.budget_micros = Math.max(agg.budget_micros, record.payload.budget_micros || 0);
      agg.spend_micros = Math.max(agg.spend_micros, record.payload.spend_micros || 0);
      agg.pace = record.payload.pace || agg.pace;
      agg.status = record.payload.status || agg.status;

    } else {
      // Performance data - aggregate by hour
      const hour = new Date(eventTime.getFullYear(), eventTime.getMonth(), eventTime.getDate(), 
                           eventTime.getHours()).toISOString();
      
      const key = `${hour}_${record.profile_id}_${record.payload.campaign_id || ''}_${record.payload.ad_group_id || ''}_${record.payload.target_id || record.payload.keyword_id || ''}`;
      
      if (!hourlyAggregates.has(key)) {
        hourlyAggregates.set(key, {
          hour,
          profile_id: record.profile_id,
          campaign_id: record.payload.campaign_id || '',
          ad_group_id: record.payload.ad_group_id || '',
          target_id: record.payload.target_id || record.payload.keyword_id || '',
          clicks: 0,
          impressions: 0,
          cost_micros: 0,
          attributed_conversions_1d: 0,
          attributed_conversions_7d: 0,
          attributed_sales_1d_micros: 0,
          attributed_sales_7d_micros: 0
        });
      }

      const agg = hourlyAggregates.get(key)!;
      agg.clicks += record.payload.clicks || 0;
      agg.impressions += record.payload.impressions || 0;
      agg.cost_micros += Math.round((record.payload.cost || 0) * 1000000);
      agg.attributed_conversions_1d += record.payload.attributed_conversions_1d || 0;
      agg.attributed_conversions_7d += record.payload.attributed_conversions_7d || 0;
      agg.attributed_sales_1d_micros += Math.round((record.payload.attributed_sales_1d || 0) * 1000000);
      agg.attributed_sales_7d_micros += Math.round((record.payload.attributed_sales_7d || 0) * 1000000);
    }
  }

  // Upsert aggregated data into fact tables
  if (budgetAggregates.size > 0) {
    const budgetFacts = Array.from(budgetAggregates.values());
    const { error: budgetError } = await supabase
      .from('fact_budget_usage')
      .upsert(budgetFacts, {
        onConflict: 'minute,profile_id,campaign_id',
        ignoreDuplicates: false
      });

    if (budgetError) {
      throw new Error(`Failed to upsert budget facts: ${budgetError.message}`);
    }

    console.log(`Upserted ${budgetFacts.length} budget usage facts`);
  }

  if (hourlyAggregates.size > 0) {
    const hourlyFacts = Array.from(hourlyAggregates.values());
    
    // Determine target table based on dataset
    let targetTable = 'fact_sp_hourly';
    if (dataset.includes('sb-performance')) {
      targetTable = 'fact_sb_hourly';
    } else if (dataset.includes('sd-performance')) {
      targetTable = 'fact_sd_hourly';
    }

    const { error: hourlyError } = await supabase
      .from(targetTable)
      .upsert(hourlyFacts, {
        onConflict: 'hour,profile_id,campaign_id,ad_group_id,target_id',
        ignoreDuplicates: false
      });

    if (hourlyError) {
      throw new Error(`Failed to upsert hourly facts to ${targetTable}: ${hourlyError.message}`);
    }

    console.log(`Upserted ${hourlyFacts.length} hourly facts to ${targetTable}`);
  }

  return { 
    processed: stagingRecords.length, 
    maxTimestamp 
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase configuration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Starting AMS hourly compaction job');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Process different datasets
    const datasets = [
      'sp-performance',
      'sb-performance', 
      'sd-performance',
      'budget-usage'
    ];

    const results: Record<string, any> = {};
    
    for (const dataset of datasets) {
      try {
        const watermarkKey = `ams_compact_${dataset.replace('-', '_')}_watermark`;
        const lastWatermark = await getWatermark(supabase, watermarkKey);
        
        const result = await compactDataset(supabase, dataset, lastWatermark);
        
        if (result.maxTimestamp) {
          await setWatermark(supabase, watermarkKey, result.maxTimestamp);
        }
        
        results[dataset] = result;
        
      } catch (error) {
        console.error(`Error compacting ${dataset}:`, error);
        results[dataset] = { error: (error as Error).message };
      }
    }

    console.log('AMS compaction completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('AMS compaction error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Compaction failed',
        message: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});