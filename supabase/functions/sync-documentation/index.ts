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
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get Firecrawl API key
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not found in environment');
      throw new Error('Firecrawl API key not configured');
    }

    // Create sync job record
    const { data: syncJob, error: syncJobError } = await supabase
      .from('documentation_sync_jobs')
      .insert({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (syncJobError) {
      console.error('Error creating sync job:', syncJobError);
      throw new Error('Failed to create sync job');
    }

    console.log('Starting documentation sync job:', syncJob.id);

    // Get all active documentation sources with enhanced source types
    const { data: sources, error: sourcesError } = await supabase
      .from('documentation_sources')
      .select('*')
      .eq('is_active', true);

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError);
      throw new Error('Failed to fetch documentation sources');
    }

    let processed = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    // Process each documentation source
    for (const source of sources) {
      try {
        console.log(`Scraping ${source.url}...`);
        
        // Call Firecrawl API to scrape the URL
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: source.url,
            formats: ['markdown'],
            pageOptions: {
              onlyMainContent: true
            }
          })
        });

        if (!firecrawlResponse.ok) {
          const errorText = await firecrawlResponse.text();
          console.error(`Firecrawl API error for ${source.url}:`, errorText);
          throw new Error(`Firecrawl API error: ${firecrawlResponse.status}`);
        }

        const firecrawlData = await firecrawlResponse.json();
        
        if (!firecrawlData.success || !firecrawlData.data?.markdown) {
          console.error(`No content returned for ${source.url}`);
          throw new Error('No content returned from Firecrawl');
        }

        const newContent = firecrawlData.data.markdown;
        const newVersionHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(newContent)
        ).then(buffer => 
          Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        );

        // Only update if content has changed
        if (newVersionHash !== source.version_hash) {
          const { error: updateError } = await supabase
            .from('documentation_sources')
            .update({
              content: newContent,
              version_hash: newVersionHash,
              last_scraped_at: new Date().toISOString(),
              metadata: {
                ...source.metadata,
                title: firecrawlData.data.title || source.title,
                lastSyncJobId: syncJob.id
              }
            })
            .eq('id', source.id);

          if (updateError) {
            console.error(`Error updating source ${source.url}:`, updateError);
            throw updateError;
          }

          console.log(`Updated content for ${source.url}`);
          updated++;
        } else {
          console.log(`No changes detected for ${source.url}`);
        }

        processed++;
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing ${source.url}:`, error);
        failed++;
        errors.push({
          url: source.url,
          error: error.message
        });
      }
    }

    // Update sync job with results
    const { error: updateJobError } = await supabase
      .from('documentation_sync_jobs')
      .update({
        status: failed > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        sources_processed: processed,
        sources_updated: updated,
        sources_failed: failed,
        error_details: errors
      })
      .eq('id', syncJob.id);

    if (updateJobError) {
      console.error('Error updating sync job:', updateJobError);
    }

    const result = {
      success: true,
      syncJobId: syncJob.id,
      processed,
      updated,
      failed,
      errors: failed > 0 ? errors : undefined
    };

    console.log('Documentation sync completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-documentation function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});