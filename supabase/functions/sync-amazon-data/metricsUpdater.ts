
export async function updateCampaignMetrics(
  supabase: any,
  connectionId: string,
  metricsData: any[]
): Promise<void> {
  console.log('=== UPDATING CAMPAIGN METRICS WITH REAL DATA MARKING ===');
  console.log(`Processing ${metricsData.length} metrics records`);
  
  let successCount = 0;
  let errorCount = 0;
  let realDataCount = 0;
  let simulatedDataCount = 0;

  for (const metric of metricsData) {
    try {
      const isRealData = metric.fromAPI === true;
      
      if (isRealData) {
        realDataCount++;
        console.log(`Processing REAL API metric for campaign ${metric.campaignId}`);
      } else {
        simulatedDataCount++;
        console.log(`Processing SIMULATED metric for campaign ${metric.campaignId}`);
      }

      // Get the internal campaign ID from our database
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('amazon_campaign_id', metric.campaignId.toString())
        .single();

      if (campaignError || !campaign) {
        console.error(`Campaign not found for Amazon ID ${metric.campaignId}:`, campaignError);
        errorCount++;
        continue;
      }

      // Update campaign with performance metrics and CRITICAL data source marking
      const updateData = {
        impressions: metric.impressions || 0,
        clicks: metric.clicks || 0,
        spend: Number((metric.spend || 0).toFixed(2)),
        sales: Number((metric.sales || 0).toFixed(2)),
        orders: metric.orders || 0,
        acos: metric.acos || 0,
        roas: metric.roas || 0,
        data_source: isRealData ? 'api' : 'simulated', // CRITICAL: Mark data source correctly
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaign.id);

      if (updateError) {
        console.error(`Error updating campaign ${metric.campaignId}:`, updateError);
        errorCount++;
        continue;
      }

      // CRITICAL: Store historical metrics with proper data source marking
      const historicalData = {
        campaign_id: campaign.id,
        date: new Date().toISOString().split('T')[0], // Today's date
        impressions: metric.impressions || 0,
        clicks: metric.clicks || 0,
        spend: Number((metric.spend || 0).toFixed(2)),
        sales: Number((metric.sales || 0).toFixed(2)),
        orders: metric.orders || 0,
        acos: metric.acos || 0,
        roas: metric.roas || 0,
        ctr: metric.ctr || 0,
        cpc: metric.cpc || 0,
        conversion_rate: metric.conversionRate || 0,
        data_source: isRealData ? 'api' : 'simulated', // CRITICAL: Mark historical data source
        created_at: new Date().toISOString()
      };

      const { error: historyError } = await supabase
        .from('campaign_metrics_history')
        .upsert(historicalData, {
          onConflict: 'campaign_id, date'
        });

      if (historyError) {
        console.error(`Error storing historical metrics for campaign ${metric.campaignId}:`, historyError);
      } else {
        console.log(`✓ Stored ${isRealData ? 'REAL' : 'SIMULATED'} metrics for campaign ${metric.campaignId}`);
      }

      successCount++;
    } catch (error) {
      console.error(`Error processing metric for campaign ${metric.campaignId}:`, error);
      errorCount++;
    }
  }

  console.log('=== METRICS UPDATE SUMMARY ===');
  console.log(`✓ Successfully processed: ${successCount} campaigns`);
  console.log(`✗ Errors encountered: ${errorCount} campaigns`);
  console.log(`📊 Real API data: ${realDataCount} campaigns`);
  console.log(`🎭 Simulated data: ${simulatedDataCount} campaigns`);
  
  if (realDataCount > 0) {
    console.log(`SUCCESS: ${realDataCount} campaigns now have REAL Amazon API data!`);
  } else {
    console.log(`WARNING: No real API data was obtained. All metrics are simulated.`);
  }
}
