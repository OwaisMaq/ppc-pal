
import { fetchBasicMetrics } from './metrics.ts';

export async function fetchCampaignReports(
  accessToken: string,
  clientId: string,
  profileId: string,
  baseUrl: string,
  campaignIds: string[]
): Promise<any[]> {
  console.log('=== COMPREHENSIVE AMAZON API PERFORMANCE METRICS FETCHING ===');
  console.log(`🔍 Starting enhanced metrics fetch with ${campaignIds.length} campaign UUIDs`);
  console.log(`📊 Base URL: ${baseUrl}, Profile: ${profileId}`);
  console.log(`🎯 Amazon Client ID: ${clientId ? 'Present' : 'Missing'}`);
  console.log(`🔑 Access Token: ${accessToken ? `Present (${accessToken.length} chars)` : 'Missing'}`);
  
  if (campaignIds.length === 0) {
    console.log('❌ CRITICAL: No campaign UUIDs provided');
    return [];
  }

  // Enhanced headers with additional debugging
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'AmazonAdvertisingAPI/1.0'
  };

  console.log('📋 Request headers prepared:', {
    hasAuth: !!headers.Authorization,
    hasClientId: !!headers['Amazon-Advertising-API-ClientId'],
    hasScope: !!headers['Amazon-Advertising-API-Scope'],
    contentType: headers['Content-Type']
  });

  // Enhanced date handling with multiple date ranges
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log(`📅 Date ranges: Today: ${today}, Yesterday: ${yesterday}, 7 days: ${sevenDaysAgo}, 30 days: ${thirtyDaysAgo}`);

  // Comprehensive list of API endpoints to test
  const endpoints = [
    // Amazon DSP Reporting API v3 (Most comprehensive)
    {
      name: 'Amazon DSP Reporting API v3',
      priority: 1,
      url: `${baseUrl}/reporting/reports`,
      method: 'POST',
      body: {
        reportTypeId: 'spCampaigns',
        timeUnit: 'DAILY',
        format: 'GZIP_JSON',
        startDate: sevenDaysAgo,
        endDate: today,
        groupBy: ['campaign'],
        columns: ['campaignId', 'campaignName', 'impressions', 'clicks', 'cost', 'attributedSales14d', 'attributedUnitsOrdered14d', 'attributedSales7d', 'attributedUnitsOrdered7d']
      }
    },
    // Sponsored Products Campaign Reports v2
    {
      name: 'SP Campaign Reports v2',
      priority: 2,
      url: `${baseUrl}/v2/sp/campaigns/report`,
      method: 'POST',
      body: {
        reportDate: yesterday,
        metrics: 'campaignId,campaignName,impressions,clicks,cost,attributedSales14d,attributedUnitsOrdered14d,attributedSales7d,attributedUnitsOrdered7d'
      }
    },
    // Campaign Performance Metrics Direct
    {
      name: 'Campaign Performance Direct',
      priority: 3,
      url: `${baseUrl}/v2/sp/campaigns/extended`,
      method: 'GET'
    },
    // Basic Campaigns with Extended Data
    {
      name: 'Basic Campaigns Extended',
      priority: 4,
      url: `${baseUrl}/v2/sp/campaigns?stateFilter=enabled,paused&campaignTypeFilter=sponsoredProducts`,
      method: 'GET'
    },
    // Portfolio Performance (if available)
    {
      name: 'Portfolio Performance',
      priority: 5,
      url: `${baseUrl}/v2/portfolios/extended`,
      method: 'GET'
    }
  ];

  console.log(`🔄 Testing ${endpoints.length} enhanced Amazon API endpoints for performance data`);

  // Test each endpoint with enhanced error handling and retry logic
  for (const [index, endpoint] of endpoints.entries()) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`\n=== TESTING ENDPOINT ${index + 1}: ${endpoint.name} (Priority ${endpoint.priority}) ===`);
        console.log(`🌐 URL: ${endpoint.url}`);
        console.log(`🔄 Attempt: ${retryCount + 1}/${maxRetries + 1}`);

        const requestOptions: RequestInit = {
          method: endpoint.method,
          headers
        };

        if (endpoint.body) {
          requestOptions.body = JSON.stringify(endpoint.body);
          console.log(`📋 Request body:`, JSON.stringify(endpoint.body, null, 2));
        }

        console.log(`⏳ Making request to ${endpoint.name}...`);
        const startTime = Date.now();
        
        const response = await fetch(endpoint.url, requestOptions);
        const responseTime = Date.now() - startTime;
        
        console.log(`⚡ Response: ${response.status} ${response.statusText} (${responseTime}ms)`);
        console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          console.log(`📄 Content-Type: ${contentType}`);
          
          if (contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`📦 Raw response structure:`, {
              isArray: Array.isArray(data),
              length: Array.isArray(data) ? data.length : 'N/A',
              keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
              hasReports: data.reports ? 'Yes' : 'No',
              hasData: data.data ? 'Yes' : 'No'
            });
            
            // Handle different response formats
            let actualData = data;
            if (data.reports && Array.isArray(data.reports)) {
              actualData = data.reports;
            } else if (data.data && Array.isArray(data.data)) {
              actualData = data.data;
            }
            
            if (Array.isArray(actualData) && actualData.length > 0) {
              console.log(`🎉 SUCCESS: ${endpoint.name} returned ${actualData.length} records!`);
              console.log(`📊 Sample record:`, JSON.stringify(actualData[0], null, 2));
              
              // Enhanced data validation
              const validRecords = actualData.filter(item => {
                const hasCampaignId = item.campaignId || item.campaign_id || item.id;
                const hasMetrics = (item.impressions || 0) > 0 || 
                                 (item.clicks || 0) > 0 || 
                                 (item.cost || item.spend || 0) > 0 ||
                                 (item.attributedSales14d || item.sales || 0) > 0;
                return hasCampaignId && hasMetrics;
              });
              
              console.log(`✅ Valid records with metrics: ${validRecords.length}/${actualData.length}`);
              
              if (validRecords.length > 0) {
                // Transform to enhanced metrics format
                const transformedMetrics = validRecords.map((item, itemIndex) => {
                  const campaignId = (item.campaignId || item.campaign_id || item.id)?.toString();
                  
                  if (!campaignId) {
                    console.warn(`⚠️ No campaign ID in record ${itemIndex + 1}`);
                    return null;
                  }
                  
                  // Enhanced metrics extraction with multiple fallbacks
                  const impressions = item.impressions || item.totalImpressions || 0;
                  const clicks = item.clicks || item.totalClicks || 0;
                  const spend = Number(item.cost || item.spend || item.totalCost || 0);
                  const sales = Number(item.attributedSales14d || item.attributedSales7d || item.sales14d || item.sales || item.totalSales || 0);
                  const orders = item.attributedUnitsOrdered14d || item.attributedUnitsOrdered7d || item.purchases14d || item.orders || item.totalOrders || 0;
                  
                  // Calculate enhanced derived metrics
                  const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
                  const cpc = clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0;
                  const acos = sales > 0 ? Number(((spend / sales) * 100).toFixed(2)) : 0;
                  const roas = spend > 0 ? Number((sales / spend).toFixed(2)) : 0;
                  const conversionRate = clicks > 0 ? Number(((orders / clicks) * 100).toFixed(2)) : 0;
                  
                  const metrics = {
                    campaignId, // Amazon campaign ID
                    campaignName: item.campaignName || item.name || `Campaign ${campaignId}`,
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
                    dataQuality: 'real',
                    priority: endpoint.priority,
                    responseTime: responseTime,
                    fetchedAt: new Date().toISOString()
                  };
                  
                  console.log(`✅ REAL API metrics for Amazon campaign ${campaignId}:`, {
                    name: metrics.campaignName,
                    sales: metrics.sales,
                    spend: metrics.spend,
                    orders: metrics.orders,
                    source: endpoint.name,
                    priority: endpoint.priority
                  });
                  
                  return metrics;
                }).filter(Boolean);

                console.log(`🎯 Successfully extracted ${transformedMetrics.length} valid metrics from ${endpoint.name}`);
                console.log(`🏆 BREAKTHROUGH: Real Amazon API data successfully retrieved!`);
                
                return transformedMetrics;
              } else {
                console.log(`⚠️ ${endpoint.name} returned data but no valid metrics found`);
              }
            } else {
              console.log(`⚠️ ${endpoint.name} returned empty or invalid data structure`);
              if (typeof data === 'object') {
                console.log('Response data keys:', Object.keys(data));
              }
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
            console.log(`🔑 Authentication issue - token may be expired or invalid`);
          } else if (response.status === 403) {
            console.log(`🚫 Access forbidden - may need additional permissions or scopes`);
          } else if (response.status === 429) {
            console.log(`⏱️ Rate limited - will retry with backoff`);
            if (retryCount < maxRetries) {
              const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
              console.log(`⏳ Waiting ${backoffTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              retryCount++;
              continue;
            }
          } else if (response.status === 400) {
            console.log(`📋 Bad request - check request format and parameters`);
          } else if (response.status >= 500) {
            console.log(`🔧 Server error - Amazon API may be temporarily unavailable`);
            if (retryCount < maxRetries) {
              console.log(`🔄 Retrying due to server error...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              retryCount++;
              continue;
            }
          }
        }
        
        // Break out of retry loop if we reach here
        break;
        
      } catch (error) {
        console.error(`💥 Network error with ${endpoint.name} (attempt ${retryCount + 1}):`, error.message);
        
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying due to network error...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
          continue;
        } else {
          console.error(`❌ Max retries exceeded for ${endpoint.name}`);
          break;
        }
      }
    }
  }

  console.log('\n=== ALL ENHANCED API ENDPOINTS TESTED - GENERATING FALLBACK DATA ===');
  console.log('🎭 No real performance data available, generating enhanced simulated data...');
  
  // Generate enhanced fallback data
  const fallbackMetrics = await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
  
  console.log(`✅ Generated ${fallbackMetrics.length} enhanced simulated metrics`);
  console.log('⚠️ To get real data, ensure:');
  console.log('   1. Campaigns have recent activity and spend (last 24-48 hours)');
  console.log('   2. Account has advertising::reporting API permissions');
  console.log('   3. Profile has access to campaign performance data');
  console.log('   4. API scope includes required reporting permissions');
  console.log('   5. Campaigns are not too new (Amazon data has 24-48 hour delay)');
  
  return fallbackMetrics;
}
