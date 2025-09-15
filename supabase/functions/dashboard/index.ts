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
        // Get traffic data from AMS stream
        const { data: trafficData, error: trafficError } = await supabase
          .from('ams_messages_sp_traffic')
          .select('clicks, impressions, cost')
          .eq('profile_id', profileId)
          .gte('hour_start', from)
          .lte('hour_start', to);
          
        if (trafficError) throw trafficError;
        
        // Get conversion data from AMS stream
        const { data: conversionData, error: conversionError } = await supabase
          .from('ams_messages_sp_conversion')
          .select('attributed_conversions, attributed_sales')
          .eq('profile_id', profileId)
          .gte('hour_start', from)
          .lte('hour_start', to);
          
        if (conversionError) throw conversionError;
        
        // Aggregate traffic metrics
        const trafficTotals = (trafficData || []).reduce((acc: any, row: any) => {
          acc.cost_micros += (row.cost || 0) * 1e6;
          acc.clicks += row.clicks || 0;
          acc.impressions += row.impressions || 0;
          return acc;
        }, { cost_micros: 0, clicks: 0, impressions: 0 });
        
        // Aggregate conversion metrics
        const conversionTotals = (conversionData || []).reduce((acc: any, row: any) => {
          acc.sales_7d_micros += (row.attributed_sales || 0) * 1e6;
          acc.conv_7d += row.attributed_conversions || 0;
          return acc;
        }, { sales_7d_micros: 0, conv_7d: 0 });
        
        const totals = { ...trafficTotals, ...conversionTotals };
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
        // Get traffic data grouped by entity
        const { data: trafficData, error: trafficError } = await supabase
          .from('ams_messages_sp_traffic')
          .select('campaign_id, ad_group_id, clicks, impressions, cost')
          .eq('profile_id', profileId)
          .gte('hour_start', from)
          .lte('hour_start', to);
        
        if (trafficError) throw trafficError;
        
        // Get conversion data grouped by entity
        const { data: conversionData, error: conversionError } = await supabase
          .from('ams_messages_sp_conversion')
          .select('campaign_id, ad_group_id, attributed_conversions, attributed_sales')
          .eq('profile_id', profileId)
          .gte('hour_start', from)
          .lte('hour_start', to);
          
        if (conversionError) throw conversionError;
        
        // Group traffic by entity
        const grouped: Record<string, any> = {};
        for (const row of trafficData || []) {
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
          grouped[key].cost_micros += (row.cost || 0) * 1e6;
          grouped[key].clicks += row.clicks || 0;
          grouped[key].impressions += row.impressions || 0;
        }
        
        // Add conversion data to grouped entities
        for (const row of conversionData || []) {
          const key = level === 'campaign' ? row.campaign_id : row.ad_group_id;
          if (!key || !grouped[key]) continue;
          grouped[key].sales_7d_micros += (row.attributed_sales || 0) * 1e6;
          grouped[key].conv_7d += row.attributed_conversions || 0;
        }

        // Resolve names from entity tables
        const keys = Object.keys(grouped);
        if (keys.length > 0) {
          if (level === 'campaign') {
            const { data: entities } = await supabase
              .from('entity_campaigns')
              .select('campaign_id, name')
              .in('campaign_id', keys);
            const nameMap = Object.fromEntries((entities || []).map((e: any) => [e.campaign_id, e.name]));
            for (const k of keys) grouped[k].name = nameMap[k] || k;
          } else if (level === 'ad_group') {
            const { data: entities } = await supabase
              .from('entity_ad_groups')
              .select('ad_group_id, name')
              .in('ad_group_id', keys);
            const nameMap = Object.fromEntries((entities || []).map((e: any) => [e.ad_group_id, e.name]));
            for (const k of keys) grouped[k].name = nameMap[k] || k;
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
        
        // Get traffic data for the specific entity
        const { data: trafficData, error: trafficError } = await supabase
          .from('ams_messages_sp_traffic')
          .select('hour_start, clicks, impressions, cost')
          .eq('profile_id', profileId)
          .eq(idCol, entityId)
          .gte('hour_start', from)
          .lte('hour_start', to)
          .order('hour_start');
          
        if (trafficError) throw trafficError;
        
        // Get conversion data for the specific entity
        const { data: conversionData, error: conversionError } = await supabase
          .from('ams_messages_sp_conversion')
          .select('hour_start, attributed_conversions, attributed_sales')
          .eq('profile_id', profileId)
          .eq(idCol, entityId)
          .gte('hour_start', from)
          .lte('hour_start', to);
          
        if (conversionError) throw conversionError;

        // Group by date (not hour)
        const timeseries: Record<string, any> = {};
        
        for (const row of trafficData || []) {
          const dateKey = new Date(row.hour_start).toISOString().split('T')[0];
          if (!timeseries[dateKey]) {
            timeseries[dateKey] = { date: dateKey, cost_micros: 0, sales_7d_micros: 0, clicks: 0, impressions: 0 };
          }
          timeseries[dateKey].cost_micros += (row.cost || 0) * 1e6;
          timeseries[dateKey].clicks += row.clicks || 0;
          timeseries[dateKey].impressions += row.impressions || 0;
        }
        
        for (const row of conversionData || []) {
          const dateKey = new Date(row.hour_start).toISOString().split('T')[0];
          if (!timeseries[dateKey]) {
            timeseries[dateKey] = { date: dateKey, cost_micros: 0, sales_7d_micros: 0, clicks: 0, impressions: 0 };
          }
          timeseries[dateKey].sales_7d_micros += (row.attributed_sales || 0) * 1e6;
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