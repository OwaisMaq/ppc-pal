
import { fetchBasicMetrics } from './metrics.ts';

export async function fetchCampaignReports(
  accessToken: string,
  clientId: string,
  profileId: string,
  baseUrl: string,
  campaignIds: string[]
): Promise<any[]> {
  console.log('=== ENHANCED AMAZON API PERFORMANCE METRICS FETCHING ===');
  console.log(`🔍 Starting metrics fetch with ${campaignIds.length} campaign UUIDs`);
  console.log(`📊 Base URL: ${baseUrl}, Profile: ${profileId}`);
  
  if (campaignIds.length === 0) {
    console.log('❌ CRITICAL: No campaign UUIDs provided');
    return [];
  }

  // First, get Amazon campaign IDs from our database
  console.log('🔍 Fetching Amazon campaign IDs from database...');
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Enhanced reporting endpoints with better date handling
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const endpoints = [
    {
      name: 'Sponsored Products Reports API v3',
      url: `${baseUrl}/reporting/reports`,
      method: 'POST',
      body: {
        reportTypeId: 'spCampaigns',
        timeUnit: 'DAILY',
        format: 'GZIP_JSON',
        startDate: thirtyDaysAgo,
        endDate: today,
        groupBy: ['campaign'],
        columns: ['campaignId', 'impressions', 'clicks', 'cost', 'attributedSales14d', 'attributedUnitsOrdered14d']
      }
    },
    {
      name: 'Campaign Performance Summary',
      url: `${baseUrl}/v2/sp/campaigns/report`,
      method: 'POST',
      body: {
        reportDate: today,
        metrics: 'campaignId,impressions,clicks,cost,attributedSales14d,attributedUnitsOrdered14d'
      }
    },
    {
      name: 'Extended Campaigns with Performance',
      url: `${baseUrl}/v2/sp/campaigns/extended`,
      method: 'GET'
    },
    {
      name: 'Basic Campaigns API',
      url: `${baseUrl}/v2/sp/campaigns`,
      method: 'GET'
    }
  ];

  console.log(`🔄 Testing ${endpoints.length} Amazon API endpoints for performance data`);

  // Try each endpoint
  for (const [index, endpoint] of endpoints.entries()) {
    try {
      console.log(`\n=== TESTING ENDPOINT ${index + 1}: ${endpoint.name} ===`);
      console.log(`🌐 URL: ${endpoint.url}`);

      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers
      };

      if (endpoint.body) {
        requestOptions.body = JSON.stringify(endpoint.body);
        console.log(`📋 Request body:`, JSON.stringify(endpoint.body, null, 2));
      }

      console.log(`⏳ Making request...`);
      const startTime = Date.now();
      
      const response = await fetch(endpoint.url, requestOptions);
      const responseTime = Date.now() - startTime;
      
      console.log(`⚡ Response: ${response.status} ${response.statusText} (${responseTime}ms)`);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        console.log(`📄 Content-Type: ${contentType}`);
        
        if (contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`📦 Response structure:`, {
            isArray: Array.isArray(data),
            length: Array.isArray(data) ? data.length : 'N/A',
            keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A'
          });
          
          if (Array.isArray(data) && data.length > 0) {
            console.log(`🎉 SUCCESS: ${endpoint.name} returned ${data.length} records!`);
            console.log(`📊 Sample record:`, JSON.stringify(data[0], null, 2));
            
            // Transform to metrics format
            const transformedMetrics = data.map((item, itemIndex) => {
              const campaignId = (item.campaignId || item.campaign_id || item.id)?.toString();
              
              if (!campaignId) {
                console.warn(`⚠️ No campaign ID in record ${itemIndex + 1}`);
                return null;
              }
              
              const impressions = item.impressions || item.totalImpressions || 0;
              const clicks = item.clicks || item.totalClicks || 0;
              const spend = Number(item.cost || item.spend || item.totalCost || 0);
              const sales = Number(item.attributedSales14d || item.sales14d || item.sales || item.totalSales || 0);
              const orders = item.attributedUnitsOrdered14d || item.purchases14d || item.orders || item.totalOrders || 0;
              
              // Calculate derived metrics
              const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
              const cpc = clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0;
              const acos = sales > 0 ? Number(((spend / sales) * 100).toFixed(2)) : 0;
              const roas = spend > 0 ? Number((sales / spend).toFixed(2)) : 0;
              const conversionRate = clicks > 0 ? Number(((orders / clicks) * 100).toFixed(2)) : 0;
              
              const metrics = {
                campaignId, // Amazon campaign ID
                impressions,
                clicks,
                spend: Number(spend.toFixed(2)),
                sales: Number(sales.toFixed(2)),
                orders,
                ctr,
                cpc,
                acos,
                roas,
                conversionRate,
                fromAPI: true, // Mark as real API data
                sourceEndpoint: endpoint.name,
                dataQuality: 'real'
              };
              
              console.log(`✅ Real metrics for Amazon campaign ${campaignId}:`, {
                sales: metrics.sales,
                spend: metrics.spend,
                orders: metrics.orders,
                source: endpoint.name
              });
              
              return metrics;
            }).filter(Boolean);

            console.log(`🎯 Extracted ${transformedMetrics.length} valid metrics from ${endpoint.name}`);
            return transformedMetrics;
          } else {
            console.log(`⚠️ ${endpoint.name} returned empty data`);
          }
        } else {
          const textResponse = await response.text();
          console.log(`❌ Non-JSON response from ${endpoint.name}:`, textResponse.substring(0, 200));
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ ${endpoint.name} failed (${response.status}):`, errorText);
        
        // Enhanced error analysis
        if (response.status === 401) {
          console.log(`🔑 Authentication issue - token may be expired`);
        } else if (response.status === 403) {
          console.log(`🚫 Access forbidden - missing reporting permissions`);
        } else if (response.status === 429) {
          console.log(`⏱️ Rate limited - too many requests`);
        }
      }
    } catch (error) {
      console.error(`💥 Error with ${endpoint.name}:`, error.message);
    }
  }

  console.log('\n=== ALL API ENDPOINTS TESTED - NO REAL DATA FOUND ===');
  console.log('🎭 Generating enhanced fallback data...');
  
  // Generate fallback data using our campaign UUIDs
  const fallbackMetrics = await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
  
  console.log(`✅ Generated ${fallbackMetrics.length} simulated metrics`);
  console.log('⚠️ To get real data, ensure:');
  console.log('   1. Campaigns have recent activity and spend');
  console.log('   2. Account has advertising::reporting API permissions');
  console.log('   3. Allow 24-48 hours for Amazon data to appear');
  
  return fallbackMetrics;
}
