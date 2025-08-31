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
        const { data, error } = await supabase
          .from(`v_${level}_daily`)
          .select('*')
          .eq('profile_id', profileId)
          .gte('date', from)
          .lte('date', to);
          
        if (error) throw error;
        
        // Aggregate KPIs
        const totals = data.reduce((acc: any, row: any) => {
          const metrics = calculateMetrics(row);
          acc.cost_micros += row.cost_micros || 0;
          acc.sales_7d_micros += row.sales_7d_micros || 0;
          acc.clicks += row.clicks || 0;
          acc.impressions += row.impressions || 0;
          acc.conv_7d += row.conv_7d || 0;
          return acc;
        }, { cost_micros: 0, sales_7d_micros: 0, clicks: 0, impressions: 0, conv_7d: 0 });
        
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
        let query = supabase
          .from(`v_${level}_daily`)
          .select('*')
          .eq('profile_id', profileId)
          .gte('date', from)
          .lte('date', to);
          
        if (entityId) {
          const entityIdCol = level === 'campaign' ? 'campaign_id' : 
                             level === 'ad_group' ? 'ad_group_id' : 'target_id';
          query = query.eq(entityIdCol, entityId);
        }
        
        const { data, error } = await query
          .order(sort, { ascending: false })
          .limit(limit);
          
        if (error) throw error;
        
        // Group by entity and calculate metrics
        const grouped = data.reduce((acc: any, row: any) => {
          const key = level === 'campaign' ? row.campaign_id :
                     level === 'ad_group' ? row.ad_group_id : row.target_id;
          const name = level === 'campaign' ? row.campaign_name :
                      level === 'ad_group' ? row.ad_group_name : 
                      `${row.match_type}: ${JSON.stringify(row.expression)}`;
          
          if (!acc[key]) {
            acc[key] = {
              id: key,
              name,
              cost_micros: 0,
              sales_7d_micros: 0,
              clicks: 0,
              impressions: 0,
              conv_7d: 0
            };
          }
          
          acc[key].cost_micros += row.cost_micros || 0;
          acc[key].sales_7d_micros += row.sales_7d_micros || 0;
          acc[key].clicks += row.clicks || 0;
          acc[key].impressions += row.impressions || 0;
          acc[key].conv_7d += row.conv_7d || 0;
          
          return acc;
        }, {});
        
        const rows = Object.values(grouped).map((item: any) => ({
          ...item,
          ...calculateMetrics(item)
        }));
        
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
        const { data, error } = await supabase
          .from(`v_${level}_daily`)
          .select('*')
          .eq('profile_id', profileId)
          .gte('date', from)
          .lte('date', to)
          .eq(level === 'campaign' ? 'campaign_id' : 
              level === 'ad_group' ? 'ad_group_id' : 'target_id', entityId)
          .order('date');
          
        if (error) throw error;
        
        // Group by date
        const timeseries = data.reduce((acc: any, row: any) => {
          const dateKey = row.date;
          if (!acc[dateKey]) {
            acc[dateKey] = {
              date: dateKey,
              cost_micros: 0,
              sales_7d_micros: 0,
              clicks: 0,
              impressions: 0
            };
          }
          
          acc[dateKey].cost_micros += row.cost_micros || 0;
          acc[dateKey].sales_7d_micros += row.sales_7d_micros || 0;
          acc[dateKey].clicks += row.clicks || 0;
          acc[dateKey].impressions += row.impressions || 0;
          
          return acc;
        }, {});
        
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