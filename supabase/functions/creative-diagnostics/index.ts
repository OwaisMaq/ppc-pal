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
    const path = url.pathname;

    // GET /assets - list creative assets with performance
    if (req.method === 'GET' && path.endsWith('/assets')) {
      const profileId = url.searchParams.get('profileId');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const type = url.searchParams.get('type') || 'all';
      const sort = url.searchParams.get('sort') || 'impressions';
      const limit = parseInt(url.searchParams.get('limit') || '50');

      if (!profileId) {
        return new Response('Missing profileId parameter', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Build query for creative performance
      let query = supabase
        .from('v_creative_kpis')
        .select(`
          *,
          creative_assets(asset_type, metadata)
        `)
        .eq('profile_id', profileId);

      // Join with assets if type filter is specified
      if (type !== 'all') {
        query = query.eq('creative_assets.asset_type', type);
      }

      const { data: assets, error } = await query
        .order(sort, { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch assets: ${error.message}`);
      }

      // Calculate derived metrics
      const assetsWithMetrics = (assets || []).map(asset => ({
        ...asset,
        ctr: asset.impr > 0 ? (asset.clicks / asset.impr) * 100 : 0,
        cpc: asset.clicks > 0 ? asset.cost_micros / asset.clicks / 1000000 : 0,
        acos: asset.sales_micros > 0 ? (asset.cost_micros / asset.sales_micros) * 100 : 0,
        roas: asset.cost_micros > 0 ? asset.sales_micros / asset.cost_micros : 0,
        vtr_25: asset.vstarts > 0 ? (asset.vq25 / asset.vstarts) * 100 : null,
        vtr_50: asset.vstarts > 0 ? (asset.vq50 / asset.vstarts) * 100 : null,
        vtr_75: asset.vstarts > 0 ? (asset.vq75 / asset.vstarts) * 100 : null,
        vtr_100: asset.vstarts > 0 ? (asset.vcomp / asset.vstarts) * 100 : null,
      }));

      return new Response(JSON.stringify({ assets: assetsWithMetrics }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /ad-breakdown - get ads using a specific asset
    if (req.method === 'GET' && path.endsWith('/ad-breakdown')) {
      const profileId = url.searchParams.get('profileId');
      const assetId = url.searchParams.get('assetId');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');

      if (!profileId || !assetId) {
        return new Response('Missing required parameters', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Get ads using this asset
      const { data: adCreatives } = await supabase
        .from('ad_creatives')
        .select('ad_id, role')
        .eq('profile_id', profileId)
        .eq('asset_id', assetId);

      if (!adCreatives || adCreatives.length === 0) {
        return new Response(JSON.stringify({ ads: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const adIds = adCreatives.map(ac => ac.ad_id);

      // Get performance for these ads
      let performanceQuery = supabase
        .from('creative_performance_daily')
        .select('*')
        .eq('profile_id', profileId)
        .eq('asset_id', assetId)
        .in('ad_id', adIds);

      if (from) performanceQuery = performanceQuery.gte('date', from);
      if (to) performanceQuery = performanceQuery.lte('date', to);

      const { data: performance } = await performanceQuery;

      // Aggregate by ad_id
      const adPerformance = (performance || []).reduce((acc: any, perf: any) => {
        if (!acc[perf.ad_id]) {
          acc[perf.ad_id] = {
            ad_id: perf.ad_id,
            campaign_id: perf.campaign_id,
            ad_group_id: perf.ad_group_id,
            impressions: 0,
            clicks: 0,
            cost_micros: 0,
            conversions_7d: 0,
            sales_7d_micros: 0,
            video_starts: 0,
            video_q25: 0,
            video_q50: 0,
            video_q75: 0,
            video_completes: 0,
          };
        }
        
        const ad = acc[perf.ad_id];
        ad.impressions += perf.impressions || 0;
        ad.clicks += perf.clicks || 0;
        ad.cost_micros += perf.cost_micros || 0;
        ad.conversions_7d += perf.conversions_7d || 0;
        ad.sales_7d_micros += perf.sales_7d_micros || 0;
        ad.video_starts += perf.video_starts || 0;
        ad.video_q25 += perf.video_q25 || 0;
        ad.video_q50 += perf.video_q50 || 0;
        ad.video_q75 += perf.video_q75 || 0;
        ad.video_completes += perf.video_completes || 0;
        
        return acc;
      }, {});

      const ads = Object.values(adPerformance).map((ad: any) => ({
        ...ad,
        ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
        cpc: ad.clicks > 0 ? ad.cost_micros / ad.clicks / 1000000 : 0,
        acos: ad.sales_7d_micros > 0 ? (ad.cost_micros / ad.sales_7d_micros) * 100 : 0,
        roas: ad.cost_micros > 0 ? ad.sales_7d_micros / ad.cost_micros : 0,
        vtr_25: ad.video_starts > 0 ? (ad.video_q25 / ad.video_starts) * 100 : null,
        vtr_50: ad.video_starts > 0 ? (ad.video_q50 / ad.video_starts) * 100 : null,
        vtr_75: ad.video_starts > 0 ? (ad.video_q75 / ad.video_starts) * 100 : null,
        vtr_100: ad.video_starts > 0 ? (ad.video_completes / ad.video_starts) * 100 : null,
        role: adCreatives.find(ac => ac.ad_id === ad.ad_id)?.role || 'unknown'
      }));

      return new Response(JSON.stringify({ ads }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /underperformers - find underperforming assets
    if (req.method === 'GET' && path.endsWith('/underperformers')) {
      const profileId = url.searchParams.get('profileId');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const metric = url.searchParams.get('metric') || 'ctr';
      const threshold = parseFloat(url.searchParams.get('threshold') || '10'); // p10 percentile

      if (!profileId) {
        return new Response('Missing profileId parameter', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Get all assets with performance
      const { data: assets } = await supabase
        .from('v_creative_kpis')
        .select('*')
        .eq('profile_id', profileId)
        .gte('impr', 1000); // Minimum impressions for statistical significance

      if (!assets || assets.length === 0) {
        return new Response(JSON.stringify({ underperformers: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Calculate derived metrics and sort
      const assetsWithMetrics = assets.map(asset => ({
        ...asset,
        ctr: asset.impr > 0 ? (asset.clicks / asset.impr) * 100 : 0,
        cpc: asset.clicks > 0 ? asset.cost_micros / asset.clicks / 1000000 : 0,
        acos: asset.sales_micros > 0 ? (asset.cost_micros / asset.sales_micros) * 100 : 0,
        vtr_25: asset.vstarts > 0 ? (asset.vq25 / asset.vstarts) * 100 : null,
        vtr_50: asset.vstarts > 0 ? (asset.vq50 / asset.vstarts) * 100 : null,
        vtr_75: asset.vstarts > 0 ? (asset.vq75 / asset.vstarts) * 100 : null,
        vtr_100: asset.vstarts > 0 ? (asset.vcomp / asset.vstarts) * 100 : null,
      }));

      // Calculate percentile threshold
      const metricValues = assetsWithMetrics
        .map(a => a[metric as keyof typeof a] as number)
        .filter(v => v !== null && !isNaN(v))
        .sort((a, b) => a - b);

      const percentileIndex = Math.floor((threshold / 100) * metricValues.length);
      const thresholdValue = metricValues[percentileIndex] || 0;

      // Find underperformers
      const underperformers = assetsWithMetrics.filter(asset => {
        const value = asset[metric as keyof typeof asset] as number;
        return value !== null && !isNaN(value) && value <= thresholdValue;
      });

      return new Response(JSON.stringify({ 
        underperformers,
        threshold: thresholdValue,
        metric 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /sync-assets - trigger asset sync
    if (req.method === 'POST' && path.endsWith('/sync-assets')) {
      const { profileId } = await req.json();

      if (!profileId) {
        return new Response('Missing profileId', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // This would trigger the creative-diagnostics-runner
      // For now, just return success
      console.log(`Asset sync requested for profile ${profileId}`);

      return new Response(JSON.stringify({ 
        status: 'success',
        message: 'Asset sync started' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Creative diagnostics API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});