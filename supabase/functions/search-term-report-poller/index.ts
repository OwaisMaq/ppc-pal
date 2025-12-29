import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry helper for API calls
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status >= 400 && response.status < 500 && response.status !== 429) return response;
      if (attempt < maxRetries && (response.status === 429 || response.status >= 500)) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`⚠️ Request failed with ${response.status}, waiting ${delay}ms before retry`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  throw lastError || new Error('Max retries exceeded');
}

// Check report status with Amazon
async function checkReportStatus(
  accessToken: string,
  profileId: string,
  reportId: string,
  apiEndpoint: string,
  clientId: string
): Promise<{ status: string; url?: string; statusDetails?: string }> {
  const response = await fetchWithRetry(
    `${apiEndpoint}/reporting/reports/${reportId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId.trim(),
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.amazon.reporting.v3+json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Status check failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

// Download and parse gzipped report
async function downloadReport(downloadUrl: string): Promise<any[]> {
  console.log('📥 Downloading search term report...');
  const response = await fetchWithRetry(downloadUrl, {});
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const gzippedData = await response.arrayBuffer();
  const decompressedData = new Response(
    new ReadableStream({
      start(controller) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new Uint8Array(gzippedData));
        writer.close();
        
        (async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { controller.close(); break; }
            controller.enqueue(value);
          }
        })();
      }
    })
  );

  const jsonText = await decompressedData.text();
  const results = jsonText.trim().split('\n').filter(l => l).map(line => JSON.parse(line));
  console.log(`✅ Downloaded ${results.length} search term records`);
  return results;
}

// Main handler - Step 2: Poll and process completed reports
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');

  if (!supabaseUrl || !supabaseServiceKey || !encryptionKey || !clientId) {
    return new Response(JSON.stringify({ error: 'Missing required config' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log(`🔍 Search term report poller started - ${requestId}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all pending search term reports
    const { data: pendingReports, error: fetchError } = await supabase
      .from('amazon_report_requests')
      .select('*')
      .eq('report_type', 'spSearchTerm')
      .eq('status', 'IN_PROGRESS')
      .order('created_at', { ascending: true })
      .limit(10); // Process up to 10 reports per run

    if (fetchError) {
      throw new Error(`Failed to fetch pending reports: ${fetchError.message}`);
    }

    if (!pendingReports?.length) {
      console.log('No pending reports to process');
      return new Response(JSON.stringify({
        success: true, 
        message: 'No pending reports',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Found ${pendingReports.length} pending reports to check`);

    let processed = 0;
    let completed = 0;
    let stillPending = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const report of pendingReports) {
      try {
        const config = report.configuration as any;
        const profileId = config?.profile_id;
        const apiEndpoint = config?.api_endpoint || 'https://advertising-api.amazon.com';

        if (!profileId) {
          console.error(`No profile_id in configuration for report ${report.report_id}`);
          errors.push(`No profile_id for report ${report.report_id}`);
          continue;
        }

        console.log(`\n📊 Checking report ${report.report_id} for profile ${profileId}`);

        // Get access token for this connection
        const { data: tokensArray, error: tokenError } = await supabase
          .rpc('get_tokens_with_key', {
            p_profile_id: profileId,
            p_encryption_key: encryptionKey
          });

        if (tokenError || !tokensArray?.[0]?.access_token) {
          console.error(`Failed to get token for profile ${profileId}`);
          errors.push(`No token for ${profileId}`);
          continue;
        }

        const accessToken = tokensArray[0].access_token;

        // Check report status with Amazon
        const reportStatus = await checkReportStatus(accessToken, profileId, report.report_id, apiEndpoint, clientId);
        console.log(`📊 Report ${report.report_id} status: ${reportStatus.status}`);

        if (reportStatus.status === 'COMPLETED' || reportStatus.status === 'SUCCESS') {
          // Download and process the report
          if (!reportStatus.url) {
            throw new Error('Report completed but no download URL provided');
          }

          const searchTerms = await downloadReport(reportStatus.url);

          if (searchTerms.length > 0) {
            // Transform and batch upsert into fact_search_term_daily
            const batchSize = 500;
            let inserted = 0;

            for (let i = 0; i < searchTerms.length; i += batchSize) {
              const batch = searchTerms.slice(i, i + batchSize).map(term => ({
                date: term.date || new Date().toISOString().split('T')[0],
                profile_id: profileId,
                campaign_id: term.campaignId || '',
                ad_group_id: term.adGroupId || '',
                keyword_id: term.keywordId || null,
                keyword_text: term.keyword || term.keywordText || null,
                search_term: term.searchTerm || '',
                match_type: term.matchType || 'BROAD',
                targeting: term.targeting || null,
                impressions: parseInt(term.impressions) || 0,
                clicks: parseInt(term.clicks) || 0,
                cost_micros: Math.round(parseFloat(term.cost || 0) * 1000000),
                attributed_conversions_1d: parseInt(term.purchases1d) || 0,
                attributed_conversions_7d: parseInt(term.purchases7d) || 0,
                attributed_sales_7d_micros: Math.round(parseFloat(term.sales7d || 0) * 1000000)
              }));

              const { error: upsertError } = await supabase
                .from('fact_search_term_daily')
                .upsert(batch, {
                  onConflict: 'date,profile_id,campaign_id,ad_group_id,search_term,match_type'
                });

              if (upsertError) {
                console.error(`Batch upsert error:`, upsertError);
                throw new Error(`Upsert failed: ${upsertError.message}`);
              }
              inserted += batch.length;
            }

            console.log(`✅ Inserted ${inserted} search term records`);
          }

          // Update report status to COMPLETED
          await supabase
            .from('amazon_report_requests')
            .update({
              status: 'COMPLETED',
              download_url: reportStatus.url,
              records_processed: searchTerms.length,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', report.id);

          completed++;
          console.log(`✅ Report ${report.report_id} processed successfully`);

        } else if (reportStatus.status === 'FAILED') {
          // Mark as failed
          await supabase
            .from('amazon_report_requests')
            .update({
              status: 'FAILED',
              status_details: reportStatus.statusDetails || 'Report generation failed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', report.id);

          failed++;
          errors.push(`Report ${report.report_id} failed: ${reportStatus.statusDetails}`);

        } else {
          // Still pending (PROCESSING, PENDING, etc.)
          stillPending++;
          console.log(`⏳ Report ${report.report_id} still ${reportStatus.status}`);
          
          // Update timestamp to show we checked it
          await supabase
            .from('amazon_report_requests')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', report.id);
        }

        processed++;

      } catch (reportError) {
        const errMsg = reportError instanceof Error ? reportError.message : 'Unknown error';
        console.error(`Error processing report ${report.report_id}:`, errMsg);
        errors.push(`Report ${report.report_id}: ${errMsg}`);
        
        // Mark as failed if there was an error
        await supabase
          .from('amazon_report_requests')
          .update({
            status: 'FAILED',
            status_details: errMsg,
            updated_at: new Date().toISOString()
          })
          .eq('id', report.id);
        
        failed++;
      }
    }

    console.log(`\n✅ Poller complete - Processed: ${processed}, Completed: ${completed}, Still Pending: ${stillPending}, Failed: ${failed}`);

    return new Response(JSON.stringify({
      success: true,
      request_id: requestId,
      processed,
      completed,
      still_pending: stillPending,
      failed,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Report poller error:', error);
    return new Response(JSON.stringify({
      error: 'Report poller failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      request_id: requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
