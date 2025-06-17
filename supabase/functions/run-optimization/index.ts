
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    const { connectionId, optimizationId } = await req.json()
    console.log('Running optimization:', optimizationId, 'for connection:', connectionId)

    // Update optimization status to in_progress
    await supabase
      .from('optimization_results')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', optimizationId)

    // Get connection and campaign data
    const { data: connection } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (!connection) {
      throw new Error('Connection not found')
    }

    // Get campaigns and keywords for analysis
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select(`
        *,
        ad_groups (
          *,
          keywords (*)
        )
      `)
      .eq('connection_id', connectionId)

    console.log('Analyzing', campaigns?.length, 'campaigns')

    let totalKeywords = 0
    let totalRecommendations = 0
    const recommendations = []

    // AI Analysis Logic
    for (const campaign of campaigns || []) {
      for (const adGroup of campaign.ad_groups || []) {
        for (const keyword of adGroup.keywords || []) {
          totalKeywords++
          
          // Simple optimization rules (in production, this would use OpenAI)
          const recommendations_for_keyword = analyzeKeyword(keyword)
          
          for (const rec of recommendations_for_keyword) {
            totalRecommendations++
            
            // Store recommendation
            const { data: recommendationData } = await supabase
              .from('optimization_recommendations')
              .insert({
                optimization_result_id: optimizationId,
                entity_type: 'keyword',
                entity_id: keyword.id,
                recommendation_type: rec.type,
                current_value: rec.currentValue?.toString(),
                recommended_value: rec.recommendedValue?.toString(),
                reasoning: rec.reasoning,
                impact_level: rec.impact,
                estimated_impact: rec.estimatedImpact,
                applied: false,
              })
              .select()
              .single()

            if (recommendationData) {
              recommendations.push(recommendationData)
            }
          }
        }
      }
    }

    // Update optimization result
    await supabase
      .from('optimization_results')
      .update({
        status: 'completed',
        total_keywords_analyzed: totalKeywords,
        total_recommendations: totalRecommendations,
        completed_at: new Date().toISOString(),
        results_data: {
          summary: `Analyzed ${totalKeywords} keywords and generated ${totalRecommendations} recommendations`,
          recommendations: recommendations.slice(0, 10) // Sample of recommendations
        }
      })
      .eq('id', optimizationId)

    console.log('Optimization completed:', totalRecommendations, 'recommendations generated')

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalKeywords,
        totalRecommendations,
        optimizationId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Optimization error:', error)
    
    // Mark optimization as failed
    const { optimizationId } = await req.json().catch(() => ({}))
    if (optimizationId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase
        .from('optimization_results')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', optimizationId)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Simple keyword analysis function (would be replaced with AI in production)
function analyzeKeyword(keyword: any) {
  const recommendations = []
  
  // High spend, low conversion
  if (keyword.spend > 50 && (keyword.orders || 0) === 0) {
    recommendations.push({
      type: 'bid_decrease',
      currentValue: keyword.bid,
      recommendedValue: keyword.bid * 0.7,
      reasoning: 'High spend with no conversions - reduce bid to lower cost',
      impact: 'high',
      estimatedImpact: keyword.spend * 0.3
    })
  }
  
  // Good performing keywords
  if (keyword.orders > 0 && keyword.acos && keyword.acos < 0.3) {
    recommendations.push({
      type: 'bid_increase',
      currentValue: keyword.bid,
      recommendedValue: keyword.bid * 1.2,
      reasoning: 'Strong performance with low ACOS - increase bid to capture more traffic',
      impact: 'medium',
      estimatedImpact: keyword.sales * 0.2
    })
  }
  
  // Poor CTR keywords
  if (keyword.impressions > 1000 && keyword.ctr && keyword.ctr < 0.01) {
    recommendations.push({
      type: 'change_match_type',
      currentValue: keyword.match_type,
      recommendedValue: keyword.match_type === 'broad' ? 'phrase' : 'exact',
      reasoning: 'Low CTR indicates poor relevance - tighten match type',
      impact: 'medium',
      estimatedImpact: 0
    })
  }
  
  return recommendations
}
