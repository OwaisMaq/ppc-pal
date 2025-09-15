import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardKPIs {
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  clicks: number;
  impressions: number;
  cpc: number;
  ctr: number;
  cvr: number;
  conversions: number;
}

interface TableRow {
  id: string;
  name: string;
  clicks: number;
  impressions: number;
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  cpc: number;
  ctr: number;
  cvr: number;
  conversions: number;
}

interface TimeseriesPoint {
  date: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
}

// Metric calculation helpers
function calculateMetrics(row: any): Partial<DashboardKPIs> {
  const spend = (row.cost_micros || 0) / 1e6;
  const sales = (row.sales_7d_micros || 0) / 1e6;
  const clicks = row.clicks || 0;
  const impressions = row.impressions || 0;
  const conversions = row.conv_7d || 0;
  
  return {
    spend,
    sales,
    clicks,
    impressions,
    conversions,
    acos: sales > 0 ? (spend / sales) * 100 : 0,
    roas: spend > 0 ? sales / spend : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cvr: clicks > 0 ? (conversions / clicks) * 100 : 0,
  };
}

async function checkEntitlements(supabase: any, userId: string, level: string): Promise<boolean> {
  // Check user's plan from billing_subscriptions
  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single();
  
  const plan = subscription?.plan || 'free';
  
  // Gate features based on plan
  switch (level) {
    case 'campaign':
    case 'ad_group':
      return true; // Available for all plans
    case 'target':
      return ['starter', 'pro'].includes(plan);
    case 'search_term':
      return ['starter', 'pro'].includes(plan);
    case 'placement':
      return plan === 'pro';
    default:
      return false;
  }
}

// Background entity sync trigger
async function triggerEntitySync(supabase: any, profileId: string, entityType: string): Promise<void> {
  try {
    // Check if sync is already in progress
    const { data: recentRun } = await supabase
      .from('sync_runs')
      .select('id, status, started_at')
      .eq('profile_id', profileId)
      .eq('entity_type', entityType)
      .gte('started_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .eq('status', 'running')
      .maybeSingle();
    
    if (recentRun) {
      console.log(`Entity sync already in progress for ${profileId}:${entityType}`);
      return;
    }
    
    // Trigger entity sync in background
    console.log(`Triggering background entity sync for ${profileId}:${entityType}`);
    const { error } = await supabase.functions.invoke('entities-sync-runner', {
      body: { profileId, entity: entityType, mode: 'incremental' }
    });
    
    if (error) {
      console.warn(`Failed to trigger entity sync for ${profileId}:${entityType}:`, error.message);
    }
  } catch (error) {
    console.warn(`Error triggering entity sync for ${profileId}:${entityType}:`, error);
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase configuration' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-request-id': requestId
        }
      }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-request-id': requestId
          }
        }
      );
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-request-id': requestId
          }
        }
      );
    }

    const profileId = url.searchParams.get('profileId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const level = url.searchParams.get('level') || 'campaign';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const cursor = url.searchParams.get('cursor');
    const sort = url.searchParams.get('sort') || 'spend';
    const entityId = url.searchParams.get('entityId');
    
    if (!profileId || !from || !to) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: profileId, from, to' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-request-id': requestId
          }
        }
      );
    }

    // Check entitlements
    const hasAccess = await checkEntitlements(supabase, user.id, level);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for this data level' }),
        { 
          status: 403, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-request-id': requestId
          }
        }
      );
    }

    // Verify user owns this profile
    const { data: connection } = await supabase
      .from('amazon_connections')
      .select('id')
      .eq('profile_id', profileId)
      .eq('user_id', user.id)
      .single();
      
    if (!connection) {
      return new Response(
        JSON.stringify({ error: 'Profile not found or unauthorized' }),
        { 
          status: 404, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-request-id': requestId
          }
        }
      );
    }

    const duration = Date.now() - startTime;

    // Handle different endpoints
    switch (path) {
      case 'kpis': {
        // Get aggregated data from fact table
        const { data: factData, error: factError } = await supabase
          .from('fact_search_term_daily')
          .select('clicks,impressions,cost_micros,attributed_conversions_7d,attributed_sales_7d_micros')
          .eq('profile_id', profileId)
          .gte('date', from)
          .lte('date', to);
          
        if (factError) throw factError;
        
        // Aggregate metrics with proper null handling
        const totals = (factData || []).reduce((acc: any, row: any) => {
          acc.cost_micros += row.cost_micros || 0;
          acc.clicks += row.clicks || 0;
          acc.impressions += row.impressions || 0;
          acc.sales_7d_micros += row.attributed_sales_7d_micros || 0;
          acc.conv_7d += row.attributed_conversions_7d || 0;
          return acc;
        }, { cost_micros: 0, clicks: 0, impressions: 0, sales_7d_micros: 0, conv_7d: 0 });
        
        const kpis = calculateMetrics(totals);
        
        return new Response(
          JSON.stringify({ ...kpis, duration_ms: duration }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'x-request-id': requestId
            }
          }
        );
      }
      
      case 'table': {
        // Get data from fact table grouped by entity
        const { data: factData, error: factError } = await supabase
          .from('fact_search_term_daily')
          .select('campaign_id,ad_group_id,clicks,impressions,cost_micros,attributed_conversions_7d,attributed_sales_7d_micros')
          .eq('profile_id', profileId)
          .gte('date', from)
          .lte('date', to);
        
        if (factError) throw factError;
        
        // Group by entity with proper null handling
        const grouped: Record<string, any> = {};
        for (const row of factData || []) {
          const key = level === 'campaign' ? row.campaign_id : row.ad_group_id;
          if (!key) continue;
          if (!grouped[key]) {
            grouped[key] = {
              id: key,
              name: key,
              cost_micros: 0,
              sales_7d_micros: 0,
              clicks: 0,
              impressions: 0,
              conv_7d: 0
            };
          }
          grouped[key].cost_micros += row.cost_micros || 0;
          grouped[key].clicks += row.clicks || 0;
          grouped[key].impressions += row.impressions || 0;
          grouped[key].sales_7d_micros += row.attributed_sales_7d_micros || 0;
          grouped[key].conv_7d += row.attributed_conversions_7d || 0;
        }

        // Resolve names from entity tables with fallbacks
        const keys = Object.keys(grouped);
        let entitiesFound = false;
        
        if (keys.length > 0) {
          if (level === 'campaign') {
            const { data: entities, error: entityError } = await supabase
              .from('entity_campaigns')
              .select('campaign_id, name')
              .eq('profile_id', profileId)
              .in('campaign_id', keys);
            
            if (!entityError && entities && entities.length > 0) {
              entitiesFound = true;
              const nameMap = Object.fromEntries(entities.map((e: any) => [e.campaign_id, e.name]));
              for (const k of keys) {
                grouped[k].name = nameMap[k] || `Campaign ${k}`;
              }
            } else {
              // Trigger entity sync in background if no entities found
              console.log(`No campaign entities found for profile ${profileId}, triggering sync`);
              triggerEntitySync(supabase, profileId, 'campaigns').catch(console.error);
              for (const k of keys) grouped[k].name = `Campaign ${k}`;
            }
          } else if (level === 'ad_group') {
            const { data: entities, error: entityError } = await supabase
              .from('entity_ad_groups')
              .select('ad_group_id, name')
              .eq('profile_id', profileId)
              .in('ad_group_id', keys);
            
            if (!entityError && entities && entities.length > 0) {
              entitiesFound = true; 
              const nameMap = Object.fromEntries(entities.map((e: any) => [e.ad_group_id, e.name]));
              for (const k of keys) {
                grouped[k].name = nameMap[k] || `Ad Group ${k}`;
              }
            } else {
              // Trigger entity sync in background if no entities found
              console.log(`No ad group entities found for profile ${profileId}, triggering sync`);
              triggerEntitySync(supabase, profileId, 'ad_groups').catch(console.error);
              for (const k of keys) grouped[k].name = `Ad Group ${k}`;
            }
          }
        }

        // Sort and limit
        const rows = Object.values(grouped)
          .map((item: any) => ({ ...item, ...calculateMetrics(item) }))
          .sort((a: any, b: any) => (b[sort] ?? 0) - (a[sort] ?? 0))
          .slice(0, limit);
        
        return new Response(
          JSON.stringify({ rows, duration_ms: duration }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'x-request-id': requestId
            }
          }
        );
      }
      
      case 'timeseries': {
        if (!entityId) {
          return new Response(
            JSON.stringify({ error: 'entityId is required for timeseries' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
          );
        }
        const idCol = level === 'campaign' ? 'campaign_id' : 'ad_group_id';
        
        // Get data from fact table for the specific entity
        const { data: factData, error: factError } = await supabase
          .from('fact_search_term_daily')
          .select('date,clicks,impressions,cost_micros,attributed_conversions_7d,attributed_sales_7d_micros')
          .eq('profile_id', profileId)
          .eq(idCol, entityId)
          .gte('date', from)
          .lte('date', to)
          .order('date');
          
        if (factError) throw factError;

        // Group by date with proper null handling
        const timeseries: Record<string, any> = {};
        
        for (const row of factData || []) {
          const dateKey = row.date;
          if (!timeseries[dateKey]) {
            timeseries[dateKey] = { date: dateKey, cost_micros: 0, sales_7d_micros: 0, clicks: 0, impressions: 0 };
          }
          timeseries[dateKey].cost_micros += row.cost_micros || 0;
          timeseries[dateKey].clicks += row.clicks || 0;
          timeseries[dateKey].impressions += row.impressions || 0;
          timeseries[dateKey].sales_7d_micros += row.attributed_sales_7d_micros || 0;
        }

        const points = Object.values(timeseries).map((item: any) => ({
          date: item.date,
          spend: item.cost_micros / 1e6,
          sales: item.sales_7d_micros / 1e6,
          clicks: item.clicks,
          impressions: item.impressions
        }));

        return new Response(
          JSON.stringify({ points, duration_ms: duration }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'x-request-id': requestId
            }
          }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { 
            status: 404, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'x-request-id': requestId
            }
          }
        );
    }
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        x_request_id: requestId
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-request-id': requestId
        }
      }
    );
  }
});