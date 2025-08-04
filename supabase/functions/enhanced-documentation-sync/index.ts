import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting enhanced documentation sync...');

    // Create sync job record
    const { data: syncJob, error: syncJobError } = await supabase
      .from('documentation_sync_jobs')
      .insert({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (syncJobError) throw syncJobError;

    // Get all active documentation sources with enhanced source types
    const { data: sources, error: sourcesError } = await supabase
      .from('documentation_sources')
      .select('*')
      .eq('is_active', true);

    if (sourcesError) throw sourcesError;

    let sourcesProcessed = 0;
    let sourcesUpdated = 0;
    const failedSources: any[] = [];

    for (const source of sources) {
      try {
        console.log(`Processing source: ${source.title} (${source.url}) - Type: ${source.source_type_enum}`);
        
        let content = '';
        let success = false;
        let apiSpecData = null;

        // Handle different source types
        switch (source.source_type_enum) {
          case 'openapi':
            // Direct OpenAPI spec fetch
            try {
              const response = await fetch(source.url, {
                headers: {
                  'User-Agent': 'Amazon-Ads-Documentation-Fetcher/1.0',
                  'Accept': 'application/json, application/yaml, text/yaml, text/plain'
                }
              });

              if (response.ok) {
                const rawContent = await response.text();
                content = rawContent;

                // Try to parse as JSON or YAML
                try {
                  if (source.url.includes('.json') || rawContent.trim().startsWith('{')) {
                    apiSpecData = JSON.parse(rawContent);
                  }
                } catch (parseError) {
                  console.log('Could not parse OpenAPI spec as JSON');
                }
                
                success = true;
                console.log(`OpenAPI fetch successful for: ${source.url}`);
              }
            } catch (openApiError) {
              console.log(`OpenAPI fetch failed for ${source.url}:`, openApiError.message);
            }
            break;

          case 'github':
            // GitHub API fetch
            try {
              const githubApiUrl = `https://api.github.com/repos/${source.github_repo}/contents/${source.url}?ref=${source.github_branch}`;
              
              const response = await fetch(githubApiUrl, {
                headers: {
                  'User-Agent': 'Amazon-Ads-Documentation-Fetcher/1.0',
                  'Accept': 'application/vnd.github.v3+json'
                }
              });

              if (response.ok) {
                const githubData = await response.json();
                
                if (githubData.content) {
                  content = atob(githubData.content);
                  
                  // Try to parse if it's a JSON/YAML file
                  if (githubData.name.endsWith('.json')) {
                    try {
                      apiSpecData = JSON.parse(content);
                    } catch (parseError) {
                      console.log('Could not parse GitHub file as JSON');
                    }
                  }
                  
                  success = true;
                  console.log(`GitHub fetch successful for: ${source.url}`);
                }
              }
            } catch (githubError) {
              console.log(`GitHub fetch failed for ${source.url}:`, githubError.message);
            }
            break;

          case 'manual':
          case 'crawler':
          default:
            // Try Firecrawl first if API key is available
            if (firecrawlApiKey) {
              try {
                const firecrawlResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${firecrawlApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    url: source.url,
                    pageOptions: {
                      onlyMainContent: true,
                      includeHtml: false,
                    },
                    formats: ['markdown'],
                  }),
                });

                if (firecrawlResponse.ok) {
                  const firecrawlData = await firecrawlResponse.json();
                  if (firecrawlData.success && firecrawlData.data?.markdown) {
                    content = firecrawlData.data.markdown;
                    success = true;
                    console.log(`Firecrawl successful for: ${source.url}`);
                  }
                }
              } catch (firecrawlError) {
                console.log(`Firecrawl failed for ${source.url}:`, firecrawlError.message);
              }
            }

            // Fallback to direct fetch if Firecrawl fails or is not available
            if (!success) {
              try {
                const directResponse = await fetch(source.url, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; DocumentationBot/1.0)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  },
                });

                if (directResponse.ok) {
                  content = await directResponse.text();
                  
                  // Basic HTML to markdown conversion for direct fetches
                  content = content
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  success = true;
                  console.log(`Direct fetch successful for: ${source.url}`);
                }
              } catch (directError) {
                console.log(`Direct fetch failed for ${source.url}:`, directError.message);
              }
            }
            break;
        }

        if (success && content) {
          // Generate content hash for change detection
          const encoder = new TextEncoder();
          const data = encoder.encode(content);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const versionHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          // Only update if content has changed
          if (source.version_hash !== versionHash) {
            const updateData: any = {
              content,
              version_hash: versionHash,
              last_scraped_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            // Add API spec data if available
            if (apiSpecData) {
              updateData.api_spec_data = apiSpecData;
              updateData.content_type = 'openapi';
            }

            await supabase
              .from('documentation_sources')
              .update(updateData)
              .eq('id', source.id);

            sourcesUpdated++;
            console.log(`Updated source: ${source.title}`);

            // Trigger basic API analysis if we have spec data
            if (apiSpecData) {
              console.log(`Triggering API analysis for: ${source.title}`);
              
              const analysis = {
                endpoints: Object.keys(apiSpecData.paths || {}).length,
                methods: new Set(),
                authentication: [],
                parameters: 0,
                schemas: Object.keys(apiSpecData.components?.schemas || {}).length
              };

              // Quick analysis
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
                  documentation_source_id: source.id,
                  analysis_type: 'sync_basic',
                  results: {
                    ...analysis,
                    methods: Array.from(analysis.methods),
                    version: apiSpecData.info?.version,
                    title: apiSpecData.info?.title,
                    description: apiSpecData.info?.description
                  },
                  confidence_score: 0.8
                });
            }
          } else {
            console.log(`No changes detected for: ${source.title}`);
          }
        } else {
          failedSources.push({
            id: source.id,
            url: source.url,
            error: 'Failed to fetch content'
          });
          console.log(`Failed to process: ${source.url}`);
        }

        sourcesProcessed++;
        
        // Add delay to respect rate limits
        if (sourcesProcessed < sources.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Error processing source ${source.url}:`, error);
        failedSources.push({
          id: source.id,
          url: source.url,
          error: error.message
        });
        sourcesProcessed++;
      }
    }

    // Update sync job with results
    await supabase
      .from('documentation_sync_jobs')
      .update({
        status: failedSources.length > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        sources_processed: sourcesProcessed,
        sources_updated: sourcesUpdated,
        sources_failed: failedSources.length,
        error_details: failedSources
      })
      .eq('id', syncJob.id);

    const result = {
      success: true,
      syncJobId: syncJob.id,
      processed: sourcesProcessed,
      updated: sourcesUpdated,
      failed: failedSources.length
    };

    console.log('Enhanced documentation sync completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced documentation sync:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});