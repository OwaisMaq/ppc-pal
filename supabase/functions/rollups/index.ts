import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      case 'kpis':
        return await handleKpisRequest(req, supabase);
      case 'breakdown':
        return await handleBreakdownRequest(req, supabase);
      default:
        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Error in rollups function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleKpisRequest(req: Request, supabase: any) {
  const url = new URL(req.url);
  const profileIds = url.searchParams.get('profileIds')?.split(',');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const baseCurrency = url.searchParams.get('base') || 'GBP';

  if (!profileIds || !from || !to) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: profileIds, from, to' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get campaign daily facts with FX conversion
    const { data: campaignData, error: campaignError } = await supabase.rpc('get_campaign_rollup_kpis', {
      p_profile_ids: profileIds,
      p_from_date: from,
      p_to_date: to,
      p_base_currency: baseCurrency
    });

    if (campaignError) {
      console.error('Campaign rollup error:', campaignError);
      // Fallback to manual calculation if RPC doesn't exist
      return await calculateKpisManually(supabase, profileIds, from, to, baseCurrency);
    }

    return new Response(
      JSON.stringify({ kpis: campaignData[0] || {} }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in KPIs calculation:', error);
    // Fallback to manual calculation
    return await calculateKpisManually(supabase, profileIds, from, to, baseCurrency);
  }
}

async function calculateKpisManually(supabase: any, profileIds: string[], from: string, to: string, baseCurrency: string) {
  try {
    // Get profile currencies
    const { data: profileCurrencies, error: currencyError } = await supabase
      .from('profile_currency')
      .select('profile_id, currency')
      .in('profile_id', profileIds);

    if (currencyError) throw currencyError;

    // Create a map of profile to currency
    const currencyMap = new Map(
      profileCurrencies.map((pc: any) => [pc.profile_id, pc.currency])
    );

    // Get campaign facts for all profiles
    const { data: campaigns, error: campaignError } = await supabase
      .from('v_campaign_daily')
      .select('*')
      .in('profile_id', profileIds)
      .gte('date', from)
      .lte('date', to);

    if (campaignError) throw campaignError;

    // Calculate totals with FX conversion
    let totalSpendBase = 0;
    let totalSalesBase = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalConversions = 0;

    for (const campaign of campaigns) {
      const profileCurrency = currencyMap.get(campaign.profile_id) || 'USD';
      
      // Get FX rate for this date and currency
      const { data: fxRate } = await supabase.rpc('fx_rate', {
        p_date: campaign.date,
        p_from: profileCurrency,
        p_to: baseCurrency
      });

      const rate = fxRate || 1.0;
      
      totalSpendBase += (campaign.cost_micros / 1000000) * rate;
      totalSalesBase += (campaign.sales_7d_micros / 1000000) * rate;
      totalClicks += campaign.clicks || 0;
      totalImpressions += campaign.impressions || 0;
      totalConversions += campaign.orders_7d || 0;
    }

    const kpis = {
      totalSpend: totalSpendBase,
      totalSales: totalSalesBase,
      totalClicks,
      totalImpressions,
      totalConversions,
      avgACOS: totalSalesBase > 0 ? (totalSpendBase / totalSalesBase) * 100 : 0,
      avgROAS: totalSpendBase > 0 ? totalSalesBase / totalSpendBase : 0,
      avgCPC: totalClicks > 0 ? totalSpendBase / totalClicks : 0,
      avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgCVR: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      baseCurrency
    };

    return new Response(
      JSON.stringify({ kpis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in manual KPIs calculation:', error);
    throw error;
  }
}

async function handleBreakdownRequest(req: Request, supabase: any) {
  const url = new URL(req.url);
  const dimension = url.searchParams.get('dimension') || 'profile';
  const profileIds = url.searchParams.get('profileIds')?.split(',');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const baseCurrency = url.searchParams.get('base') || 'GBP';
  const limit = parseInt(url.searchParams.get('limit') || '10');

  if (!profileIds || !from || !to) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: profileIds, from, to' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get profile currencies
    const { data: profileCurrencies, error: currencyError } = await supabase
      .from('profile_currency')
      .select('profile_id, currency')
      .in('profile_id', profileIds);

    if (currencyError) throw currencyError;

    const currencyMap = new Map(
      profileCurrencies.map((pc: any) => [pc.profile_id, pc.currency])
    );

    // Get marketplace info for profiles
    const { data: connections, error: connectionsError } = await supabase
      .from('amazon_connections')
      .select('profile_id, marketplace_id')
      .in('profile_id', profileIds);

    if (connectionsError) throw connectionsError;

    const marketplaceMap = new Map(
      connections.map((conn: any) => [conn.profile_id, conn.marketplace_id])
    );

    // Get campaign data
    const { data: campaigns, error: campaignError } = await supabase
      .from('v_campaign_daily')
      .select('*')
      .in('profile_id', profileIds)
      .gte('date', from)
      .lte('date', to);

    if (campaignError) throw campaignError;

    // Group by dimension and calculate totals
    const groups = new Map();

    for (const campaign of campaigns) {
      let groupKey: string;
      let groupLabel: string;

      switch (dimension) {
        case 'marketplace':
          groupKey = marketplaceMap.get(campaign.profile_id) || 'Unknown';
          groupLabel = groupKey;
          break;
        case 'profile':
          groupKey = campaign.profile_id;
          groupLabel = campaign.profile_id;
          break;
        case 'campaignType':
          groupKey = campaign.campaign_type || 'Unknown';
          groupLabel = groupKey;
          break;
        default:
          groupKey = 'All';
          groupLabel = 'All';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          spendBase: 0,
          salesBase: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0
        });
      }

      const group = groups.get(groupKey);
      const profileCurrency = currencyMap.get(campaign.profile_id) || 'USD';
      
      // Get FX rate
      const { data: fxRate } = await supabase.rpc('fx_rate', {
        p_date: campaign.date,
        p_from: profileCurrency,
        p_to: baseCurrency
      });

      const rate = fxRate || 1.0;
      
      group.spendBase += (campaign.cost_micros / 1000000) * rate;
      group.salesBase += (campaign.sales_7d_micros / 1000000) * rate;
      group.clicks += campaign.clicks || 0;
      group.impressions += campaign.impressions || 0;
      group.conversions += campaign.orders_7d || 0;
    }

    // Convert to array and calculate derived metrics
    const breakdown = Array.from(groups.values())
      .map((group: any) => ({
        ...group,
        acos: group.salesBase > 0 ? (group.spendBase / group.salesBase) * 100 : 0,
        roas: group.spendBase > 0 ? group.salesBase / group.spendBase : 0,
        cpc: group.clicks > 0 ? group.spendBase / group.clicks : 0,
        ctr: group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0,
        cvr: group.clicks > 0 ? (group.conversions / group.clicks) * 100 : 0
      }))
      .sort((a, b) => b.spendBase - a.spendBase)
      .slice(0, limit);

    return new Response(
      JSON.stringify({ 
        breakdown,
        dimension,
        baseCurrency
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in breakdown calculation:', error);
    throw error;
  }
}