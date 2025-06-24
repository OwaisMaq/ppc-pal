
export async function updateCampaignMetrics(
  supabase: any,
  connectionId: string,
  metricsData: any[]
): Promise<void> {
  console.log('=== ENHANCED CAMPAIGN METRICS UPDATE WITH DETAILED LOGGING ===');
  console.log(`🔄 Processing ${metricsData.length} metrics records for connection ${connectionId}`);
  console.log(`⏰ Update started at: ${new Date().toISOString()}`);
  
  let successCount = 0;
  let errorCount = 0;
  let realDataCount = 0;
  let simulatedDataCount = 0;
  const processingLog: string[] = [];

  // Pre-flight check: Verify database connectivity
  try {
    const { count, error: countError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connectionId);

    if (countError) {
      console.error('❌ CRITICAL: Cannot access campaigns table:', countError);
      throw new Error(`Database access error: ${countError.message}`);
    }

    console.log(`✅ Database connectivity verified. Found ${count} existing campaigns for connection.`);
  } catch (error) {
    console.error('💥 Database connectivity test failed:', error);
    throw error;
  }

  for (const [index, metric] of metricsData.entries()) {
    try {
      console.log(`\n📊 Processing metric ${index + 1}/${metricsData.length}`);
      const isRealData = metric.fromAPI === true;
      
      if (isRealData) {
        realDataCount++;
        console.log(`🎯 Processing REAL API metric for Amazon campaign ${metric.campaignId}`);
        console.log(`🔍 Source endpoint: ${metric.sourceEndpoint || 'Unknown'}`);
      } else {
        simulatedDataCount++;
        console.log(`🎭 Processing SIMULATED metric for campaign UUID ${metric.campaignId}`);
        console.log(`🔍 Performance profile: ${metric.performanceProfile || 'Standard'}`);
      }

      console.log(`📈 Metric values:`, {
        sales: metric.sales,
        spend: metric.spend,
        orders: metric.orders,
        clicks: metric.clicks,
        impressions: metric.impressions,
        acos: metric.acos,
        roas: metric.roas
      });

      let campaignRecord = null;

      if (isRealData) {
        // For real API data, the campaignId is the Amazon campaign ID
        console.log(`🔍 Looking up campaign by Amazon campaign ID: ${metric.campaignId}`);
        
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, name, amazon_campaign_id')
          .eq('connection_id', connectionId)
          .eq('amazon_campaign_id', metric.campaignId.toString())
          .single();

        if (campaignError || !campaign) {
          console.error(`❌ Campaign not found for Amazon ID ${metric.campaignId}:`, campaignError);
          processingLog.push(`❌ Campaign lookup failed for Amazon ID ${metric.campaignId}: ${campaignError?.message || 'Not found'}`);
          errorCount++;
          continue;
        }
        
        campaignRecord = campaign;
        console.log(`✅ Found campaign: ${campaign.name} (UUID: ${campaign.id}) for Amazon ID: ${campaign.amazon_campaign_id}`);
      } else {
        // For simulated data, the campaignId is already our UUID
        console.log(`🔍 Looking up campaign by UUID: ${metric.campaignId}`);
        
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, name, amazon_campaign_id')
          .eq('connection_id', connectionId)
          .eq('id', metric.campaignId)
          .single();

        if (campaignError || !campaign) {
          console.error(`❌ Campaign not found for UUID ${metric.campaignId}:`, campaignError);
          processingLog.push(`❌ Campaign lookup failed for UUID ${metric.campaignId}: ${campaignError?.message || 'Not found'}`);
          errorCount++;
          continue;
        }
        
        campaignRecord = campaign;
        console.log(`✅ Found campaign: ${campaign.name} (UUID: ${campaign.id}) for simulated data`);
      }

      // Prepare update data with enhanced validation
      const updateData = {
        impressions: Math.max(0, metric.impressions || 0),
        clicks: Math.max(0, metric.clicks || 0),
        spend: Math.max(0, Number((metric.spend || 0).toFixed(2))),
        sales: Math.max(0, Number((metric.sales || 0).toFixed(2))),
        orders: Math.max(0, metric.orders || 0),
        acos: Math.max(0, metric.acos || 0),
        roas: Math.max(0, metric.roas || 0),
        data_source: isRealData ? 'api' : 'simulated', // CRITICAL: Mark data source correctly
        last_updated: new Date().toISOString()
      };

      console.log(`📝 Prepared update data:`, updateData);

      // Update campaign with performance metrics
      const { error: updateError } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignRecord.id);

      if (updateError) {
        console.error(`❌ Database error updating campaign ${campaignRecord.name}:`, updateError);
        processingLog.push(`❌ Update failed for ${campaignRecord.name}: ${updateError.message}`);
        errorCount++;
        continue;
      }

      console.log(`✅ Successfully updated campaign metrics in database`);

      // Store historical metrics with proper data source marking
      const historicalData = {
        campaign_id: campaignRecord.id,
        date: new Date().toISOString().split('T')[0], // Today's date
        impressions: updateData.impressions,
        clicks: updateData.clicks,
        spend: updateData.spend,
        sales: updateData.sales,
        orders: updateData.orders,
        acos: updateData.acos,
        roas: updateData.roas,
        data_source: updateData.data_source, // CRITICAL: Mark historical data source
        created_at: new Date().toISOString()
      };

      console.log(`💾 Storing historical metrics:`, {
        campaign_id: historicalData.campaign_id,
        date: historicalData.date,
        data_source: historicalData.data_source
      });

      const { error: historyError } = await supabase
        .from('campaign_metrics_history')
        .upsert(historicalData, {
          onConflict: 'campaign_id, date'
        });

      if (historyError) {
        console.error(`⚠️ Error storing historical metrics for campaign ${campaignRecord.name}:`, historyError);
        processingLog.push(`⚠️ History storage failed for ${campaignRecord.name}: ${historyError.message}`);
      } else {
        console.log(`💾 Successfully stored historical metrics`);
      }

      const logEntry = `✅ Updated ${isRealData ? 'REAL' : 'SIMULATED'} metrics for campaign ${campaignRecord.name}: Sales $${updateData.sales}, Spend $${updateData.spend}, Orders ${updateData.orders}`;
      console.log(logEntry);
      processingLog.push(logEntry);

      successCount++;
    } catch (error) {
      console.error(`💥 Exception processing metric ${index + 1}:`, {
        error: error.message,
        metric: {
          campaignId: metric.campaignId,
          fromAPI: metric.fromAPI,
          sales: metric.sales,
          spend: metric.spend
        }
      });
      processingLog.push(`💥 Exception for metric ${index + 1}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n=== METRICS UPDATE SUMMARY ===');
  console.log(`⏰ Update completed at: ${new Date().toISOString()}`);
  console.log(`✅ Successfully processed: ${successCount} campaigns`);
  console.log(`❌ Errors encountered: ${errorCount} campaigns`);
  console.log(`📊 Real API data: ${realDataCount} campaigns`);
  console.log(`🎭 Simulated data: ${simulatedDataCount} campaigns`);
  console.log(`📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
  
  if (realDataCount > 0) {
    console.log(`🎉 SUCCESS: ${realDataCount} campaigns now have REAL Amazon API data!`);
    console.log(`🎯 This means the Amazon API is working and returning performance metrics`);
  } else if (simulatedDataCount > 0) {
    console.log(`⚠️ NOTICE: Using ${simulatedDataCount} simulated metrics for development.`);
    console.log(`🔍 To get real data, ensure campaigns have recent activity and proper API permissions`);
  } else {
    console.log(`❌ WARNING: No metrics were processed successfully.`);
    console.log(`🚨 This indicates a serious issue with the metrics processing pipeline`);
  }

  // Log processing summary for debugging
  if (processingLog.length > 0) {
    console.log('\n📋 DETAILED PROCESSING LOG:');
    processingLog.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry}`);
    });
  }

  if (errorCount > 0 && successCount === 0) {
    console.error('🚨 CRITICAL: No metrics were successfully processed!');
    throw new Error(`Metrics update failed completely. Processed ${metricsData.length} records with ${errorCount} errors.`);
  }
}
