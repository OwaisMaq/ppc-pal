import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const profileId = url.searchParams.get('profileId');
    const fromDate = url.searchParams.get('fromDate') || getDateDaysAgo(7);
    const toDate = url.searchParams.get('toDate') || getDateDaysAgo(0);

    console.log(`Running conversion path ingestion for profile ${profileId} from ${fromDate} to ${toDate}`);

    if (!profileId) {
      // Run for all active profiles
      const { data: connections } = await supabase
        .from('amazon_connections')
        .select('profile_id, advertising_api_endpoint, id')
        .eq('status', 'active');

      if (!connections || connections.length === 0) {
        return new Response(JSON.stringify({ message: 'No active connections found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const results = [];
      for (const conn of connections) {
        const result = await requestConversionPathReport(
          supabase,
          conn.profile_id,
          conn.advertising_api_endpoint || 'https://advertising-api.amazon.com',
          conn.id,
          fromDate,
          toDate
        );
        results.push({ profileId: conn.profile_id, ...result });
      }

      return new Response(JSON.stringify({ 
        message: `Initiated conversion path reports for ${connections.length} profiles`,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Get connection for this profile
      const { data: connection, error: connError } = await supabase
        .from('amazon_connections')
        .select('id, advertising_api_endpoint')
        .eq('profile_id', profileId)
        .eq('status', 'active')
        .single();

      if (connError || !connection) {
        return new Response(JSON.stringify({ 
          error: `No active connection found for profile ${profileId}` 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const result = await requestConversionPathReport(
        supabase,
        profileId,
        connection.advertising_api_endpoint || 'https://advertising-api.amazon.com',
        connection.id,
        fromDate,
        toDate
      );
      
      return new Response(JSON.stringify({ 
        message: `Initiated conversion path report for profile ${profileId}`,
        ...result 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Conversion path runner error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function requestConversionPathReport(
  supabase: any,
  profileId: string,
  apiEndpoint: string,
  connectionId: string,
  startDate: string,
  endDate: string
): Promise<{ status: string; reportId?: string; error?: string }> {
  console.log(`Requesting conversion path report for profile ${profileId}`);

  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  // Get access token
  const tokenData = await supabase.rpc('get_tokens_with_key', {
    p_profile_id: profileId,
    p_encryption_key: encryptionKey
  });

  if (tokenData.error || !tokenData.data || tokenData.data.length === 0) {
    console.error('Failed to get access token for profile:', profileId);
    return { status: 'error', error: 'Failed to get access token' };
  }

  const accessToken = tokenData.data[0].access_token;
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');

  // Request conversion path report using v3 API
  // Note: spConversionPath is a beta report type - may not be available for all accounts
  const reportConfig = {
    name: `conversion_path_${profileId}_${Date.now()}`,
    startDate,
    endDate,
    configuration: {
      adProduct: 'SPONSORED_PRODUCTS',
      reportTypeId: 'spConversions', // Use spConversions which includes path data
      groupBy: ['campaign', 'adGroup'],
      columns: [
        'date',
        'campaignId',
        'adGroupId',
        'impressions',
        'clicks',
        'cost',
        'purchases7d',
        'sales7d',
        'purchasesSameSku7d',
        'salesSameSku7d'
      ],
      timeUnit: 'DAILY',
      format: 'GZIP_JSON'
    }
  };

  console.log(`Requesting report with config:`, JSON.stringify(reportConfig));

  const reportUrl = `${apiEndpoint}/reporting/reports`;
  const response = await fetch(reportUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId': clientId!,
      'Amazon-Advertising-API-Scope': profileId,
      'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
      'Accept': 'application/vnd.createasyncreportrequest.v3+json'
    },
    body: JSON.stringify(reportConfig)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Report request failed: ${response.status} - ${errorText}`);
    
    // If conversion path report fails (beta API), fall back to reconstructing from search terms
    if (response.status === 400 || response.status === 404) {
      console.log('Conversion path report type not available, falling back to search term reconstruction');
      return await fallbackToSearchTermPaths(supabase, profileId, startDate, endDate);
    }
    
    return { status: 'error', error: `Report request failed: ${response.status}` };
  }

  const reportResult = await response.json();
  const reportId = reportResult.reportId;
  
  console.log(`Report requested successfully, reportId: ${reportId}`);

  // Insert into pending_amazon_reports for async processing
  const { error: insertError } = await supabase
    .from('pending_amazon_reports')
    .insert({
      connection_id: connectionId,
      report_id: reportId,
      report_type: 'spConversions',
      status: 'pending',
      configuration: {
        entityType: 'conversionPaths',
        dateRange: { startDate, endDate },
        timeUnit: 'DAILY',
        api_endpoint: apiEndpoint,
        profile_id: profileId
      }
    });

  if (insertError) {
    console.error('Failed to insert pending report:', insertError);
    return { status: 'error', error: 'Failed to queue report for processing' };
  }

  return { status: 'pending', reportId };
}

async function fallbackToSearchTermPaths(
  supabase: any,
  profileId: string,
  startDate: string,
  endDate: string
): Promise<{ status: string; pathsGenerated?: number }> {
  console.log(`Reconstructing conversion paths from search term data for profile ${profileId}`);

  // Query existing search term data with conversions
  const { data: searchTerms, error } = await supabase
    .from('fact_search_term_daily')
    .select('*')
    .eq('profile_id', profileId)
    .gte('date', startDate)
    .lte('date', endDate)
    .gt('attributed_conversions_7d', 0)
    .order('date', { ascending: true });

  if (error || !searchTerms || searchTerms.length === 0) {
    console.log('No search term data available for reconstruction');
    return { status: 'no_data', pathsGenerated: 0 };
  }

  // Group by date and reconstruct approximate paths
  const pathsByDate: Record<string, any[]> = {};
  
  for (const term of searchTerms) {
    const date = term.date;
    if (!pathsByDate[date]) {
      pathsByDate[date] = [];
    }
    
    // Create a simplified path from search term data
    const path = [
      {
        type: 'sp',
        interaction: 'click',
        campaign_id: term.campaign_id,
        ad_group_id: term.ad_group_id,
        search_term: term.search_term
      }
    ];

    const pathFingerprint = generatePathFingerprint(path);
    
    pathsByDate[date].push({
      date,
      source: 'reconstructed',
      profile_id: profileId,
      marketplace: 'ATVPDKIKX0DER',
      path_fingerprint: pathFingerprint,
      path_json: path,
      conversions: term.attributed_conversions_7d,
      sales_micros: term.attributed_sales_7d_micros || 0,
      clicks: term.clicks,
      views: term.impressions,
      touch_count: 1
    });
  }

  // Flatten and upsert
  const allPaths = Object.values(pathsByDate).flat();
  
  if (allPaths.length > 0) {
    const { error: upsertError } = await supabase
      .from('conversion_paths_daily')
      .upsert(allPaths, {
        onConflict: 'date,source,profile_id,path_fingerprint',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Failed to upsert reconstructed paths:', upsertError);
      return { status: 'error', pathsGenerated: 0 };
    }

    // Also generate time lag buckets (approximate since we don't have true lag data)
    const timeLagData = generateApproximateTimeLag(profileId, startDate, endDate, searchTerms);
    if (timeLagData.length > 0) {
      await supabase
        .from('time_lag_daily')
        .upsert(timeLagData, {
          onConflict: 'date,source,profile_id,bucket',
          ignoreDuplicates: false
        });
    }
  }

  console.log(`Reconstructed ${allPaths.length} conversion paths from search term data`);
  return { status: 'reconstructed', pathsGenerated: allPaths.length };
}

function generateApproximateTimeLag(
  profileId: string,
  startDate: string,
  endDate: string,
  searchTerms: any[]
): any[] {
  const timeLag: any[] = [];
  const buckets = ['0-1d', '2-3d', '4-7d'];
  
  // Group conversions by date
  const conversionsByDate: Record<string, number> = {};
  const salesByDate: Record<string, number> = {};
  
  for (const term of searchTerms) {
    const date = term.date;
    conversionsByDate[date] = (conversionsByDate[date] || 0) + (term.attributed_conversions_7d || 0);
    salesByDate[date] = (salesByDate[date] || 0) + (term.attributed_sales_7d_micros || 0);
  }

  // Distribute conversions across buckets with rough estimates
  // 0-1d: ~50%, 2-3d: ~30%, 4-7d: ~20%
  const bucketWeights = [0.5, 0.3, 0.2];
  
  for (const date of Object.keys(conversionsByDate)) {
    const totalConversions = conversionsByDate[date];
    const totalSales = salesByDate[date];
    
    buckets.forEach((bucket, index) => {
      const conversions = Math.round(totalConversions * bucketWeights[index]);
      const salesMicros = Math.round(totalSales * bucketWeights[index]);
      
      if (conversions > 0) {
        timeLag.push({
          date,
          source: 'reconstructed',
          profile_id: profileId,
          bucket,
          conversions,
          sales_micros: salesMicros
        });
      }
    });
  }
  
  return timeLag;
}

function generatePathFingerprint(pathJson: any[]): string {
  const pathString = JSON.stringify(pathJson.map(step => ({
    type: step.type,
    interaction: step.interaction,
    campaign_id: step.campaign_id
  })));
  
  let hash = 0;
  for (let i = 0; i < pathString.length; i++) {
    const char = pathString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
