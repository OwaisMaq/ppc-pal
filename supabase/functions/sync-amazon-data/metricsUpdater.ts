
export async function updateCampaignMetrics(
  supabase: any,
  connectionId: string,
  metricsData: any[]
): Promise<void> {
  console.log('=== COMPREHENSIVE CAMPAIGN METRICS UPDATE WITH ENHANCED TRACKING ===');
  console.log(`🔄 Processing ${metricsData.length} metrics for connection ${connectionId}`);
  
  let successCount = 0;
  let errorCount = 0;
  let realDataCount = 0;
  let simulatedDataCount = 0;
  let apiEndpointStats: Record<string, number> = {};
  const processingLog: string[] = [];
  const errorDetails: string[] = [];

  // Enhanced database connectivity verification
  try {
    const { count, error: countError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connectionId);

    if (countError) {
      console.error('❌ Cannot access campaigns table:', countError);
      throw new Error(`Database access error: ${countError.message}`);
    }

    console.log(`✅ Database verified. Found ${count} campaigns for connection.`);
  } catch (error) {
    console.error('💥 Database connectivity failed:', error);
    throw error;
  }

  // Process each metric with comprehensive error handling
  for (const [index, metric] of metricsData.entries()) {
    try {
      console.log(`\n📊 Processing metric ${index + 1}/${metricsData.length}`);
      const isRealData = metric.fromAPI === true;
      
      if (isRealData) {
        realDataCount++;
        const endpointName = metric.sourceEndpoint || 'Unknown API';
        apiEndpointStats[endpointName] = (apiEndpointStats[endpointName] || 0) + 1;
        console.log(`🎯 Processing REAL API data from ${endpointName} for Amazon campaign ${metric.campaignId}`);
      } else {
        simulatedDataCount++;
        console.log(`🎭 Processing SIMULATED data for campaign UUID ${metric.campaignId}`);
      }

      let campaignRecord = null;

      if (isRealData) {
        // For real API data, lookup by Amazon campaign ID
        console.log(`🔍 Looking up by Amazon campaign ID: ${metric.campaignId}`);
        
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, name, amazon_campaign_id, data_source')
          .eq('connection_id', connectionId)
          .eq('amazon_campaign_id', metric.campaignId.toString())
          .single();

        if (campaignError || !campaign) {
          console.error(`❌ Campaign not found for Amazon ID ${metric.campaignId}`);
          errorDetails.push(`Real API data for campaign ${metric.campaignId} could not be matched to database record`);
          errorCount++;
          continue;
        }
        
        campaignRecord = campaign;
        console.log(`✅ Found campaign: ${campaign.name} (UUID: ${campaign.id})`);
      } else {
        // For simulated data, lookup by UUID
        console.log(`🔍 Looking up by UUID: ${metric.campaignId}`);
        
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, name, amazon_campaign_id, data_source')
          .eq('connection_id', connectionId)
          .eq('id', metric.campaignId)
          .single();

        if (campaignError || !campaign) {
          console.error(`❌ Campaign not found for UUID ${metric.campaignId}`);
          errorDetails.push(`Simulated data for campaign ${metric.campaignId} could not be matched to database record`);
          errorCount++;
          continue;
        }
        
        campaignRecord = campaign;
        console.log(`✅ Found campaign: ${campaign.name}`);
      }

      // Prepare comprehensive update data with validation
      const updateData = {
        impressions: Math.max(0, metric.impressions || 0),
        clicks: Math.max(0, metric.clicks || 0),
        spend: Math.max(0, Number((metric.spend || 0).toFixed(2))),
        sales: Math.max(0, Number((metric.sales || 0).toFixed(2))),
        orders: Math.max(0, metric.orders || 0),
        acos: Math.max(0, Number((metric.acos || 0).toFixed(2))),
        roas: Math.max(0, Number((metric.roas || 0).toFixed(2))),
        data_source: isRealData ? 'api' : 'simulated',
        last_updated: new Date().toISOString(),
        // Enhanced metadata for tracking
        ...(isRealData && {
          metrics_last_calculated: new Date().toISOString()
        })
      };

      // Data validation checks
      const validationIssues = [];
      if (updateData.spend > 0 && updateData.sales === 0) {
        validationIssues.push('Has spend but no sales');
      }
      if (updateData.clicks > updateData.impressions && updateData.impressions > 0) {
        validationIssues.push('Clicks exceed impressions');
      }
      if (updateData.orders > updateData.clicks && updateData.clicks > 0) {
        validationIssues.push('Orders exceed clicks');
      }

      if (validationIssues.length > 0) {
        console.warn(`⚠️ Data validation issues for ${campaignRecord.name}:`, validationIssues);
      }

      console.log(`📝 Update data for ${campaignRecord.name}:`, {
        sales: updateData.sales,
        spend: updateData.spend,
        orders: updateData.orders,
        dataSource: updateData.data_source,
        validationIssues: validationIssues.length
      });

      // Update campaign metrics with enhanced error handling
      const { error: updateError } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignRecord.id);

      if (updateError) {
        console.error(`❌ Update failed for ${campaignRecord.name}:`, updateError);
        errorDetails.push(`Failed to update ${campaignRecord.name}: ${updateError.message}`);
        errorCount++;
        continue;
      }

      console.log(`✅ Successfully updated campaign metrics`);

      // Store comprehensive historical metrics
      const historicalData = {
        campaign_id: campaignRecord.id,
        date: new Date().toISOString().split('T')[0],
        impressions: updateData.impressions,
        clicks: updateData.clicks,
        spend: updateData.spend,
        sales: updateData.sales,
        orders: updateData.orders,
        acos: updateData.acos,
        roas: updateData.roas,
        data_source: updateData.data_source,
        created_at: new Date().toISOString()
      };

      const { error: historyError } = await supabase
        .from('campaign_metrics_history')
        .upsert(historicalData, { onConflict: 'campaign_id, date' });

      if (historyError) {
        console.error(`⚠️ History storage failed for ${campaignRecord.name}:`, historyError);
      } else {
        console.log(`💾 Historical metrics stored for ${campaignRecord.name}`);
      }

      const logEntry = `✅ Updated ${isRealData ? 'REAL' : 'SIMULATED'} metrics for ${campaignRecord.name}${isRealData ? ` (${metric.sourceEndpoint})` : ''}`;
      processingLog.push(logEntry);
      successCount++;

    } catch (error) {
      console.error(`💥 Exception processing metric ${index + 1}:`, error.message);
      errorDetails.push(`Exception processing metric ${index + 1}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n=== COMPREHENSIVE METRICS UPDATE SUMMARY ===');
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Real API data: ${realDataCount}`);
  console.log(`🎭 Simulated data: ${simulatedDataCount}`);
  console.log(`📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
  
  if (realDataCount > 0) {
    console.log(`🎉 SUCCESS: ${realDataCount} campaigns have REAL Amazon data!`);
    console.log(`📊 API endpoint breakdown:`, apiEndpointStats);
  } else {
    console.log(`⚠️ Using simulated data for development`);
  }

  if (errorCount > 0) {
    console.log(`⚠️ Error details:`, errorDetails);
  }

  // Enhanced error handling - only fail if all updates failed
  if (errorCount > 0 && successCount === 0) {
    const errorSummary = `All metrics updates failed. ${errorCount} errors encountered: ${errorDetails.slice(0, 3).join('; ')}${errorDetails.length > 3 ? '...' : ''}`;
    throw new Error(errorSummary);
  }
  
  if (errorCount > successCount) {
    console.warn(`⚠️ High error rate: ${errorCount} errors vs ${successCount} successes`);
  }
}
