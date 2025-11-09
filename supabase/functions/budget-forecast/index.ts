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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { profileId, monthsToForecast = 3 } = await req.json();

    // Fetch historical spend data (last 6 months for better predictions)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: historicalData, error: histError } = await supabase
      .from('ams_messages_sp_traffic')
      .select('date, spend, campaign_id')
      .eq('profile_id', profileId)
      .gte('date', sixMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (histError) throw histError;

    // Aggregate by month
    const monthlySpend: Record<string, number> = {};
    historicalData?.forEach(row => {
      const month = row.date.substring(0, 7); // YYYY-MM
      monthlySpend[month] = (monthlySpend[month] || 0) + (row.spend || 0);
    });

    // Fetch active campaigns for context
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select('id, name, budget, state')
      .eq('profile_id', profileId)
      .eq('state', 'ENABLED');

    if (campError) throw campError;

    const totalActiveBudget = campaigns?.reduce((sum, c) => sum + (c.budget || 0), 0) || 0;

    // Prepare AI prompt
    const systemPrompt = `You are a budget forecasting AI for Amazon PPC campaigns. Analyze historical spend data and predict future monthly budgets.
Return a JSON object with this exact structure:
{
  "forecasts": [
    {
      "month": "2025-12",
      "predictedSpend": 5000,
      "confidence": "high",
      "reasoning": "Based on seasonal trends..."
    }
  ],
  "recommendations": [
    {
      "title": "Increase Q4 budget",
      "description": "Holiday season typically sees 30% higher spend",
      "suggestedAmount": 6500,
      "priority": "high"
    }
  ],
  "insights": {
    "averageMonthlySpend": 4500,
    "trend": "increasing",
    "seasonalPattern": "Q4 peak detected"
  }
}`;

    const userPrompt = `Historical monthly spend data:
${JSON.stringify(monthlySpend, null, 2)}

Active campaigns: ${campaigns?.length || 0}
Total active daily budgets: $${totalActiveBudget.toFixed(2)}

Generate ${monthsToForecast} months of budget forecasts starting from next month.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    const forecast = JSON.parse(content);

    return new Response(
      JSON.stringify({
        ...forecast,
        generatedAt: new Date().toISOString(),
        profileId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in budget-forecast function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
