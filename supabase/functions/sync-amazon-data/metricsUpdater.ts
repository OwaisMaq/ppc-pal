
export async function updateCampaignMetrics(
  supabase: any,
  connectionId: string,
  metricsData: any[]
): Promise<void> {
  console.log('=== FIXED CAMPAIGN METRICS UPDATE WITH PROPER ID MAPPING ===');
  console.log(`Processing ${metricsData.length} metrics records for connection ${connectionId}`);
  
  let successCount = 0;
  let errorCount = 0;
  let realDataCount = 0;
  let simulatedDataCount = 0;

  for (const metric of metricsData) {
    try {
      const isRealData = metric.fromAPI === true;
      
      if (isRealData) {
        realDataCount++;
        console.log(`Processing REAL API metric for Amazon campaign ${metric.campaignId}`);
      } else {
        simulatedDataCount++;
        console.log(`Processing SIMULATED metric for campaign UUID ${metric.campaignId}`);
      }

      let campaignRecord = null;

      if (isRealData) {
        // For real API data, the campaignId is the Amazon campaign ID
        // We need to find our campaign by amazon_campaign_id
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, name, amazon_campaign_id')
          .eq('connection_id', connectionId)
          .eq('amazon_campaign_id', metric.campaignId.toString())
          .single();

        if (campaignError || !campaign) {
          console.error(`Campaign not found for Amazon ID ${metric.campaignId}:`, campaignError);
          errorCount++;
          continue;
        }
        
        campaignRecord = campaign;
        console.log(`✓ Found campaign: ${campaign.name} (UUID: ${campaign.id}) for Amazon ID: ${campaign.amazon_campaign_id}`);
      } else {
        // For simulated data, the campaignId is already our UUID
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, name, amazon_campaign_id')
          .eq('connection_id', connectionId)
          .eq('id', metric.campaignId)
          .single();

        if (campaignError || !campaign) {
          console.error(`Campaign not found for UUID ${metric.campaignId}:`, campaignError);
          errorCount++;
          continue;
        }
        
        campaignRecord = campaign;
        console.log(`✓ Found campaign: ${campaign.name} (UUID: ${campaign.id}) for simulated data`);
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
        .eq('id', campaignRecord.id);

      if (updateError) {
        console.error(`Error updating campaign ${campaignRecord.name}:`, updateError);
        errorCount++;
        continue;
      }

      // CRITICAL: Store historical metrics with proper data source marking
      const historicalData = {
        campaign_id: campaignRecord.id,
        date: new Date().toISOString().split('T')[0], // Today's date
        impressions: metric.impressions || 0,
        clicks: metric.clicks || 0,
        spend: Number((metric.spend || 0).toFixed(2)),
        sales: Number((metric.sales || 0).toFixed(2)),
        orders: metric.orders || 0,
        acos: metric.acos || 0,
        roas: metric.roas || 0,
        data_source: isRealData ? 'api' : 'simulated', // CRITICAL: Mark historical data source
        created_at: new Date().toISOString()
      };

      const { error: historyError } = await supabase
        .from('campaign_metrics_history')
        .upsert(historicalData, {
          onConflict: 'campaign_id, date'
        });

      if (historyError) {
        console.error(`Error storing historical metrics for campaign ${campaignRecord.name}:`, historyError);
      } else {
        console.log(`✓ Updated ${isRealData ? 'REAL' : 'SIMULATED'} metrics for campaign ${campaignRecord.name}`);
        console.log(`   Sales: $${updateData.sales}, Spend: $${updateData.spend}, Orders: ${updateData.orders}`);
      }

      successCount++;
    } catch (error) {
      console.error(`Error processing metric:`, error);
      errorCount++;
    }
  }

  console.log('=== METRICS UPDATE SUMMARY ===');
  console.log(`✓ Successfully processed: ${successCount} campaigns`);
  console.log(`✗ Errors encountered: ${errorCount} campaigns`);
  console.log(`📊 Real API data: ${realDataCount} campaigns`);
  console.log(`🎭 Simulated data: ${simulatedDataCount} campaigns`);
  
  if (realDataCount > 0) {
    console.log(`🎉 SUCCESS: ${realDataCount} campaigns now have REAL Amazon API data!`);
  } else if (simulatedDataCount > 0) {
    console.log(`⚠️ NOTICE: Using ${simulatedDataCount} simulated metrics for development.`);
  } else {
    console.log(`❌ WARNING: No metrics were processed successfully.`);
  }
}
