
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
    // Try the v3 campaigns endpoint first for current metrics
    console.log('Trying v3 campaigns endpoint for current metrics...');
    const campaignsResponse = await fetch(`${baseUrl}/v3/sp/campaigns`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
      }
    });

    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      console.log('Successfully retrieved campaign data from v3 endpoint:', campaignsData.length);
      
      // Transform to our expected format and mark as real API data
      const realMetrics = campaignsData
        .filter(campaign => campaignIds.includes(campaign.campaignId.toString()))
        .map(campaign => ({
          campaignId: campaign.campaignId,
          impressions: campaign.impressions || 0,
          clicks: campaign.clicks || 0,
          spend: campaign.cost || 0,
          sales: campaign.sales14d || campaign.attributedSales14d || 0,
          orders: campaign.purchases14d || campaign.attributedUnitsOrdered14d || 0,
          ctr: campaign.clickThroughRate || 0,
          cpc: campaign.costPerClick || 0,
          acos: campaign.cost && campaign.sales14d ? (campaign.cost / campaign.sales14d) * 100 : 0,
          roas: campaign.cost && campaign.sales14d ? campaign.sales14d / campaign.cost : 0,
          fromAPI: true // Mark as real API data
        }));

      if (realMetrics.length > 0) {
        console.log(`Successfully processed ${realMetrics.length} real API metrics`);
        return realMetrics;
      }
    }

    // Try alternative v2 campaigns endpoint with extended data
    console.log('Trying v2 campaigns extended endpoint...');
    const v2Response = await fetch(`${baseUrl}/v2/sp/campaigns/extended`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
      }
    });

    if (v2Response.ok) {
      const v2Data = await v2Response.json();
      console.log('Successfully retrieved extended campaign data:', v2Data.length);
      
      // Transform to our expected format and mark as real API data
      const realMetrics = v2Data
        .filter(campaign => campaignIds.includes(campaign.campaignId.toString()))
        .map(campaign => ({
          campaignId: campaign.campaignId,
          impressions: campaign.impressions || 0,
          clicks: campaign.clicks || 0,
          spend: campaign.cost || 0,
          sales: campaign.attributedSales14d || 0,
          orders: campaign.attributedUnitsOrdered14d || 0,
          ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
          cpc: campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0,
          acos: campaign.cost && campaign.attributedSales14d ? (campaign.cost / campaign.attributedSales14d) * 100 : 0,
          roas: campaign.cost && campaign.attributedSales14d ? campaign.attributedSales14d / campaign.cost : 0,
          fromAPI: true // Mark as real API data
        }));

      if (realMetrics.length > 0) {
        console.log(`Successfully processed ${realMetrics.length} real API metrics from v2 extended`);
        return realMetrics;
      }
    }

    // Try the performance reports with a simplified request
    console.log('Trying simplified performance reports...');
    const simpleReportRequest = {
      reportDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      metrics: "impressions,clicks,cost,attributedSales14d,attributedUnitsOrdered14d"
    };

    const simpleReportResponse = await fetch(`${baseUrl}/v2/sp/campaigns/report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simpleReportRequest)
    });

    if (simpleReportResponse.ok) {
      const reportData = await simpleReportResponse.json();
      console.log('Simple report data received:', reportData);
      
      if (Array.isArray(reportData)) {
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
          console.log(`Successfully processed ${realMetrics.length} real API metrics from simple report`);
          return realMetrics;
        }
      }
    }

    console.log('All API endpoints failed, falling back to simulated data');
    return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);

  } catch (error) {
    console.error('Error fetching campaign reports:', error);
    console.log('Exception occurred, falling back to simulated data');
    return await fetchBasicMetrics(accessToken, clientId, profileId, baseUrl, campaignIds);
  }
}
