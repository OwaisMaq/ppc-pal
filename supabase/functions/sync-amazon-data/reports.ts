
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

  try {
    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Updated report request with VALID Amazon API columns
    const reportRequest = {
      configuration: {
        adProduct: "SPONSORED_PRODUCTS",
        groupBy: ["campaign"],
        columns: [
          "campaignId",
          "impressions", 
          "clicks",
          "cost",
          "sales14d",
          "purchases14d", // Using purchases14d instead of orders14d
          "clickThroughRate",
          "costPerClick"
        ],
        reportTypeId: "spCampaigns",
        timeUnit: "SUMMARY",
        format: "JSON"
      },
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      filters: [
        {
          field: "campaignId",
          values: campaignIds.slice(0, 100) // Limit to avoid payload size issues
        }
      ]
    };

    console.log('Requesting campaign report with corrected columns:', JSON.stringify(reportRequest, null, 2));

    const reportResponse = await fetch(`${baseUrl}/reporting/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportRequest)
    });

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      console.warn('Report request failed:', reportResponse.status, errorText);
      
      // Try alternative sync reports endpoint
      return await tryAlternativeReportsEndpoint(accessToken, clientId, profileId, baseUrl, campaignIds);
    }

    const reportData = await reportResponse.json();
    console.log('Report response received:', reportData);
    
    // Check if it's an async report (returns reportId)
    if (reportData.reportId) {
      console.log('Async report created with ID:', reportData.reportId);
      // For now, fall back to basic metrics since we need to poll for async results
      return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
    }
    
    // Transform the API response to our expected format
    if (Array.isArray(reportData)) {
      return reportData.map(row => ({
        campaignId: row.campaignId,
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        spend: row.cost || 0,
        sales: row.sales14d || 0,
        orders: row.purchases14d || 0,
        ctr: row.clickThroughRate || 0,
        cpc: row.costPerClick || 0,
        acos: row.cost && row.sales14d ? (row.cost / row.sales14d) * 100 : 0,
        roas: row.cost && row.sales14d ? row.sales14d / row.cost : 0
      }));
    }
    
    return reportData;
  } catch (error) {
    console.error('Error fetching campaign reports:', error);
    return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
  }
}

async function tryAlternativeReportsEndpoint(
  accessToken: string,
  clientId: string,
  profileId: string,
  baseUrl: string,
  campaignIds: string[]
): Promise<any[]> {
  console.log('Trying alternative sync reports endpoint...');
  
  try {
    // Try the sync reports endpoint with simpler structure
    const syncReportRequest = {
      reportDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      metrics: ["impressions", "clicks", "cost", "sales14d", "purchases14d"],
      campaignType: "sponsoredProducts"
    };

    const syncResponse = await fetch(`${baseUrl}/v2/sp/campaigns/report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(syncReportRequest)
    });

    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      console.log('Sync report data received:', syncData);
      return syncData;
    }
  } catch (error) {
    console.warn('Alternative endpoint also failed:', error);
  }
  
  // Final fallback to basic metrics but mark as simulated
  console.log('Falling back to simulated metrics due to API failures');
  return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
}
