import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenAPIFetchRequest {
  url: string;
  title: string;
  sourceType: 'openapi' | 'github';
  githubRepo?: string;
  githubBranch?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { url, title, sourceType, githubRepo, githubBranch = 'main' }: OpenAPIFetchRequest = await req.json();

    console.log(`Fetching ${sourceType} documentation from: ${url}`);

    // Fetch the content based on source type
    let content = '';
    let apiSpecData = null;
    let actualUrl = url;

    if (sourceType === 'openapi') {
      // Direct OpenAPI spec fetch
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Amazon-Ads-Documentation-Fetcher/1.0',
          'Accept': 'application/json, application/yaml, text/yaml, text/plain'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
      }

      const rawContent = await response.text();
      content = rawContent;

      // Try to parse as JSON or YAML
      try {
        if (url.includes('.json') || rawContent.trim().startsWith('{')) {
          apiSpecData = JSON.parse(rawContent);
        } else {
          // For YAML content, we'll store as text and parse later
          content = rawContent;
        }
      } catch (parseError) {
        console.log('Could not parse as structured data, storing as text');
      }

    } else if (sourceType === 'github') {
      // GitHub API fetch
      const githubApiUrl = `https://api.github.com/repos/${githubRepo}/contents/${url}?ref=${githubBranch}`;
      
      const response = await fetch(githubApiUrl, {
        headers: {
          'User-Agent': 'Amazon-Ads-Documentation-Fetcher/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from GitHub: ${response.status} ${response.statusText}`);
      }

      const githubData = await response.json();
      
      if (githubData.content) {
        // Decode base64 content
        content = atob(githubData.content);
        actualUrl = githubData.download_url || url;
        
        // Try to parse if it's a JSON/YAML file
        if (githubData.name.endsWith('.json') || githubData.name.endsWith('.yaml') || githubData.name.endsWith('.yml')) {
          try {
            if (githubData.name.endsWith('.json')) {
              apiSpecData = JSON.parse(content);
            }
          } catch (parseError) {
            console.log('Could not parse GitHub file as structured data');
          }
        }
      }
    }

    // Generate version hash
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const versionHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check if this source already exists
    const { data: existingSource } = await supabase
      .from('documentation_sources')
      .select('id, version_hash')
      .eq('url', actualUrl)
      .single();

    let sourceId;

    if (existingSource) {
      // Update existing source if content changed
      if (existingSource.version_hash !== versionHash) {
        const { data: updatedSource, error: updateError } = await supabase
          .from('documentation_sources')
          .update({
            title,
            content,
            version_hash: versionHash,
            last_scraped_at: new Date().toISOString(),
            source_type_enum: sourceType,
            api_spec_data: apiSpecData,
            github_repo: githubRepo,
            github_branch: githubBranch,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSource.id)
          .select('id')
          .single();

        if (updateError) throw updateError;
        sourceId = updatedSource.id;
        console.log(`Updated existing source: ${sourceId}`);
      } else {
        sourceId = existingSource.id;
        console.log(`No changes detected for source: ${sourceId}`);
      }
    } else {
      // Create new source
      const { data: newSource, error: insertError } = await supabase
        .from('documentation_sources')
        .insert({
          url: actualUrl,
          title,
          content,
          version_hash: versionHash,
          last_scraped_at: new Date().toISOString(),
          source_type_enum: sourceType,
          api_spec_data: apiSpecData,
          github_repo: githubRepo,
          github_branch: githubBranch,
          content_type: apiSpecData ? 'openapi' : 'markdown'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      sourceId = newSource.id;
      console.log(`Created new source: ${sourceId}`);
    }

    // If we have structured API data, trigger analysis
    if (apiSpecData && sourceId) {
      console.log('Triggering API analysis...');
      
      // Basic API analysis
      const analysis = {
        endpoints: Object.keys(apiSpecData.paths || {}).length,
        methods: new Set(),
        authentication: [],
        parameters: 0,
        schemas: Object.keys(apiSpecData.components?.schemas || {}).length
      };

      // Analyze endpoints for methods and authentication
      for (const [path, methods] of Object.entries(apiSpecData.paths || {})) {
        for (const [method, details] of Object.entries(methods as any)) {
          analysis.methods.add(method.toUpperCase());
          if ((details as any).security) {
            analysis.authentication.push(...(details as any).security);
          }
          if ((details as any).parameters) {
            analysis.parameters += (details as any).parameters.length;
          }
        }
      }

      // Store analysis results
      await supabase
        .from('api_analysis_results')
        .insert({
          documentation_source_id: sourceId,
          analysis_type: 'openapi_basic',
          results: {
            ...analysis,
            methods: Array.from(analysis.methods),
            version: apiSpecData.info?.version,
            title: apiSpecData.info?.title,
            description: apiSpecData.info?.description
          },
          confidence_score: 0.9
        });

      console.log('API analysis completed');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sourceId,
      contentLength: content.length,
      hasApiSpec: !!apiSpecData,
      updated: !existingSource || existingSource.version_hash !== versionHash
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching OpenAPI documentation:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});