
export async function updateCampaignMetrics(metricsData: any[], supabaseClient: any) {
  console.log('=== UPDATING CAMPAIGN METRICS IN DATABASE ===');
  console.log(`📊 Processing ${metricsData.length} metric records`);
  
  const realApiMetrics = metricsData.filter(m => m.fromAPI === true);
  const placeholderMetrics = metricsData.filter(m => m.fromAPI !== true);
  
  console.log(`✅ Real API metrics: ${realApiMetrics.length}`);
  console.log(`🎭 Placeholder metrics: ${placeholderMetrics.length}`);
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const metrics of metricsData) {
    try {
      // Find the campaign by amazon_campaign_id since that's what we get from the API
      const { data: campaigns, error: findError } = await supabaseClient
        .from('campaigns')
        .select('id, amazon_campaign_id, name')
        .eq('amazon_campaign_id', metrics.campaignId);
      
      if (findError) {
        console.error(`❌ Error finding campaign ${metrics.campaignId}:`, findError);
        errorCount++;
        continue;
      }
      
      if (!campaigns || campaigns.length === 0) {
        console.warn(`⚠️ Campaign not found in database: ${metrics.campaignId}`);
        continue;
      }
      
      const campaign = campaigns[0];
      console.log(`🔄 Updating metrics for campaign: ${campaign.name} (${campaign.amazon_campaign_id})`);
      
      // Update campaign with metrics from Amazon API
      const { error: updateError } = await supabaseClient
        .from('campaigns')
        .update({
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          spend: metrics.cost || 0, // Amazon uses 'cost', we store as 'spend'
          sales: metrics.sales || 0,
          orders: metrics.orders || 0,
          acos: metrics.acos || null,
          roas: metrics.roas || null,
          last_updated: new Date().toISOString(),
          data_source: metrics.fromAPI ? 'api' : 'placeholder'
        })
        .eq('id', campaign.id);
      
      if (updateError) {
        console.error(`❌ Error updating campaign ${campaign.id}:`, updateError);
        errorCount++;
        continue;
      }
      
      // Also store in metrics history for trend analysis
      const { error: historyError } = await supabaseClient
        .from('campaign_metrics_history')
        .insert({
          campaign_id: campaign.id,
          date: new Date().toISOString().split('T')[0],
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          spend: metrics.cost || 0,
          sales: metrics.sales || 0,
          orders: metrics.orders || 0,
          acos: metrics.acos || null,
          roas: metrics.roas || null,
          data_source: metrics.fromAPI ? 'api' : 'placeholder'
        });
      
      if (historyError && !historyError.message?.includes('duplicate key')) {
        console.warn(`⚠️ Could not store metrics history for campaign ${campaign.id}:`, historyError);
      }
      
      updatedCount++;
      
      console.log(`✅ Updated campaign ${campaign.name}:`, {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        spend: `$${(metrics.cost || 0).toFixed(2)}`,
        sales: `$${(metrics.sales || 0).toFixed(2)}`,
        orders: metrics.orders,
        acos: metrics.acos ? `${metrics.acos}%` : 'N/A',
        roas: metrics.roas ? `${metrics.roas}x` : 'N/A',
        dataSource: metrics.fromAPI ? 'Amazon API' : 'Placeholder'
      });
      
    } catch (error) {
      console.error(`💥 Unexpected error processing metrics for campaign ${metrics.campaignId}:`, error);
      errorCount++;
    }
  }
  
  const summary = {
    totalProcessed: metricsData.length,
    successfulUpdates: updatedCount,
    errors: errorCount,
    realApiUpdates: realApiMetrics.length,
    placeholderUpdates: placeholderMetrics.length
  };
  
  console.log('📊 METRICS UPDATE SUMMARY:', summary);
  
  return summary;
}
