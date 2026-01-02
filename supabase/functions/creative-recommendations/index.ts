import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreativePerformance {
  asset_id: string;
  ad_id: string;
  profile_id: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  sales_7d_micros: number;
  conversions_7d: number;
  ctr: number;
  cpc: number;
  acos: number;
}

interface RecommendationConfig {
  min_impressions: number;
  ctr_threshold_pct: number;   // Below this CTR is underperforming
  acos_threshold_pct: number;  // Above this ACOS is underperforming
  lookback_days: number;
}

const DEFAULT_CONFIG: RecommendationConfig = {
  min_impressions: 1000,
  ctr_threshold_pct: 0.2,  // 0.2% CTR
  acos_threshold_pct: 50,  // 50% ACOS
  lookback_days: 14,
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

    // Parse request for user context
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    switch (req.method) {
      case 'GET':
        if (path === 'list') {
          return await handleListRecommendations(req, supabase);
        }
        break;
      case 'POST':
        if (path === 'generate') {
          return await handleGenerateRecommendations(req, supabase);
        }
        if (path === 'apply') {
          return await handleApplyRecommendation(req, supabase, userId);
        }
        if (path === 'dismiss') {
          return await handleDismissRecommendation(req, supabase);
        }
        break;
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in creative-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleListRecommendations(req: Request, supabase: any) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get('profileId');
  const status = url.searchParams.get('status') || 'pending';

  if (!profileId) {
    return new Response(
      JSON.stringify({ error: 'profileId is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .from('creative_recommendations')
    .select('*')
    .eq('profile_id', profileId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return new Response(
    JSON.stringify({ recommendations: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGenerateRecommendations(req: Request, supabase: any) {
  const body = await req.json();
  const { profile_id, config: userConfig } = body;

  if (!profile_id) {
    return new Response(
      JSON.stringify({ error: 'profile_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const config = { ...DEFAULT_CONFIG, ...userConfig };
  console.log(`[Creative Recommendations] Generating for profile ${profile_id}`, config);

  // Fetch creative performance data from creative_assets with ad performance
  const { data: assets, error: assetsError } = await supabase
    .from('creative_assets')
    .select(`
      asset_id,
      profile_id,
      asset_type,
      impressions,
      clicks,
      cost_micros,
      sales_7d_micros,
      conversions_7d
    `)
    .eq('profile_id', profile_id)
    .gte('impressions', config.min_impressions);

  if (assetsError) {
    console.error('Error fetching assets:', assetsError);
    throw assetsError;
  }

  if (!assets || assets.length === 0) {
    return new Response(
      JSON.stringify({ 
        recommendations: [], 
        message: 'No assets with sufficient impressions found' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Calculate aggregated metrics for benchmarking
  const totalImpressions = assets.reduce((sum: number, a: any) => sum + (a.impressions || 0), 0);
  const totalClicks = assets.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0);
  const totalSpend = assets.reduce((sum: number, a: any) => sum + (a.cost_micros || 0), 0);
  const totalSales = assets.reduce((sum: number, a: any) => sum + (a.sales_7d_micros || 0), 0);

  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks / 1000000 : 0;
  const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;

  const recommendations: any[] = [];

  for (const asset of assets) {
    const impressions = asset.impressions || 0;
    const clicks = asset.clicks || 0;
    const spend = asset.cost_micros || 0;
    const sales = asset.sales_7d_micros || 0;
    const conversions = asset.conversions_7d || 0;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks / 1000000 : 0;
    const acos = sales > 0 ? (spend / sales) * 100 : 0;

    // Check for underperforming creatives
    const isBelowCtrThreshold = ctr < config.ctr_threshold_pct;
    const isAboveAcosThreshold = acos > config.acos_threshold_pct && sales > 0;
    const isHighSpendNoConversions = spend > 5000000 && conversions === 0; // $5+ spend, no conversions

    if (isBelowCtrThreshold && impressions >= config.min_impressions) {
      recommendations.push({
        profile_id,
        asset_id: asset.asset_id,
        recommendation_type: 'pause',
        reason: `CTR of ${ctr.toFixed(2)}% is below threshold (${config.ctr_threshold_pct}%). Consider pausing or replacing this creative.`,
        confidence: Math.min(0.9, impressions / 10000), // Higher confidence with more data
        impact_estimate: isHighSpendNoConversions ? 'high' : 'medium',
        metrics: { ctr, cpc, acos, impressions, clicks, spend: spend / 1000000, avgCtr },
        status: 'pending'
      });
    } else if (isAboveAcosThreshold) {
      recommendations.push({
        profile_id,
        asset_id: asset.asset_id,
        recommendation_type: 'replace',
        reason: `ACOS of ${acos.toFixed(0)}% exceeds threshold (${config.acos_threshold_pct}%). Consider testing new creative variations.`,
        confidence: Math.min(0.85, conversions / 10),
        impact_estimate: 'medium',
        metrics: { ctr, cpc, acos, impressions, clicks, conversions, avgAcos },
        status: 'pending'
      });
    } else if (isHighSpendNoConversions) {
      recommendations.push({
        profile_id,
        asset_id: asset.asset_id,
        recommendation_type: 'pause',
        reason: `Spent $${(spend / 1000000).toFixed(2)} with no conversions. This creative is not performing.`,
        confidence: 0.95,
        impact_estimate: 'high',
        metrics: { ctr, cpc, acos, impressions, clicks, spend: spend / 1000000 },
        status: 'pending'
      });
    }
  }

  // Insert recommendations, avoiding duplicates
  if (recommendations.length > 0) {
    // First, check for existing pending recommendations for these assets
    const assetIds = recommendations.map(r => r.asset_id);
    const { data: existing } = await supabase
      .from('creative_recommendations')
      .select('asset_id')
      .eq('profile_id', profile_id)
      .eq('status', 'pending')
      .in('asset_id', assetIds);

    const existingAssetIds = new Set((existing || []).map((e: any) => e.asset_id));
    const newRecommendations = recommendations.filter(r => !existingAssetIds.has(r.asset_id));

    if (newRecommendations.length > 0) {
      const { error: insertError } = await supabase
        .from('creative_recommendations')
        .insert(newRecommendations);

      if (insertError) {
        console.error('Error inserting recommendations:', insertError);
      }
    }

    console.log(`[Creative Recommendations] Generated ${newRecommendations.length} new recommendations`);
  }

  return new Response(
    JSON.stringify({ 
      recommendations,
      stats: {
        assetsAnalyzed: assets.length,
        recommendationsGenerated: recommendations.length,
        avgCtr,
        avgCpc,
        avgAcos
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleApplyRecommendation(req: Request, supabase: any, userId: string | null) {
  const body = await req.json();
  const { recommendation_id, profile_id } = body;

  if (!recommendation_id) {
    return new Response(
      JSON.stringify({ error: 'recommendation_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch the recommendation
  const { data: rec, error: recError } = await supabase
    .from('creative_recommendations')
    .select('*')
    .eq('id', recommendation_id)
    .single();

  if (recError || !rec) {
    return new Response(
      JSON.stringify({ error: 'Recommendation not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Queue action based on recommendation type
  if (rec.recommendation_type === 'pause' && rec.ad_id) {
    const idempotencyKey = `creative_rec_${recommendation_id}_${new Date().toISOString().split('T')[0]}`;
    
    await supabase.from('action_queue').insert({
      profile_id: rec.profile_id,
      action_type: 'pause_ad',
      idempotency_key: idempotencyKey,
      status: 'queued',
      user_id: userId,
      payload: {
        ad_id: rec.ad_id,
        asset_id: rec.asset_id,
        reason: rec.reason,
        recommendation_id: recommendation_id,
        source: 'creative_recommendation'
      }
    });
  }

  // Update recommendation status
  await supabase
    .from('creative_recommendations')
    .update({ 
      status: 'applied',
      applied_at: new Date().toISOString(),
      user_id: userId
    })
    .eq('id', recommendation_id);

  return new Response(
    JSON.stringify({ success: true, message: 'Recommendation applied' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleDismissRecommendation(req: Request, supabase: any) {
  const body = await req.json();
  const { recommendation_id } = body;

  if (!recommendation_id) {
    return new Response(
      JSON.stringify({ error: 'recommendation_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await supabase
    .from('creative_recommendations')
    .update({ 
      status: 'dismissed',
      dismissed_at: new Date().toISOString()
    })
    .eq('id', recommendation_id);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
