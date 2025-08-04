
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get OpenAI API key from Supabase secrets
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not found in environment');
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client to fetch documentation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { dataSummary, seed } = await req.json();

    // Validate input parameters
    if (!dataSummary || typeof dataSummary !== 'object') {
      throw new Error('Invalid dataSummary provided');
    }

    // Rate limiting: Limit the data size to prevent abuse
    if (dataSummary.totalKeywords > 1000) {
      throw new Error('Dataset too large. Please limit to 1000 keywords or fewer.');
    }

    // Fetch recent Amazon Ads documentation for context
    console.log('Fetching Amazon Ads documentation...');
    const { data: documentation, error: docError } = await supabase
      .from('documentation_sources')
      .select('title, content')
      .eq('is_active', true)
      .order('last_scraped_at', { ascending: false });

    if (docError) {
      console.warn('Could not fetch documentation:', docError);
    }

    // Build context from documentation
    let documentationContext = '';
    if (documentation && documentation.length > 0) {
      documentationContext = `
Amazon Ads API Documentation Context:
${documentation.map(doc => `
${doc.title}:
${doc.content.substring(0, 2000)}...
`).join('\n')}

Use this official Amazon documentation context to provide more accurate and API-compliant optimization suggestions.
`;
    }

    const prompt = `
As an Amazon advertising optimization expert with access to the latest Amazon Ads API documentation, analyze this advertising data and provide specific optimization suggestions:

${documentationContext}

Data Summary:
- Total Keywords: ${dataSummary.totalKeywords}
- Total Campaigns: ${dataSummary.totalCampaigns}
- Total Ad Groups: ${dataSummary.totalAdGroups}

Sample Keywords:
${JSON.stringify(dataSummary.sampleKeywords, null, 2)}

Please provide optimization suggestions focusing on:
1. Bid adjustments for keywords based on Amazon Ads best practices
2. Underperforming keywords to remove per Amazon's guidelines
3. Match type optimizations aligned with current Amazon recommendations
4. Budget allocation improvements following Amazon's latest features

Important: Base your recommendations on the Amazon Ads API documentation provided above. Ensure suggestions are compatible with current Amazon Ads platform capabilities and API limits.

Respond with a JSON array of suggestions in this format:
[
  {
    "type": "bid_increase",
    "reason": "High conversion rate, low impression share - aligns with Amazon's bid optimization guidelines",
    "originalValue": 1.50,
    "suggestedValue": 2.25
  }
]
    `;

    console.log('Making OpenAI API request...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Amazon advertising optimizer. Always provide consistent, actionable, data-driven optimization suggestions in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0, // Deterministic results
        seed: parseInt(seed.substring(0, 8), 16), // Consistent seed based on data
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    console.log("Raw AI response:", content);

    if (!content) {
      console.error("Empty response from OpenAI");
      throw new Error("Empty response from AI service");
    }

    let suggestions = [];
    
    try {
      // Try to find JSON array in the response
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(suggestions)) {
          throw new Error("Invalid suggestions format");
        }
      } else {
        throw new Error("No valid JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing AI suggestions:", parseError);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-optimize function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      suggestions: [] // Return empty suggestions as fallback
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
