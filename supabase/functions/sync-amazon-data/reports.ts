
import { fetchBasicMetrics } from './metrics.ts';

export async function fetchCampaignReports(
  accessToken: string,
  clientId: string,
  profileId: string,
  baseUrl: string,
  campaignIds: string[]
): Promise<any[]> {
  console.log('=== FETCHING REAL AMAZON API METRICS ===');
  console.log(`Attempting to fetch performance data for ${campaignIds.length} campaigns`);
  
  if (campaignIds.length === 0) {
    console.log('No campaigns to fetch reports for');
    return [];
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Try the most reliable Amazon API reporting endpoints
  const endpoints = [
    {
      name: 'Campaigns Report API',
      url: `${baseUrl}/v2/sp/campaigns/report`,
      method: 'POST',
      isReport: true
    },
    {
      name: 'Extended Campaigns API',
      url: `${baseUrl}/v2/sp/campaigns/extended`,
      method: 'GET',
      isReport: false
    },
    {
      name: 'Basic Campaigns API with filtering',
      url: `${baseUrl}/v2/sp/campaigns`,
      method: 'GET',
      isReport: false
    }
  ];

  // Try each endpoint in priority order
  for (const endpoint of endpoints) {
    try {
      console.log(`=== Trying ${endpoint.name} ===`);
      console.log(`URL: ${endpoint.url}`);
      
      let response;
      
      if (endpoint.isReport) {
        // Use proper Amazon reporting API format
        const reportRequest = {
          reportDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
          metrics: "campaignId,impressions,clicks,cost,attributedSales14d,attributedUnitsOrdered14d",
          campaignType: "sponsoredProducts"
        };
        
        console.log('Report request payload:', JSON.stringify(reportRequest, null, 2));
        
        response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers,
          body: JSON.stringify(reportRequest)
        });
      } else {
        response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers
        });
      }

      console.log(`${endpoint.name} response status:`, response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(`${endpoint.name} returned ${Array.isArray(data) ? data.length : 'non-array'} records`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('Sample API response:', JSON.stringify(data[0], null, 2));
          
          // Filter and transform data for our campaigns
          const relevantData = data.filter(item => {
            const itemCampaignId = item.campaignId?.toString() || item.campaign_id?.toString() || item.id?.toString();
            return itemCampaignId && campaignIds.includes(itemCampaignId);
          });
          
          console.log(`Found ${relevantData.length} matching campaigns in API response`);
          
          if (relevantData.length > 0) {
            const transformedMetrics = relevantData.map(item => {
              // Handle different API response formats
              const campaignId = item.campaignId || item.campaign_id || item.id;
              const impressions = item.impressions || 0;
              const clicks = item.clicks || 0;
              const spend = item.cost || item.spend || 0;
              const sales = item.attributedSales14d || item.sales14d || item.sales || 0;
              const orders = item.attributedUnitsOrdered14d || item.purchases14d || item.orders || 0;
              
              const metrics = {
                campaignId: campaignId?.toString(),
                impressions,
                clicks,
                spend,
                sales,
                orders,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cpc: clicks > 0 ? spend / clicks : 0,
                acos: sales > 0 ? (spend / sales) * 100 : 0,
                roas: spend > 0 ? sales / spend : 0,
                fromAPI: true // CRITICAL: Mark as real API data
              };
              
              console.log(`REAL API METRICS for campaign ${campaignId}:`, {
                sales: metrics.sales,
                spend: metrics.spend,
                orders: metrics.orders,
                source: endpoint.name
              });
              
              return metrics;
            });

            console.log(`SUCCESS: Returning ${transformedMetrics.length} real API metrics from ${endpoint.name}`);
            return transformedMetrics;
          }
        } else {
          console.log(`${endpoint.name} returned empty or invalid data structure`);
        }
      } else {
        const errorText = await response.text();
        console.log(`${endpoint.name} failed with status ${response.status}:`, errorText);
        
        // Analyze specific error types
        if (errorText.includes('UNAUTHORIZED')) {
          console.log('CRITICAL: Authorization failed - token may be expired or profile lacks permissions');
        } else if (errorText.includes('NOT_FOUND')) {
          console.log('Endpoint not available - trying next option');
        } else if (errorText.includes('THROTTLED') || errorText.includes('RATE_LIMIT')) {
          console.log('WARNING: Rate limited by Amazon API - may need to implement retry logic');
        }
      }
    } catch (error) {
      console.error(`Network error with ${endpoint.name}:`, error.message);
    }
  }

  console.log('=== ALL REAL API ENDPOINTS FAILED ===');
  console.log('FALLING BACK TO SIMULATED DATA - This means no real metrics will be available');
  
  // Fallback to simulated data, but mark it clearly
  return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
}
