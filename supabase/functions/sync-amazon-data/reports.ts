
import { fetchBasicMetrics } from './metrics.ts';

export async function fetchCampaignReports(
  accessToken: string,
  clientId: string,
  profileId: string,
  baseUrl: string,
  campaignIds: string[]
): Promise<any[]> {
  console.log('=== ENHANCED AMAZON API PERFORMANCE METRICS FETCHING WITH DETAILED LOGGING ===');
  console.log(`🔍 DEBUG: Starting metrics fetch process`);
  console.log(`📊 Input parameters:`, {
    baseUrl,
    profileId,
    campaignIdsCount: campaignIds.length,
    accessTokenLength: accessToken.length,
    clientIdLength: clientId.length
  });
  
  if (campaignIds.length === 0) {
    console.log('❌ CRITICAL: No campaign UUIDs provided - this indicates a campaign storage issue');
    console.log('🔍 DEBUG: This means either:');
    console.log('  1. No campaigns were stored in the database');
    console.log('  2. Campaign ID extraction failed during storage');
    console.log('  3. The campaigns table query returned empty results');
    return [];
  }

  console.log(`🎯 Campaign UUIDs received for metrics fetching:`, campaignIds.slice(0, 5));
  if (campaignIds.length > 5) {
    console.log(`   ... and ${campaignIds.length - 5} more campaign UUIDs`);
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  console.log('🔑 Request headers prepared:', {
    hasAuthorization: headers.Authorization?.startsWith('Bearer '),
    clientId: headers['Amazon-Advertising-API-ClientId'],
    scope: headers['Amazon-Advertising-API-Scope']
  });

  // Enhanced endpoint testing with better logging and date parameters
  const endpoints = [
    {
      name: 'Sponsored Products Reports API v3',
      url: `${baseUrl}/reporting/reports`,
      method: 'POST',
      isReport: true,
      body: {
        reportTypeId: 'spCampaigns',
        timeUnit: 'DAILY',
        format: 'GZIP_JSON',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        groupBy: ['campaign'],
        columns: ['campaignId', 'impressions', 'clicks', 'cost', 'attributedSales14d', 'attributedUnitsOrdered14d']
      }
    },
    {
      name: 'Extended Campaigns API with metrics',
      url: `${baseUrl}/v2/sp/campaigns/extended`,
      method: 'GET',
      isReport: false
    },
    {
      name: 'Basic Campaigns API',
      url: `${baseUrl}/v2/sp/campaigns`,
      method: 'GET',
      isReport: false
    },
    {
      name: 'Legacy Campaigns API',
      url: `${baseUrl}/v2/campaigns`,
      method: 'GET',
      isReport: false
    },
    {
      name: 'Campaign Performance Report v2',
      url: `${baseUrl}/v2/reports/campaigns`,
      method: 'POST',
      isReport: true,
      body: {
        reportDate: new Date().toISOString().split('T')[0],
        metrics: 'impressions,clicks,cost,attributedSales14d,attributedUnitsOrdered14d'
      }
    }
  ];

  console.log(`🔄 Will test ${endpoints.length} different Amazon API endpoints for performance data`);

  // Try each endpoint with detailed logging
  for (const [index, endpoint] of endpoints.entries()) {
    try {
      console.log(`\n=== TESTING ENDPOINT ${index + 1}/${endpoints.length}: ${endpoint.name} ===`);
      console.log(`🌐 URL: ${endpoint.url}`);
      console.log(`📤 Method: ${endpoint.method}`);
      
      if (endpoint.body) {
        console.log(`📋 Request body:`, JSON.stringify(endpoint.body, null, 2));
      }

      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers
      };

      if (endpoint.body) {
        requestOptions.body = JSON.stringify(endpoint.body);
      }

      console.log(`⏳ Making request to ${endpoint.name}...`);
      const startTime = Date.now();
      
      const response = await fetch(endpoint.url, requestOptions);
      const endTime = Date.now();
      
      console.log(`⚡ Response received in ${endTime - startTime}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`🔗 Response headers:`, {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        requestId: response.headers.get('x-amzn-requestid') || response.headers.get('x-amz-request-id')
      });

      if (response.ok) {
        console.log(`✅ ${endpoint.name} responded successfully!`);
        
        const contentType = response.headers.get('content-type') || '';
        console.log(`📄 Response content type: ${contentType}`);
        
        if (contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`📦 Response data structure:`, {
            isArray: Array.isArray(data),
            length: Array.isArray(data) ? data.length : 'N/A',
            keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
            sampleData: Array.isArray(data) && data.length > 0 ? data[0] : data
          });
          
          if (Array.isArray(data) && data.length > 0) {
            console.log(`🎉 SUCCESS: ${endpoint.name} returned ${data.length} records with performance data!`);
            console.log(`🔍 Sample record structure:`, JSON.stringify(data[0], null, 2));
            
            // Transform all campaigns to metrics format with Amazon campaign IDs
            const transformedMetrics = data.map((item, itemIndex) => {
              console.log(`🔄 Processing record ${itemIndex + 1}/${data.length}:`, item);
              
              // Handle different API response formats for campaign ID
              const campaignId = (item.campaignId || item.campaign_id || item.id)?.toString();
              console.log(`🆔 Extracted campaign ID: ${campaignId}`);
              
              if (!campaignId) {
                console.warn(`⚠️ No campaign ID found in record ${itemIndex + 1}:`, item);
                return null;
              }
              
              // Extract metrics from various possible field names with detailed logging
              const impressions = item.impressions || item.totalImpressions || 0;
              const clicks = item.clicks || item.totalClicks || 0;
              const spend = item.cost || item.spend || item.totalCost || 0;
              const sales = item.attributedSales14d || item.sales14d || item.sales || item.totalSales || 0;
              const orders = item.attributedUnitsOrdered14d || item.purchases14d || item.orders || item.totalOrders || 0;
              
              console.log(`📊 Extracted metrics for campaign ${campaignId}:`, {
                impressions, clicks, spend, sales, orders
              });
              
              // Calculate derived metrics
              const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
              const cpc = clicks > 0 ? spend / clicks : 0;
              const acos = sales > 0 ? (spend / sales) * 100 : 0;
              const roas = spend > 0 ? sales / spend : 0;
              const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;
              
              const metrics = {
                campaignId, // This is the Amazon campaign ID, not our UUID
                impressions,
                clicks,
                spend: Number(spend.toFixed(2)),
                sales: Number(sales.toFixed(2)),
                orders,
                ctr: Number(ctr.toFixed(2)),
                cpc: Number(cpc.toFixed(2)),
                acos: Number(acos.toFixed(2)),
                roas: Number(roas.toFixed(2)),
                conversionRate: Number(conversionRate.toFixed(2)),
                fromAPI: true, // CRITICAL: Mark as real Amazon API data
                sourceEndpoint: endpoint.name
              };
              
              console.log(`✅ REAL API METRICS processed for Amazon campaign ID ${campaignId}:`, {
                sales: metrics.sales,
                spend: metrics.spend,
                orders: metrics.orders,
                clicks: metrics.clicks,
                impressions: metrics.impressions,
                acos: metrics.acos,
                roas: metrics.roas,
                source: endpoint.name
              });
              
              return metrics;
            }).filter(Boolean); // Remove null entries

            console.log(`🎯 Final result: ${transformedMetrics.length} valid metrics extracted from ${endpoint.name}`);
            return transformedMetrics;
          } else {
            console.log(`⚠️ ${endpoint.name} returned empty or invalid data structure`);
            console.log(`🔍 Full response:`, data);
          }
        } else {
          console.log(`❌ ${endpoint.name} returned non-JSON response`);
          const textResponse = await response.text();
          console.log(`📄 Response text preview:`, textResponse.substring(0, 200));
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ ${endpoint.name} failed with status ${response.status}:`, errorText);
        
        // Enhanced error analysis
        if (response.status === 401) {
          console.log(`🔑 Authentication failed - check token validity and permissions`);
        } else if (response.status === 403) {
          console.log(`🚫 Access forbidden - profile may lack reporting permissions`);
        } else if (response.status === 404) {
          console.log(`🔍 Endpoint not found - this API may not be available in this region`);
        } else if (response.status === 429) {
          console.log(`⏱️ Rate limit exceeded - too many requests`);
        } else if (response.status >= 500) {
          console.log(`🔧 Server error - Amazon API having issues`);
        }
        
        console.log(`⏭️ Continuing to next endpoint...`);
      }
    } catch (error) {
      console.error(`💥 Network/Request error with ${endpoint.name}:`, {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200)
      });
      console.log(`⏭️ Continuing to next endpoint...`);
    }
  }

  console.log('\n=== ALL REAL API ENDPOINTS EXHAUSTED ===');
  console.log('🔍 Analysis of what happened:');
  console.log('1. All available Amazon API endpoints were tested');
  console.log('2. None returned usable performance metrics data');
  console.log('3. This could indicate:');
  console.log('   - No campaigns have performance data for the date range');
  console.log('   - Account lacks reporting API permissions');
  console.log('   - Profile is in a different region or marketplace');
  console.log('   - Campaigns are too new (data delay 24-48 hours)');
  console.log('   - API access token lacks required scopes');
  
  console.log('\n🎭 Generating enhanced fallback data for development...');
  console.log(`📊 Will create simulated metrics for ${campaignIds.length} campaign UUIDs`);
  
  // Generate enhanced fallback data that uses our actual campaign UUIDs
  const fallbackMetrics = await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
  
  console.log(`✅ Generated ${fallbackMetrics.length} fallback metrics records`);
  console.log('⚠️ IMPORTANT: This is simulated data for development purposes');
  console.log('🎯 To get real data, ensure:');
  console.log('   1. Campaigns have recent activity and spend');
  console.log('   2. Amazon account has advertising API reporting permissions');
  console.log('   3. Token includes required scopes for reporting data');
  console.log('   4. Campaigns are not brand new (allow 24-48 hours for data)');
  
  return fallbackMetrics;
}
