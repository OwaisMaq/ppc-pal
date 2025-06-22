
import { fetchBasicMetrics } from './metrics.ts';

export async function fetchCampaignReports(
  accessToken: string,
  clientId: string,
  profileId: string,
  baseUrl: string,
  campaignIds: string[]
): Promise<any[]> {
  console.log('Fetching campaign performance reports...');
  
  if (campaignIds.length === 0) {
    console.log('No campaigns to fetch reports for');
    return [];
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Content-Type': 'application/json',
  };

  // Try multiple endpoints to get real campaign metrics
  const endpoints = [
    {
      name: 'v3 campaigns with metrics',
      url: `${baseUrl}/v3/sp/campaigns`,
      method: 'GET'
    },
    {
      name: 'v2 campaigns extended',
      url: `${baseUrl}/v2/sp/campaigns/extended`,
      method: 'GET'
    },
    {
      name: 'v2 campaigns with campaign IDs filter',
      url: `${baseUrl}/v2/sp/campaigns?campaignIdFilter=${campaignIds.join(',')}`,
      method: 'GET'
    }
  ];

  // Try each endpoint
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying ${endpoint.name}: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`${endpoint.name} returned ${data.length} records`);
        
        if (Array.isArray(data) && data.length > 0) {
          // Filter for our specific campaigns and transform the data
          const filteredData = data.filter(campaign => 
            campaignIds.includes(campaign.campaignId?.toString())
          );
          
          if (filteredData.length > 0) {
            console.log(`Found ${filteredData.length} matching campaigns with real API data`);
            
            const realMetrics = filteredData.map(campaign => {
              const metrics = {
                campaignId: campaign.campaignId,
                impressions: campaign.impressions || 0,
                clicks: campaign.clicks || 0,
                spend: campaign.cost || campaign.spend || 0,
                sales: campaign.sales14d || campaign.attributedSales14d || campaign.sales || 0,
                orders: campaign.purchases14d || campaign.attributedUnitsOrdered14d || campaign.orders || 0,
                ctr: campaign.clickThroughRate || (campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0),
                cpc: campaign.costPerClick || (campaign.clicks > 0 ? (campaign.cost || campaign.spend || 0) / campaign.clicks : 0),
                acos: 0,
                roas: 0,
                fromAPI: true // Mark as real API data
              };
              
              // Calculate ACOS and ROAS
              if (metrics.spend > 0 && metrics.sales > 0) {
                metrics.acos = (metrics.spend / metrics.sales) * 100;
                metrics.roas = metrics.sales / metrics.spend;
              }
              
              console.log(`Real API metrics for campaign ${campaign.campaignId}:`, {
                sales: metrics.sales,
                spend: metrics.spend,
                orders: metrics.orders,
                source: endpoint.name
              });
              
              return metrics;
            });

            return realMetrics;
          }
        }
      } else {
        const errorText = await response.text();
        console.log(`${endpoint.name} failed:`, response.status, errorText);
      }
    } catch (error) {
      console.error(`Error with ${endpoint.name}:`, error.message);
    }
  }

  // Try the reporting endpoint as a last resort
  try {
    console.log('Trying campaigns report endpoint...');
    const reportRequest = {
      reportDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      metrics: "impressions,clicks,cost,attributedSales14d,attributedUnitsOrdered14d,campaignId"
    };

    const reportResponse = await fetch(`${baseUrl}/v2/sp/campaigns/report`, {
      method: 'POST',
      headers,
      body: JSON.stringify(reportRequest)
    });

    if (reportResponse.ok) {
      const reportData = await reportResponse.json();
      console.log('Report endpoint response:', reportData);
      
      if (Array.isArray(reportData) && reportData.length > 0) {
        const realMetrics = reportData
          .filter(row => campaignIds.includes(row.campaignId?.toString()))
          .map(row => ({
            campaignId: row.campaignId,
            impressions: row.impressions || 0,
            clicks: row.clicks || 0,
            spend: row.cost || 0,
            sales: row.attributedSales14d || 0,
            orders: row.attributedUnitsOrdered14d || 0,
            ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
            cpc: row.clicks > 0 ? row.cost / row.clicks : 0,
            acos: row.cost && row.attributedSales14d ? (row.cost / row.attributedSales14d) * 100 : 0,
            roas: row.cost && row.attributedSales14d ? row.attributedSales14d / row.cost : 0,
            fromAPI: true // Mark as real API data
          }));

        if (realMetrics.length > 0) {
          console.log(`Successfully processed ${realMetrics.length} real API metrics from report endpoint`);
          return realMetrics;
        }
      }
    }
  } catch (error) {
    console.error('Error with report endpoint:', error.message);
  }

  console.log('All real API endpoints failed, falling back to simulated data');
  return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
}
