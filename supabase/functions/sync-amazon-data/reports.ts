
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
    // Request a report for campaigns
    const reportRequest = {
      reportDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
      metrics: [
        'campaignId',
        'impressions', 
        'clicks',
        'spend',
        'sales',
        'orders',
        'ctr',
        'cpc',
        'acos',
        'roas'
      ],
      campaignType: 'sponsoredProducts',
      filters: {
        campaignId: campaignIds
      }
    };

    console.log('Requesting campaign report with payload:', JSON.stringify(reportRequest));

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
      console.warn('Report request failed:', errorText);
      
      // Try alternative metrics endpoint for basic data
      return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
    }

    const reportData = await reportResponse.json();
    console.log('Report data received:', reportData);
    
    return reportData;
  } catch (error) {
    console.error('Error fetching campaign reports:', error);
    return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
  }
}
