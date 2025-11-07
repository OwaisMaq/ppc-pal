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

// Field mapping with attribution window priority
function getFieldValue(row: any, baseField: string): number {
  // Priority: _14d > _7d > _legacy
  const field14d = row[`${baseField}_14d`];
  const field7d = row[`${baseField}_7d`];
  const fieldLegacy = row[`${baseField}_legacy`];
  
  return field14d ?? field7d ?? fieldLegacy ?? 0;
}

// Metric calculation helpers with proper field mapping
function calculateMetrics(row: any): Partial<DashboardKPIs> {
  const spend = getFieldValue(row, 'cost');
  const sales = getFieldValue(row, 'attributed_sales');
  const clicks = row.clicks || row.clicks_14d || row.clicks_7d || 0;
  const impressions = row.impressions || row.impressions_14d || row.impressions_7d || 0;
  const conversions = getFieldValue(row, 'attributed_conversions');
  
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
        let table: string;
        let selectFields: string;
        let additionalFilter = {};
        
        switch (level) {
          case 'campaign':
            table = 'campaigns';
            selectFields = 'impressions,clicks,impressions_14d,impressions_7d,clicks_14d,clicks_7d,cost_legacy,cost_14d,cost_7d,attributed_sales_legacy,attributed_sales_14d,attributed_sales_7d,attributed_conversions_legacy,attributed_conversions_14d,attributed_conversions_7d';
            additionalFilter = { connection_id: connection.id };
            break;
          case 'ad_group':
            table = 'ad_groups';
            selectFields = 'impressions,clicks,impressions_14d,impressions_7d,clicks_14d,clicks_7d,cost_legacy,cost_14d,cost_7d,attributed_sales_legacy,attributed_sales_14d,attributed_sales_7d,attributed_conversions_legacy,attributed_conversions_14d,attributed_conversions_7d';
            if (entityId) {
              additionalFilter = { campaign_id: entityId };
            }
            break;
          case 'target':
            table = 'targets';
            selectFields = 'impressions,clicks,impressions_14d,impressions_7d,clicks_14d,clicks_7d,cost_legacy,cost_14d,cost_7d,attributed_sales_legacy,attributed_sales_14d,attributed_sales_7d,attributed_conversions_legacy,attributed_conversions_14d,attributed_conversions_7d';
            if (entityId) {
              additionalFilter = { adgroup_id: entityId };
            }
            break;
          case 'search_term':
            table = 'keywords';
            selectFields = 'impressions,clicks,impressions_14d,impressions_7d,clicks_14d,clicks_7d,cost_legacy,cost_14d,cost_7d,attributed_sales_legacy,attributed_sales_14d,attributed_sales_7d,attributed_conversions_legacy,attributed_conversions_14d,attributed_conversions_7d';
            if (entityId) {
              additionalFilter = { adgroup_id: entityId };
            }
            break;
          default:
            throw new Error(`Unsupported level: ${level}`);
        }
        
        // Query entity table
        let query = supabase
          .from(table)
          .select(selectFields);
        
        if (level === 'campaign') {
          query = query.eq('connection_id', connection.id);
        } else {
          // For sub-campaign entities, filter by profile through campaigns join
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('connection_id', connection.id);
          
          const campaignIds = (campaigns || []).map((c: any) => c.id);
          if (campaignIds.length === 0) {
            // No campaigns found, return zeros
            const kpis: DashboardKPIs = {
              spend: 0, sales: 0, acos: 0, roas: 0, clicks: 0,
              impressions: 0, cpc: 0, ctr: 0, cvr: 0, conversions: 0
            };
            return new Response(
              JSON.stringify({ ...kpis, duration_ms: duration }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
            );
          }
          
          if (level === 'ad_group') {
            query = query.in('campaign_id', campaignIds);
          } else {
            // For targets/keywords, need to filter through ad_groups
            const { data: adGroups } = await supabase
              .from('ad_groups')
              .select('id')
              .in('campaign_id', campaignIds);
            
            const adGroupIds = (adGroups || []).map((ag: any) => ag.id);
            if (adGroupIds.length === 0) {
              const kpis: DashboardKPIs = {
                spend: 0, sales: 0, acos: 0, roas: 0, clicks: 0,
                impressions: 0, cpc: 0, ctr: 0, cvr: 0, conversions: 0
              };
              return new Response(
                JSON.stringify({ ...kpis, duration_ms: duration }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
              );
            }
            
            query = query.in('adgroup_id', adGroupIds);
          }
        }
        
        if (entityId) {
          if (level === 'ad_group') {
            query = query.eq('campaign_id', entityId);
          } else if (level === 'target' || level === 'search_term') {
            query = query.eq('adgroup_id', entityId);
          }
        }
        
        const { data: entityData, error: entityError } = await query;
        if (entityError) throw entityError;
        
        // Aggregate metrics
        const totals = (entityData || []).reduce((acc: any, row: any) => {
          acc.cost += getFieldValue(row, 'cost');
          acc.attributed_sales += getFieldValue(row, 'attributed_sales');
          acc.clicks += row.clicks || row.clicks_14d || row.clicks_7d || 0;
          acc.impressions += row.impressions || row.impressions_14d || row.impressions_7d || 0;
          acc.attributed_conversions += getFieldValue(row, 'attributed_conversions');
          return acc;
        }, { cost: 0, attributed_sales: 0, clicks: 0, impressions: 0, attributed_conversions: 0 });
        
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
        let table: string;
        let selectFields: string;
        let idField: string;
        let nameField: string;
        
        switch (level) {
          case 'campaign':
            table = 'campaigns';
            selectFields = 'id,name,impressions,clicks,impressions_14d,impressions_7d,clicks_14d,clicks_7d,cost_legacy,cost_14d,cost_7d,attributed_sales_legacy,attributed_sales_14d,attributed_sales_7d,attributed_conversions_legacy,attributed_conversions_14d,attributed_conversions_7d';
            idField = 'id';
            nameField = 'name';
            break;
          case 'ad_group':
            table = 'ad_groups';
            selectFields = 'id,name,impressions,clicks,impressions_14d,impressions_7d,clicks_14d,clicks_7d,cost_legacy,cost_14d,cost_7d,attributed_sales_legacy,attributed_sales_14d,attributed_sales_7d,attributed_conversions_legacy,attributed_conversions_14d,attributed_conversions_7d';
            idField = 'id';
            nameField = 'name';
            break;
          case 'target':
            table = 'targets';
            selectFields = 'id,keyword_text,impressions,clicks,impressions_14d,impressions_7d,clicks_14d,clicks_7d,cost_legacy,cost_14d,cost_7d,attributed_sales_legacy,attributed_sales_14d,attributed_sales_7d,attributed_conversions_legacy,attributed_conversions_14d,attributed_conversions_7d';
            idField = 'id';
            nameField = 'keyword_text';
            break;
          case 'search_term':
            table = 'keywords';
            selectFields = 'id,keyword_text,impressions,clicks,impressions_14d,impressions_7d,clicks_14d,clicks_7d,cost_legacy,cost_14d,cost_7d,attributed_sales_legacy,attributed_sales_14d,attributed_sales_7d,attributed_conversions_legacy,attributed_conversions_14d,attributed_conversions_7d';
            idField = 'id';
            nameField = 'keyword_text';
            break;
          default:
            throw new Error(`Unsupported level: ${level}`);
        }
        
        // Query entity table
        let query = supabase
          .from(table)
          .select(selectFields);
        
        if (level === 'campaign') {
          query = query.eq('connection_id', connection.id);
        } else {
          // For sub-campaign entities, filter by profile through campaigns
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('connection_id', connection.id);
          
          const campaignIds = (campaigns || []).map((c: any) => c.id);
          if (campaignIds.length === 0) {
            return new Response(
              JSON.stringify({ rows: [], duration_ms: duration }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
            );
          }
          
          if (level === 'ad_group') {
            query = query.in('campaign_id', campaignIds);
            if (entityId) {
              query = query.eq('campaign_id', entityId);
            }
          } else {
            // For targets/keywords, filter through ad_groups
            const { data: adGroups } = await supabase
              .from('ad_groups')
              .select('id')
              .in('campaign_id', campaignIds);
            
            const adGroupIds = (adGroups || []).map((ag: any) => ag.id);
            if (adGroupIds.length === 0) {
              return new Response(
                JSON.stringify({ rows: [], duration_ms: duration }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
              );
            }
            
            query = query.in('adgroup_id', adGroupIds);
            if (entityId) {
              query = query.eq('adgroup_id', entityId);
            }
          }
        }
        
        query = query.limit(limit);
        
        const { data: entityData, error: entityError } = await query;
        if (entityError) throw entityError;
        
        // Transform to table rows
        const rows = (entityData || []).map((row: any) => {
          const metrics = calculateMetrics(row);
          return {
            id: row[idField],
            name: row[nameField] || `${level} ${row[idField]}`,
            ...metrics
          };
        }).sort((a: any, b: any) => (b[sort] ?? 0) - (a[sort] ?? 0));
        
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
        
        let table: string;
        let selectFields: string;
        let idCol: string;
        
        switch (level) {
          case 'campaign':
            table = 'campaign_performance_history';
            selectFields = 'date,impressions,clicks,spend,sales,orders';
            idCol = 'campaign_id';
            break;
          case 'ad_group':
            table = 'adgroup_performance_history';
            selectFields = 'date,impressions,clicks,spend,sales,orders';
            idCol = 'adgroup_id';
            break;
          default:
            // For target/keyword/search_term, return empty for now or could aggregate from fact tables
            return new Response(
              JSON.stringify({ points: [], duration_ms: duration }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
            );
        }
        
        // Query history table
        const { data: historyData, error: historyError } = await supabase
          .from(table)
          .select(selectFields)
          .eq(idCol, entityId)
          .eq('attribution_window', '14d')
          .gte('date', from)
          .lte('date', to)
          .order('date');
          
        if (historyError) throw historyError;

        const points = (historyData || []).map((row: any) => ({
          date: row.date,
          spend: row.spend || 0,
          sales: row.sales || 0,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0
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