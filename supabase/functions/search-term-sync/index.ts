import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get region endpoint from marketplace
function getApiEndpoint(marketplaceId: string | null): string {
  const naMarketplaces = ['ATVPDKIKX0DER', 'A2EUQ1WTGCTBG2', 'A1AM78C64UM0Y8'];
  const euMarketplaces = ['A1RKKUPIHCS9HS', 'A1F83G8C2ARO7P', 'A13V1IB3VIYZZH', 'A1PA6795UKMFR9', 'APJ6JRA9NG5V4', 'A2NODRKZP88ZB9'];
  const feMarketplaces = ['A1VC38T7YXB528', 'A39IBJ37TRP1C6', 'A21TJRUUN4KGV'];

  if (!marketplaceId) return 'https://advertising-api.amazon.com';
  if (naMarketplaces.includes(marketplaceId)) return 'https://advertising-api.amazon.com';
  if (euMarketplaces.includes(marketplaceId)) return 'https://advertising-api-eu.amazon.com';
  if (feMarketplaces.includes(marketplaceId)) return 'https://advertising-api-fe.amazon.com';
  return 'https://advertising-api.amazon.com';
}

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

// Create search term report request
async function createSearchTermReport(
  accessToken: string,
  profileId: string,
  dateRange: number,
  apiEndpoint: string
): Promise<string> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - dateRange);

  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  if (!clientId) throw new Error('AMAZON_CLIENT_ID is required');

  const columns = [
    'campaignId',
    'adGroupId',
    'keywordId',
    'keyword',
    'searchTerm',
    'matchType',
    'targeting',
    'impressions',
    'clicks',
    'cost',
    'purchases7d',
    'sales7d',
    'purchases1d'
  ];

  console.log(`📊 Creating search term report for last ${dateRange} days`);

  const response = await fetchWithRetry(
    `${apiEndpoint}/reporting/reports`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId.trim(),
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.amazon.reporting.v3+json'
      },
      body: JSON.stringify({
        name: `search_terms_daily_${Date.now()}`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          reportTypeId: 'spSearchTerm',
          groupBy: ['searchTerm'],
          columns: columns,
          timeUnit: 'DAILY',
          format: 'GZIP_JSON'
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    
    // Handle duplicate report
    if (response.status === 425) {
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail?.includes('duplicate of')) {
          const match = errorJson.detail.match(/duplicate of\s*:\s*([a-f0-9-]+)/i);
          if (match?.[1]) {
            console.log(`✅ Using existing report: ${match[1]}`);
            return match[1].trim();
          }
        }
      } catch {}
    }
    throw new Error(`Report creation failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Report created: ${result.reportId}`);
  return result.reportId;
}

// Poll report status
async function pollReportStatus(
  accessToken: string,
  profileId: string,
  reportId: string,
  maxWaitTime: number,
  apiEndpoint: string
): Promise<{ status: string; url?: string }> {
  const startTime = Date.now();
  const clientId = Deno.env.get('AMAZON_CLIENT_ID')!;

  while (Date.now() - startTime < maxWaitTime) {
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

    if (!response.ok) throw new Error(`Status check failed: ${response.status}`);
    const result = await response.json();
    console.log(`📊 Report status: ${result.status}`);

    if (result.status === 'COMPLETED' || result.status === 'SUCCESS') {
      return result;
    }
    if (result.status === 'FAILED') {
      throw new Error(`Report failed: ${result.statusDetails}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  throw new Error('Report polling timeout');
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

// Main handler
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase config' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!encryptionKey) {
    return new Response(JSON.stringify({ error: 'Missing ENCRYPTION_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log(`🔍 Search term sync started - ${requestId}`);
    const body = await req.json().catch(() => ({}));
    const { profileId, dateRange = 14 } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active connections (or specific profile if provided)
    let query = supabase
      .from('amazon_connections')
      .select('*')
      .eq('status', 'active');

    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { data: connections, error: connError } = await query;

    if (connError || !connections?.length) {
      console.log('No active connections found');
      return new Response(JSON.stringify({ success: true, message: 'No connections to sync', synced: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let totalSynced = 0;
    const errors: string[] = [];

    for (const connection of connections) {
      try {
        console.log(`\n📌 Syncing search terms for profile ${connection.profile_id}`);

        // Get decrypted access token using RPC function (same as refresh-amazon-token)
        const { data: tokensArray, error: tokenError } = await supabase
          .rpc('get_tokens_with_key', {
            p_profile_id: connection.profile_id,
            p_encryption_key: encryptionKey
          });

        if (tokenError || !tokensArray?.[0]?.access_token) {
          console.error(`Failed to get tokens for profile ${connection.profile_id}:`, tokenError);
          errors.push(`No token for ${connection.profile_id}`);
          continue;
        }

        const accessToken = tokensArray[0].access_token;
        console.log(`✅ Retrieved access token for profile ${connection.profile_id}`);

        // Use stored endpoint from connection, fallback to marketplace detection
        const apiEndpoint = connection.advertising_api_endpoint || getApiEndpoint(connection.marketplace_id);
        console.log(`🌍 Using API endpoint: ${apiEndpoint} (marketplace: ${connection.marketplace_id})`);

        // Create and poll search term report
        const reportId = await createSearchTermReport(accessToken, connection.profile_id, dateRange, apiEndpoint);
        const reportStatus = await pollReportStatus(accessToken, connection.profile_id, reportId, 300000, apiEndpoint);

        if (!reportStatus.url) {
          console.error(`No download URL for report ${reportId}`);
          errors.push(`No URL for ${connection.profile_id}`);
          continue;
        }

        // Download and parse report
        const searchTerms = await downloadReport(reportStatus.url);

        if (searchTerms.length === 0) {
          console.log(`No search terms found for profile ${connection.profile_id}`);
          continue;
        }

        // Transform and batch upsert into fact_search_term_daily
        const batchSize = 500;
        let inserted = 0;

        for (let i = 0; i < searchTerms.length; i += batchSize) {
          const batch = searchTerms.slice(i, i + batchSize).map(term => ({
            date: term.date || new Date().toISOString().split('T')[0],
            profile_id: connection.profile_id,
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
            errors.push(`Upsert error for ${connection.profile_id}: ${upsertError.message}`);
          } else {
            inserted += batch.length;
          }
        }

        console.log(`✅ Inserted ${inserted} search term records for ${connection.profile_id}`);
        totalSynced += inserted;

      } catch (connError) {
        const errMsg = connError instanceof Error ? connError.message : 'Unknown error';
        console.error(`Error syncing ${connection.profile_id}:`, errMsg);
        errors.push(`${connection.profile_id}: ${errMsg}`);
      }
    }

    console.log(`\n✅ Search term sync complete - ${totalSynced} records synced`);

    return new Response(JSON.stringify({
      success: true,
      request_id: requestId,
      synced: totalSynced,
      connections_processed: connections.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Search term sync error:', error);
    return new Response(JSON.stringify({
      error: 'Search term sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      request_id: requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
