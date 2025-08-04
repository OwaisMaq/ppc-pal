import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface ComplianceAnalysisRequest {
  connectionId?: string;
  sourceIds?: string[];
  analysisType: 'full' | 'authentication' | 'error_handling' | 'rate_limiting';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    const { connectionId, sourceIds, analysisType }: ComplianceAnalysisRequest = await req.json();

    console.log(`Starting ${analysisType} compliance analysis for user: ${user.user.id}`);

    // Get API documentation sources
    let documentationQuery = supabase
      .from('documentation_sources')
      .select('*')
      .eq('is_active', true);

    if (sourceIds && sourceIds.length > 0) {
      documentationQuery = documentationQuery.in('id', sourceIds);
    }

    const { data: sources, error: sourcesError } = await documentationQuery;
    if (sourcesError) throw sourcesError;

    if (!sources || sources.length === 0) {
      throw new Error('No active documentation sources found');
    }

    // Get best practices for the analysis type
    const { data: bestPractices, error: practicesError } = await supabase
      .from('api_best_practices')
      .select('*')
      .or(`category.eq.${analysisType},category.eq.all`);

    if (practicesError) throw practicesError;

    // Get user's current Amazon integration code (if connection provided)
    let codeFiles = [];
    if (connectionId) {
      // Analyze edge functions and hooks related to Amazon integration
      const codePatterns = [
        'supabase/functions/amazon-oauth/index.ts',
        'supabase/functions/sync-amazon-data/index.ts',
        'supabase/functions/refresh-amazon-token/index.ts',
        'src/hooks/useAmazonConnections.ts',
        'src/hooks/useAmazonData.ts'
      ];
      
      // For this demo, we'll simulate code analysis
      codeFiles = codePatterns.map(path => ({
        path,
        // In reality, you'd fetch actual file content
        content: `// Simulated content for ${path}`
      }));
    }

    // Perform AI-powered compliance analysis
    const issues = [];
    const recommendations = [];
    let complianceScore = 1.0;

    // Analyze each source against best practices
    for (const source of sources) {
      console.log(`Analyzing source: ${source.title}`);
      
      // Parse API spec if available
      if (source.api_spec_data) {
        const apiSpec = source.api_spec_data;
        
        // Check authentication patterns
        if (analysisType === 'authentication' || analysisType === 'full') {
          const authSchemes = apiSpec.components?.securitySchemes || {};
          
          if (Object.keys(authSchemes).length === 0) {
            issues.push({
              category: 'authentication',
              severity: 'high',
              description: 'No authentication schemes defined in API spec',
              file: source.url,
              recommendation: 'Ensure proper OAuth 2.0 authentication is implemented'
            });
            complianceScore -= 0.2;
          }

          // Check for OAuth 2.0 with proper scopes
          const hasOAuth = Object.values(authSchemes).some((scheme: any) => 
            scheme.type === 'oauth2' && scheme.flows
          );
          
          if (!hasOAuth) {
            issues.push({
              category: 'authentication',
              severity: 'medium',
              description: 'OAuth 2.0 authentication not properly configured',
              file: source.url,
              recommendation: 'Implement OAuth 2.0 with proper scopes and token refresh'
            });
            complianceScore -= 0.1;
          }
        }

        // Check error handling patterns
        if (analysisType === 'error_handling' || analysisType === 'full') {
          let hasProperErrorHandling = false;
          
          for (const [path, methods] of Object.entries(apiSpec.paths || {})) {
            for (const [method, details] of Object.entries(methods as any)) {
              const responses = (details as any).responses || {};
              
              // Check for common error codes
              const requiredErrorCodes = ['400', '401', '403', '429', '500'];
              const definedErrorCodes = Object.keys(responses);
              
              const missingErrorCodes = requiredErrorCodes.filter(code => 
                !definedErrorCodes.includes(code)
              );
              
              if (missingErrorCodes.length > 0) {
                issues.push({
                  category: 'error_handling',
                  severity: 'medium',
                  description: `Missing error response definitions for ${method.toUpperCase()} ${path}`,
                  file: source.url,
                  recommendation: `Add response definitions for: ${missingErrorCodes.join(', ')}`
                });
                complianceScore -= 0.05;
              } else {
                hasProperErrorHandling = true;
              }
            }
          }
          
          if (hasProperErrorHandling) {
            recommendations.push({
              category: 'error_handling',
              priority: 'medium',
              description: 'Good error handling patterns detected in API spec',
              action: 'Ensure implementation matches the documented error responses'
            });
          }
        }

        // Check rate limiting documentation
        if (analysisType === 'rate_limiting' || analysisType === 'full') {
          const hasRateLimitHeaders = JSON.stringify(apiSpec).includes('X-RateLimit') || 
                                     JSON.stringify(apiSpec).includes('Rate-Limit');
          
          if (!hasRateLimitHeaders) {
            issues.push({
              category: 'rate_limiting',
              severity: 'high',
              description: 'No rate limiting documentation found',
              file: source.url,
              recommendation: 'Document rate limiting headers and implement proper backoff strategies'
            });
            complianceScore -= 0.15;
          }

          // Check for 429 responses
          const has429Responses = JSON.stringify(apiSpec).includes('"429"');
          if (!has429Responses) {
            issues.push({
              category: 'rate_limiting',
              severity: 'medium',
              description: 'Missing 429 Too Many Requests response definitions',
              file: source.url,
              recommendation: 'Add 429 response definitions with retry-after headers'
            });
            complianceScore -= 0.1;
          }
        }
      }

      // Analyze content for best practices
      const content = source.content.toLowerCase();
      
      for (const practice of bestPractices) {
        if (practice.rule_pattern) {
          const regex = new RegExp(practice.rule_pattern, 'i');
          if (!regex.test(content)) {
            issues.push({
              category: practice.category,
              severity: practice.severity,
              description: `Missing implementation: ${practice.title}`,
              file: source.url,
              recommendation: practice.description
            });
            
            const severityPenalty = practice.severity === 'high' ? 0.15 : 
                                   practice.severity === 'medium' ? 0.1 : 0.05;
            complianceScore -= severityPenalty;
          }
        }
      }
    }

    // Ensure compliance score doesn't go below 0
    complianceScore = Math.max(0, complianceScore);

    // Generate AI-powered recommendations if OpenAI is available
    if (openAIApiKey && issues.length > 0) {
      console.log('Generating AI recommendations...');
      
      const prompt = `
        Analyze the following API compliance issues for Amazon Ads API integration:
        
        Issues found:
        ${issues.map(issue => `- ${issue.category}: ${issue.description}`).join('\n')}
        
        Best practices to follow:
        ${bestPractices.map(p => `- ${p.title}: ${p.description}`).join('\n')}
        
        Provide specific, actionable recommendations to improve compliance:
      `;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: 'You are an expert in Amazon Ads API integration and compliance. Provide specific, actionable recommendations for improving API implementation compliance.' 
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 1000
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiRecommendations = data.choices[0]?.message?.content;
          
          if (aiRecommendations) {
            recommendations.push({
              category: 'ai_analysis',
              priority: 'high',
              description: 'AI-Generated Compliance Recommendations',
              action: aiRecommendations
            });
          }
        }
      } catch (aiError) {
        console.error('Error generating AI recommendations:', aiError);
      }
    }

    // Store analysis results
    const { data: result, error: insertError } = await supabase
      .from('code_validation_results')
      .insert({
        user_id: user.user.id,
        file_path: `compliance_analysis_${analysisType}`,
        validation_type: analysisType,
        issues,
        compliance_score: complianceScore,
        recommendations
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    console.log(`Compliance analysis completed. Score: ${complianceScore}`);

    return new Response(JSON.stringify({
      success: true,
      analysisId: result.id,
      complianceScore,
      issuesFound: issues.length,
      issues: issues.slice(0, 10), // Return first 10 issues
      recommendations: recommendations.slice(0, 5), // Return first 5 recommendations
      summary: {
        totalSources: sources.length,
        criticalIssues: issues.filter(i => i.severity === 'high').length,
        mediumIssues: issues.filter(i => i.severity === 'medium').length,
        lowIssues: issues.filter(i => i.severity === 'low').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compliance analysis:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});