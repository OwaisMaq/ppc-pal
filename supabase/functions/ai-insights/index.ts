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

    // Call ML predictions function to get statistical predictions
    console.log('Calling ml-predictions for statistical analysis...');
    const { data: mlData, error: mlError } = await supabase.functions.invoke('ml-predictions', {
      headers: { Authorization: authHeader! }
    });

    if (mlError) {
      console.error('ML predictions error:', mlError);
      // Fallback to empty predictions if ML service fails
      mlData.predictions = [];
      mlData.summary = { total_campaigns: 0, waste_detected: 0, winners_detected: 0, anomalies_detected: 0 };
    }

    const mlPredictions = mlData?.predictions || [];
    const mlSummary = mlData?.summary || { total_campaigns: 0, waste_detected: 0, winners_detected: 0, anomalies_detected: 0 };

    console.log(`Received ${mlPredictions.length} statistical predictions`);

    // Use AI only to explain the numeric predictions in human-readable format
    const systemPrompt = `You are an Amazon PPC advertising expert AI assistant. Your job is to take STATISTICAL PREDICTIONS (calculated using deterministic math: moving averages, Z-scores, waste detection) and explain them in clear, actionable human language.

You will receive:
- Statistical predictions with numeric actions (e.g., "decrease bid by 15%")
- Reason codes (e.g., "high_acos_anomaly", "waste_keyword")
- Metrics (CPC, CTR, CVR, ACOS, ROAS for 7d/14d/30d windows)
- Z-scores showing statistical anomalies

Your response must be valid JSON with this structure:
{
  "insights": [
    {
      "type": "bid_adjustment" | "keyword_suggestion" | "negative_keyword" | "budget_change",
      "campaign": "campaign name",
      "action": "human-readable action (e.g., 'Decrease bid by 15%' or 'Add negative keywords')",
      "reason": "2-3 sentence explanation referencing the metrics and why this math-based prediction makes sense",
      "impact": "low" | "medium" | "high",
      "timestamp": "ISO date string"
    }
  ],
  "strategy": "2-3 sentence summary explaining the overall statistical patterns detected and recommended strategy"
}

IMPORTANT: You are NOT making decisions. You are only explaining the decisions already made by the statistical engine in plain English.`;

    const userPrompt = `Explain these statistical predictions in clear, actionable language:

Statistical Summary:
- Total campaigns analyzed: ${mlSummary.total_campaigns}
- Waste detected: ${mlSummary.waste_detected}
- High performers detected: ${mlSummary.winners_detected}
- Anomalies detected: ${mlSummary.anomalies_detected}

Predictions to explain:
${JSON.stringify(mlPredictions, null, 2)}

For each prediction:
1. Convert the numeric action into a clear instruction (e.g., action_numeric: -0.15 → "Decrease bid by 15%")
2. Explain the reason_code using the provided metrics (reference specific numbers like CPC, CTR, ACOS, Z-scores)
3. Make it actionable and easy to understand for advertisers

Keep explanations clear, specific, and reference the actual metrics provided.`;

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
        temperature: 0.3, // Lower temperature for more consistent explanations
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
