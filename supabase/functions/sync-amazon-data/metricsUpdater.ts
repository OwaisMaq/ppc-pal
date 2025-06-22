
export async function updateCampaignMetrics(
  supabase: any,
  connectionId: string,
  metricsData: any[]
): Promise<void> {
  console.log('Updating campaign metrics in database...');
  
  for (const metrics of metricsData) {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          spend: metrics.spend || 0,
          sales: metrics.sales || 0,
          orders: metrics.orders || 0,
          acos: metrics.acos,
          roas: metrics.roas,
          last_updated: new Date().toISOString()
        })
        .eq('connection_id', connectionId)
        .eq('amazon_campaign_id', metrics.campaignId.toString());

      if (error) {
        console.error('Error updating campaign metrics:', error);
      }
    } catch (error) {
      console.error('Error processing metrics for campaign:', metrics.campaignId, error);
    }
  }
  
  console.log('Campaign metrics update completed');
}
