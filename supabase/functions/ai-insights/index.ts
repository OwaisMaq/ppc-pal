import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionableInsight {
  type: 'bid_adjustment' | 'keyword_suggestion' | 'negative_keyword' | 'budget_change';
  campaign: string;
  action: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: string;
  // Actionable payload for action_queue
  actionable: {
    action_type: string;
    payload: Record<string, unknown>;
    entity_id: string;
    entity_name: string;
    confidence: number;
    reason_code: string;
  };
}

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

    // Check if this is a scheduled run from the scheduler
    const schedulerUserId = req.headers.get('x-scheduler-user-id');
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    let user: { id: string } | null = null;
    let isScheduledRun = false;

    if (schedulerUserId && authHeader?.includes(serviceRoleKey)) {
      // Scheduled run with service role auth - use the provided user ID
      console.log(`Scheduled run for user: ${schedulerUserId}`);
      user = { id: schedulerUserId };
      isScheduledRun = true;
    } else {
      // Normal authenticated request
      const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader! } },
      });

      const { data: authData, error: userError } = await supabaseWithAuth.auth.getUser();
      if (userError || !authData.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = authData.user;
    }

    // Use service role client for all operations
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    const profileId = primaryConnection.profile_id;

    // Call ML predictions function to get statistical predictions
    console.log('Calling ml-predictions for statistical analysis...');
    const mlAuthHeader = isScheduledRun ? `Bearer ${serviceRoleKey}` : authHeader!;
    const { data: mlData, error: mlError } = await supabase.functions.invoke('ml-predictions', {
      headers: { 
        Authorization: mlAuthHeader,
        ...(isScheduledRun ? { 'x-scheduler-user-id': user.id } : {})
      }
    });

    let mlPredictions = [];
    let mlSummary = { total_campaigns: 0, waste_detected: 0, winners_detected: 0, anomalies_detected: 0 };

    if (mlError) {
      console.error('ML predictions error:', mlError);
    } else {
      mlPredictions = mlData?.predictions || [];
      mlSummary = mlData?.summary || mlSummary;
    }

    console.log(`Received ${mlPredictions.length} statistical predictions`);

    // If no predictions, return early
    if (mlPredictions.length === 0) {
      return new Response(JSON.stringify({
        insights: [],
        strategy: 'Your campaigns are performing within normal ranges. No immediate optimizations recommended.',
        autoApply: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to explain the numeric predictions in human-readable format
    const systemPrompt = `You are an Amazon PPC advertising expert AI assistant. Your job is to take STATISTICAL PREDICTIONS and explain them in clear, actionable human language.

Your response must be valid JSON with this structure:
{
  "insights": [
    {
      "explanation": "2-3 sentence explanation of why this optimization is recommended, referencing specific metrics"
    }
  ],
  "strategy": "2-3 sentence summary explaining the overall statistical patterns detected and recommended strategy"
}

IMPORTANT: Return exactly ${mlPredictions.length} explanations in the same order as the input predictions.`;

    const userPrompt = `Explain these statistical predictions in clear, actionable language:

Statistical Summary:
- Total campaigns analyzed: ${mlSummary.total_campaigns}
- Waste detected: ${mlSummary.waste_detected}
- High performers detected: ${mlSummary.winners_detected}
- Anomalies detected: ${mlSummary.anomalies_detected}

Predictions to explain (provide one explanation per prediction):
${JSON.stringify(mlPredictions.map(p => ({
  campaign_name: p.campaign_name,
  prediction_type: p.prediction_type,
  action_numeric: p.action_numeric,
  reason_code: p.reason_code,
  metrics: {
    acos_14d: p.metrics.acos_14d.toFixed(1),
    roas_14d: p.metrics.roas_14d.toFixed(2),
    cpc_14d: p.metrics.cpc_14d.toFixed(2),
    ctr_14d: p.metrics.ctr_14d.toFixed(2),
  },
  anomaly_scores: {
    acos_zscore: p.anomaly_scores.acos_zscore.toFixed(2),
    cpc_zscore: p.anomaly_scores.cpc_zscore.toFixed(2),
  }
})), null, 2)}`;

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
        temperature: 0.3,
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
    
    let parsedAI;
    try {
      // Handle potential markdown code blocks
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsedAI = JSON.parse(jsonContent);
    } catch {
      parsedAI = { insights: [], strategy: 'Analysis complete.' };
    }

    const aiExplanations = parsedAI.insights || [];
    const strategy = parsedAI.strategy || 'Analyzing your campaigns...';

    // Map ML predictions to actionable insights with AI explanations
    const mapActionType = (predictionType: string): string => {
      const mapping: Record<string, string> = {
        'bid_adjustment': 'set_bid',
        'budget_change': 'set_budget',
        'negative_keyword': 'add_negative',
        'keyword_suggestion': 'suggest_keyword',
      };
      return mapping[predictionType] || predictionType;
    };

    const mapAction = (prediction: any): string => {
      const { prediction_type, action_numeric } = prediction;
      if (prediction_type === 'bid_adjustment') {
        const percent = Math.round(action_numeric * 100);
        return percent < 0 ? `Decrease bid by ${Math.abs(percent)}%` : `Increase bid by ${percent}%`;
      }
      if (prediction_type === 'budget_change') {
        const percent = Math.round(action_numeric * 100);
        return percent < 0 ? `Decrease budget by ${Math.abs(percent)}%` : `Increase budget by ${percent}%`;
      }
      if (prediction_type === 'negative_keyword') {
        return 'Add negative keywords or pause underperforming targets';
      }
      return 'Review and optimize targeting';
    };

    const confidenceToNumber = (conf: string): number => {
      return { high: 0.9, medium: 0.7, low: 0.5 }[conf] || 0.5;
    };

    const insights: ActionableInsight[] = mlPredictions.map((prediction: any, index: number) => {
      const aiExplanation = aiExplanations[index]?.explanation || prediction.reason_code;
      
      return {
        type: prediction.prediction_type,
        campaign: prediction.campaign_name,
        action: mapAction(prediction),
        reason: aiExplanation,
        impact: prediction.impact,
        timestamp: new Date().toISOString(),
        actionable: {
          action_type: mapActionType(prediction.prediction_type),
          payload: {
            campaign_id: prediction.campaign_id,
            adjustment_percent: Math.round(prediction.action_numeric * 100),
            metrics: prediction.metrics,
          },
          entity_id: prediction.campaign_id,
          entity_name: prediction.campaign_name,
          confidence: confidenceToNumber(prediction.confidence),
          reason_code: prediction.reason_code,
        }
      };
    });

    // Store insights in the database for persistence
    const insightsToStore = insights.map(insight => ({
      user_id: user.id,
      profile_id: profileId,
      insight_type: insight.type,
      entity_id: insight.actionable.entity_id,
      entity_name: insight.actionable.entity_name,
      action_type: insight.actionable.action_type,
      payload: insight.actionable.payload,
      explanation: insight.reason,
      reason_code: insight.actionable.reason_code,
      impact: insight.impact,
      confidence: insight.actionable.confidence,
      status: 'pending',
    }));

    // Upsert insights (delete old pending ones first for this profile)
    await supabase
      .from('ai_insights')
      .delete()
      .eq('user_id', user.id)
      .eq('profile_id', profileId)
      .eq('status', 'pending');

    if (insightsToStore.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_insights')
        .insert(insightsToStore);
      
      if (insertError) {
        console.error('Error storing insights:', insertError);
      }
    }

    // Fetch user's auto-apply settings
    const { data: settings } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const autoApply = settings?.auto_apply_enabled || false;
    let autoAppliedCount = 0;
    const autoAppliedInsights: string[] = [];

    // Auto-apply high-confidence insights if enabled
    if (autoApply && insightsToStore.length > 0) {
      const maxImpact = settings?.auto_apply_max_impact || 'low';
      const minConfidence = settings?.auto_apply_min_confidence || 0.8;
      
      // Define impact priority for comparison (lower = less risk)
      const impactPriority: Record<string, number> = { low: 1, medium: 2, high: 3 };
      const maxImpactPriority = impactPriority[maxImpact] || 1;

      // Filter insights that meet auto-apply criteria
      const eligibleInsights = insightsToStore.filter(insight => {
        const meetsConfidence = insight.confidence >= minConfidence;
        const insightImpactPriority = impactPriority[insight.impact] || 3;
        const meetsImpact = insightImpactPriority <= maxImpactPriority;
        return meetsConfidence && meetsImpact;
      });

      console.log(`Auto-apply check: ${eligibleInsights.length} of ${insightsToStore.length} insights meet criteria`);

      // Queue eligible insights
      for (const insight of eligibleInsights) {
        const idempotencyKey = `auto_${user.id}_${insight.entity_id}_${insight.action_type}_${Date.now()}`;
        
        const { error: queueError } = await supabase.from('action_queue').insert({
          action_type: insight.action_type,
          payload: insight.payload,
          profile_id: profileId,
          user_id: user.id,
          idempotency_key: idempotencyKey,
          status: 'queued',
        });

        if (queueError) {
          console.error('Error queuing auto-apply action:', queueError);
          continue;
        }

        // Update insight status to approved (auto-applied)
        await supabase
          .from('ai_insights')
          .update({ status: 'approved', applied_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('entity_id', insight.entity_id)
          .eq('action_type', insight.action_type)
          .eq('status', 'pending');

        autoAppliedCount++;
        autoAppliedInsights.push(insight.entity_name || insight.entity_id);
      }

      console.log(`Auto-applied ${autoAppliedCount} high-confidence insights`);
    }

    return new Response(JSON.stringify({
      insights,
      strategy,
      autoApply,
      autoAppliedCount,
      autoAppliedInsights,
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
