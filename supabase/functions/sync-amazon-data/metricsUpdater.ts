
export async function updateCampaignMetrics(
  supabase: any,
  connectionId: string,
  metricsData: any[]
): Promise<void> {
  console.log('Updating campaign metrics in database...');
  console.log(`Processing ${metricsData.length} metrics records`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const metrics of metricsData) {
    try {
      // Map API field names to database field names
      const dbMetrics = {
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        spend: metrics.spend || metrics.cost || 0, // API might use 'cost' instead of 'spend'
        sales: metrics.sales || metrics.sales14d || 0, // API might use 'sales14d'
        orders: metrics.orders || metrics.orders14d || 0, // API might use 'orders14d'
        acos: metrics.acos || metrics.acos14d || null,
        roas: metrics.roas || metrics.roas14d || null,
        last_updated: new Date().toISOString()
      };

      console.log(`Updating campaign ${metrics.campaignId} with metrics:`, dbMetrics);

      const { data, error } = await supabase
        .from('campaigns')
        .update(dbMetrics)
        .eq('connection_id', connectionId)
        .eq('amazon_campaign_id', metrics.campaignId.toString())
        .select();

      if (error) {
        console.error(`Error updating campaign ${metrics.campaignId}:`, error);
        errorCount++;
      } else if (data && data.length > 0) {
        console.log(`Successfully updated metrics for campaign ${metrics.campaignId}: sales=${dbMetrics.sales}, spend=${dbMetrics.spend}, orders=${dbMetrics.orders}`);
        successCount++;
      } else {
        console.warn(`No campaign found with amazon_campaign_id ${metrics.campaignId} for connection ${connectionId}`);
        errorCount++;
      }
    } catch (error) {
      console.error('Error processing metrics for campaign:', metrics.campaignId, error);
      errorCount++;
    }
  }
  
  console.log(`Campaign metrics update completed: ${successCount} successful, ${errorCount} errors`);
  
  if (successCount === 0 && errorCount > 0) {
    throw new Error(`Failed to update any campaign metrics. Check campaign IDs and connection mapping.`);
  }
}
