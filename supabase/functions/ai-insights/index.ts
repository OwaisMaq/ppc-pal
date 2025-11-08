import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's Amazon connections
    const { data: connections } = await supabase
      .from('amazon_connections_safe')
      .select('*')
      .eq('user_id', user.id);

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ 
        insights: [],
        strategy: 'No active Amazon connections found. Please connect your account to receive AI insights.',
        autoApply: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const primaryConnection = connections[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch campaign performance data
    const { data: campaigns } = await supabase
      .from('v_campaign_daily')
      .select('*')
      .eq('profile_id', primaryConnection.profile_id)
      .gte('date', thirtyDaysAgo)
      .limit(100);

    // Aggregate campaign metrics
    const campaignMap = new Map();
    campaigns?.forEach((row: any) => {
      const id = row.campaign_id;
      if (!campaignMap.has(id)) {
        campaignMap.set(id, {
          campaign_id: id,
          campaign_name: row.campaign_name,
          spend: 0,
          sales: 0,
          clicks: 0,
          impressions: 0,
        });
      }
      const campaign = campaignMap.get(id);
      campaign.spend += row.spend || 0;
      campaign.sales += row.sales || 0;
      campaign.clicks += row.clicks || 0;
      campaign.impressions += row.impressions || 0;
    });

    const campaignData = Array.from(campaignMap.values()).map((c: any) => ({
      name: c.campaign_name,
      spend: c.spend.toFixed(2),
      sales: c.sales.toFixed(2),
      acos: c.sales > 0 ? ((c.spend / c.sales) * 100).toFixed(1) : 'N/A',
      ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : 'N/A',
      cpc: c.clicks > 0 ? (c.spend / c.clicks).toFixed(2) : 'N/A',
      conversions: Math.floor(c.sales / 25),
    }));

    // Generate AI insights
    const systemPrompt = `You are an Amazon PPC advertising expert AI assistant. Analyze campaign data and provide actionable insights.
Your response must be valid JSON with this structure:
{
  "insights": [
    {
      "type": "bid_adjustment" | "keyword_suggestion" | "negative_keyword" | "budget_change",
      "campaign": "campaign name",
      "action": "brief action taken",
      "reason": "clear explanation why",
      "impact": "low" | "medium" | "high",
      "timestamp": "ISO date string"
    }
  ],
  "strategy": "2-3 sentence summary of overall strategy focus"
}`;

    const userPrompt = `Analyze these campaigns and provide 3-5 AI recommendations:
${JSON.stringify(campaignData.slice(0, 10), null, 2)}

Focus on:
- Campaigns with high ACOS (>30%)
- Low CTR campaigns (<0.5%)
- High CPC without conversions
- Budget optimization opportunities`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    let parsedInsights;
    try {
      parsedInsights = JSON.parse(content);
    } catch {
      // Fallback if AI doesn't return valid JSON
      parsedInsights = {
        insights: [],
        strategy: 'Unable to generate insights at this time. Please try again later.',
      };
    }

    // Auto-apply preference is managed on the client side
    const autoApply = false;

    return new Response(JSON.stringify({
      insights: parsedInsights.insights || [],
      strategy: parsedInsights.strategy || 'Analyzing your campaigns...',
      autoApply,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Insights error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      insights: [],
      strategy: 'Error generating insights',
      autoApply: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
