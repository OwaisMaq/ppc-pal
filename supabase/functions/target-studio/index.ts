import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TargetFilters {
  type?: 'keyword' | 'product';
  matchType?: string;
  hasSales?: boolean;
  minClicks?: number;
  maxACOS?: number;
  asin?: string;
  category?: string;
  brand?: string;
  campaignId?: string;
  adGroupId?: string;
}

interface BulkTargetsRequest {
  profileId: string;
  targetIds: string[];
  action: 'pause' | 'enable' | 'bid-up' | 'bid-down';
  stepMicros?: number;
  minBidMicros?: number;
  maxBidMicros?: number;
}

interface BulkNegativesRequest {
  profileId: string;
  scope: 'campaign' | 'ad_group';
  campaignIds?: string[];
  adGroupIds?: string[];
  value: string; // ASIN or category reference
  matchType?: string;
}

interface BulkCreateTargetsRequest {
  profileId: string;
  adGroupId: string;
  targets: Array<{
    expression: any;
    bidMicros: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Set user context for RLS
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        await supabase.rpc('set_config', {
          key: 'request.jwt.claims',
          value: JSON.stringify({ sub: user.id }),
        });
      }
    }

    switch (path) {
      case 'targets':
        return await handleTargetsRequest(req, supabase);
      case 'purchased':
        return await handlePurchasedRequest(req, supabase);
      default:
        if (req.method === 'POST') {
          return await handleBulkActions(req, supabase, path);
        }
        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Error in target-studio function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleTargetsRequest(req: Request, supabase: any) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get('profileId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const cursor = url.searchParams.get('cursor');
  const sort = url.searchParams.get('sort') || 'clicks:desc';

  if (!profileId || !from || !to) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: profileId, from, to' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Parse filters
  const filters: TargetFilters = {
    type: url.searchParams.get('type') as 'keyword' | 'product' || undefined,
    matchType: url.searchParams.get('matchType') || undefined,
    hasSales: url.searchParams.get('hasSales') === 'true' || undefined,
    minClicks: url.searchParams.get('minClicks') ? parseInt(url.searchParams.get('minClicks')!) : undefined,
    maxACOS: url.searchParams.get('maxACOS') ? parseFloat(url.searchParams.get('maxACOS')!) : undefined,
    asin: url.searchParams.get('asin') || undefined,
    category: url.searchParams.get('category') || undefined,
    brand: url.searchParams.get('brand') || undefined,
    campaignId: url.searchParams.get('campaignId') || undefined,
    adGroupId: url.searchParams.get('adGroupId') || undefined,
  };

  try {
    // Query fact_target_daily with filters
    let query = supabase
      .from('fact_target_daily')
      .select(`
        target_id,
        target_type,
        expression,
        campaign_id,
        ad_group_id,
        sum(clicks)::bigint as total_clicks,
        sum(impressions)::bigint as total_impressions,
        sum(cost_micros)::bigint as total_cost_micros,
        sum(attributed_conversions_7d)::bigint as total_conversions,
        sum(attributed_sales_7d_micros)::bigint as total_sales_micros
      `)
      .eq('profile_id', profileId)
      .gte('date', from)
      .lte('date', to);

    // Apply filters
    if (filters.type) query = query.eq('target_type', filters.type);
    if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId);
    if (filters.adGroupId) query = query.eq('ad_group_id', filters.adGroupId);

    // Group by target and calculate aggregates
    const { data: rawData, error } = await query
      .groupBy('target_id, target_type, expression, campaign_id, ad_group_id')
      .order('total_clicks', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Calculate derived KPIs and apply additional filters
    const targets = rawData
      .map((row: any) => {
        const clicks = parseInt(row.total_clicks || '0');
        const impressions = parseInt(row.total_impressions || '0');
        const costMicros = parseInt(row.total_cost_micros || '0');
        const conversions = parseInt(row.total_conversions || '0');
        const salesMicros = parseInt(row.total_sales_micros || '0');

        const spend = costMicros / 1000000;
        const sales = salesMicros / 1000000;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
        const acos = sales > 0 ? (spend / sales) * 100 : 0;
        const roas = spend > 0 ? sales / spend : 0;

        return {
          targetId: row.target_id,
          targetType: row.target_type,
          expression: row.expression,
          campaignId: row.campaign_id,
          adGroupId: row.ad_group_id,
          clicks,
          impressions,
          spend,
          sales,
          conversions,
          ctr,
          cpc,
          cvr,
          acos,
          roas,
        };
      })
      .filter((target: any) => {
        if (filters.minClicks && target.clicks < filters.minClicks) return false;
        if (filters.maxACOS && target.acos > filters.maxACOS) return false;
        if (filters.hasSales && target.sales <= 0) return false;
        
        // Expression-based filters
        if (filters.matchType && target.expression?.matchType !== filters.matchType) return false;
        if (filters.asin && !JSON.stringify(target.expression).includes(filters.asin)) return false;
        
        return true;
      });

    // Calculate summary KPIs
    const summary = targets.reduce((acc: any, target: any) => {
      acc.totalSpend += target.spend;
      acc.totalSales += target.sales;
      acc.totalClicks += target.clicks;
      acc.totalImpressions += target.impressions;
      acc.totalConversions += target.conversions;
      return acc;
    }, {
      totalSpend: 0,
      totalSales: 0,
      totalClicks: 0,
      totalImpressions: 0,
      totalConversions: 0,
    });

    summary.avgACOS = summary.totalSales > 0 ? (summary.totalSpend / summary.totalSales) * 100 : 0;
    summary.avgROAS = summary.totalSpend > 0 ? summary.totalSales / summary.totalSpend : 0;
    summary.avgCPC = summary.totalClicks > 0 ? summary.totalSpend / summary.totalClicks : 0;
    summary.avgCTR = summary.totalImpressions > 0 ? (summary.totalClicks / summary.totalImpressions) * 100 : 0;
    summary.avgCVR = summary.totalClicks > 0 ? (summary.totalConversions / summary.totalClicks) * 100 : 0;

    return new Response(
      JSON.stringify({
        targets,
        summary,
        hasMore: targets.length === limit,
        nextCursor: targets.length === limit ? targets[targets.length - 1].targetId : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching targets:', error);
    throw error;
  }
}

async function handlePurchasedRequest(req: Request, supabase: any) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get('profileId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const advertisedAsin = url.searchParams.get('advertisedAsin');
  const campaignId = url.searchParams.get('campaignId');

  if (!profileId || !from || !to) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: profileId, from, to' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    let query = supabase
      .from('fact_purchased_product_daily')
      .select(`
        purchased_asin,
        advertised_asin,
        campaign_id,
        ad_group_id,
        sum(units)::bigint as total_units,
        sum(sales_micros)::bigint as total_sales_micros
      `)
      .eq('profile_id', profileId)
      .gte('date', from)
      .lte('date', to);

    if (advertisedAsin) query = query.eq('advertised_asin', advertisedAsin);
    if (campaignId) query = query.eq('campaign_id', campaignId);

    const { data, error } = await query
      .groupBy('purchased_asin, advertised_asin, campaign_id, ad_group_id')
      .order('total_sales_micros', { ascending: false });

    if (error) throw error;

    const purchasedProducts = data.map((row: any) => ({
      purchasedAsin: row.purchased_asin,
      advertisedAsin: row.advertised_asin,
      campaignId: row.campaign_id,
      adGroupId: row.ad_group_id,
      units: parseInt(row.total_units || '0'),
      sales: parseInt(row.total_sales_micros || '0') / 1000000,
    }));

    return new Response(
      JSON.stringify({ purchasedProducts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching purchased products:', error);
    throw error;
  }
}

async function handleBulkActions(req: Request, supabase: any, action: string | undefined) {
  const body = await req.json();

  try {
    switch (action) {
      case 'pause':
      case 'enable':
      case 'bid-up':
      case 'bid-down':
        return await handleBulkTargets(body as BulkTargetsRequest, supabase);
      
      case 'negatives':
        return await handleBulkNegatives(body as BulkNegativesRequest, supabase);
      
      case 'create-targets':
        return await handleBulkCreateTargets(body as BulkCreateTargetsRequest, supabase);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid bulk action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in bulk action:', error);
    throw error;
  }
}

async function handleBulkTargets(request: BulkTargetsRequest, supabase: any) {
  const { profileId, targetIds, action, stepMicros, minBidMicros, maxBidMicros } = request;

  // Create actions in the action queue
  const actions = targetIds.map(targetId => ({
    rule_id: crypto.randomUUID(), // Generate a temp rule ID for bulk actions
    profile_id: profileId,
    action_type: action === 'pause' ? 'pause_target' : 
                action === 'enable' ? 'enable_target' :
                action === 'bid-up' ? 'increase_bid' : 'decrease_bid',
    payload: {
      targetId,
      stepMicros,
      minBidMicros,
      maxBidMicros
    },
    idempotency_key: `bulk_${action}_${targetId}_${Date.now()}`
  }));

  const { data, error } = await supabase
    .from('action_queue')
    .insert(actions)
    .select();

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true, 
      actionsEnqueued: actions.length,
      actionIds: data.map((a: any) => a.id)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleBulkNegatives(request: BulkNegativesRequest, supabase: any) {
  const { profileId, scope, campaignIds, adGroupIds, value, matchType } = request;

  const targetIds = scope === 'campaign' ? campaignIds : adGroupIds;
  if (!targetIds || targetIds.length === 0) {
    throw new Error(`Missing ${scope}Ids for bulk negatives`);
  }

  const actions = targetIds.map(targetId => ({
    rule_id: crypto.randomUUID(),
    profile_id: profileId,
    action_type: scope === 'campaign' ? 'add_campaign_negative' : 'add_adgroup_negative',
    payload: {
      [scope === 'campaign' ? 'campaignId' : 'adGroupId']: targetId,
      value,
      matchType
    },
    idempotency_key: `bulk_negative_${scope}_${targetId}_${value}_${Date.now()}`
  }));

  const { data, error } = await supabase
    .from('action_queue')
    .insert(actions)
    .select();

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true, 
      actionsEnqueued: actions.length,
      actionIds: data.map((a: any) => a.id)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleBulkCreateTargets(request: BulkCreateTargetsRequest, supabase: any) {
  const { profileId, adGroupId, targets } = request;

  const actions = targets.map((target, index) => ({
    rule_id: crypto.randomUUID(),
    profile_id: profileId,
    action_type: 'create_target',
    payload: {
      adGroupId,
      expression: target.expression,
      bidMicros: target.bidMicros
    },
    idempotency_key: `bulk_create_${adGroupId}_${index}_${Date.now()}`
  }));

  const { data, error } = await supabase
    .from('action_queue')
    .insert(actions)
    .select();

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true, 
      actionsEnqueued: actions.length,
      actionIds: data.map((a: any) => a.id)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}