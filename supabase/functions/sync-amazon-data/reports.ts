
import { fetchBasicMetrics } from './metrics.ts';

export async function fetchCampaignReports(
  accessToken: string,
  clientId: string,
  profileId: string,
  baseUrl: string,
  campaignIds: string[]
): Promise<any[]> {
  console.log('=== FETCHING REAL AMAZON API PERFORMANCE METRICS ===');
  console.log(`Attempting to fetch performance data for ${campaignIds.length} campaigns`);
  
  if (campaignIds.length === 0) {
    console.log('No campaigns to fetch reports for - this is normal for new advertising accounts');
    return [];
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Try the most reliable Amazon API reporting endpoints in order
  const endpoints = [
    {
      name: 'Extended Campaigns API',
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
    }
  ];

  // Try each endpoint to get real performance data
  for (const endpoint of endpoints) {
    try {
      console.log(`=== Trying ${endpoint.name} ===`);
      console.log(`URL: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers
      });

      console.log(`${endpoint.name} response status:`, response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(`${endpoint.name} returned ${Array.isArray(data) ? data.length : 'non-array'} records`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('Sample API response:', JSON.stringify(data[0], null, 2));
          
          // Filter data for our campaigns and transform to metrics
          const relevantData = data.filter(item => {
            const itemCampaignId = item.campaignId?.toString() || item.campaign_id?.toString() || item.id?.toString();
            return itemCampaignId && campaignIds.includes(itemCampaignId);
          });
          
          console.log(`Found ${relevantData.length} matching campaigns with performance data`);
          
          if (relevantData.length > 0) {
            const transformedMetrics = relevantData.map(item => {
              // Handle different API response formats for performance metrics
              const campaignId = (item.campaignId || item.campaign_id || item.id)?.toString();
              
              // Extract metrics from various possible field names
              const impressions = item.impressions || item.totalImpressions || 0;
              const clicks = item.clicks || item.totalClicks || 0;
              const spend = item.cost || item.spend || item.totalCost || 0;
              const sales = item.attributedSales14d || item.sales14d || item.sales || item.totalSales || 0;
              const orders = item.attributedUnitsOrdered14d || item.purchases14d || item.orders || item.totalOrders || 0;
              
              // Calculate derived metrics
              const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
              const cpc = clicks > 0 ? spend / clicks : 0;
              const acos = sales > 0 ? (spend / sales) * 100 : 0;
              const roas = spend > 0 ? sales / spend : 0;
              const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;
              
              const metrics = {
                campaignId,
                impressions,
                clicks,
                spend,
                sales,
                orders,
                ctr: Number(ctr.toFixed(2)),
                cpc: Number(cpc.toFixed(2)),
                acos: Number(acos.toFixed(2)),
                roas: Number(roas.toFixed(2)),
                conversionRate: Number(conversionRate.toFixed(2)),
                fromAPI: true // CRITICAL: Mark as real Amazon API data
              };
              
              console.log(`✓ REAL API METRICS for campaign ${campaignId}:`, {
                sales: metrics.sales,
                spend: metrics.spend,
                orders: metrics.orders,
                clicks: metrics.clicks,
                impressions: metrics.impressions,
                source: endpoint.name,
                isRealData: true
              });
              
              return metrics;
            });

            console.log(`SUCCESS: Returning ${transformedMetrics.length} REAL API metrics from ${endpoint.name}`);
            return transformedMetrics;
          } else {
            console.log(`${endpoint.name} returned campaigns but none match our campaign IDs`);
          }
        } else {
          console.log(`${endpoint.name} returned empty or invalid data structure`);
        }
      } else {
        const errorText = await response.text();
        console.log(`${endpoint.name} failed with status ${response.status}:`, errorText);
        
        if (errorText.includes('UNAUTHORIZED')) {
          console.log('Authorization failed - this may indicate the profile lacks advertising permissions or token issues');
        } else if (errorText.includes('NOT_FOUND')) {
          console.log('Endpoint not available - trying next option');
        }
      }
    } catch (error) {
      console.error(`Network error with ${endpoint.name}:`, error.message);
    }
  }

  console.log('=== ALL REAL API ENDPOINTS FAILED OR RETURNED NO DATA ===');
  console.log('This indicates either:');
  console.log('1. No campaigns with performance data exist');
  console.log('2. API access issues');
  console.log('3. Profile lacks advertising permissions');
  console.log('Generating simulated fallback data...');
  
  // Return simulated data as fallback, but clearly marked
  return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
}
