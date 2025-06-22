
export async function updateCampaignMetrics(
  supabase: any,
  connectionId: string,
  metricsData: any[]
): Promise<void> {
  console.log('=== UPDATING CAMPAIGN METRICS ===');
  console.log(`Processing ${metricsData.length} metrics records`);
  
  let successCount = 0;
  let errorCount = 0;
  let realDataCount = 0;
  let simulatedDataCount = 0;
  
  for (const metrics of metricsData) {
    try {
      // CRITICAL: Determine if this is real API data
      const isRealData = metrics.fromAPI === true;
      const dataSource = isRealData ? 'api' : 'simulated';
      
      if (isRealData) {
        realDataCount++;
        console.log(`✓ Processing REAL Amazon API data for campaign ${metrics.campaignId}`);
      } else {
        simulatedDataCount++;
        console.log(`⚠ Processing SIMULATED data for campaign ${metrics.campaignId}`);
      }
      
      // Enhanced metrics mapping with validation
      const dbMetrics = {
        impressions: Math.max(0, metrics.impressions || 0),
        clicks: Math.max(0, metrics.clicks || 0),
        spend: Math.max(0, metrics.spend || metrics.cost || 0),
        sales: Math.max(0, metrics.sales || metrics.sales14d || metrics.attributedSales14d || 0),
        orders: Math.max(0, metrics.orders || metrics.purchases14d || metrics.attributedUnitsOrdered14d || 0),
        acos: metrics.acos || (metrics.spend && metrics.sales && metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : null),
        roas: metrics.roas || (metrics.spend && metrics.sales && metrics.spend > 0 ? metrics.sales / metrics.spend : null),
        data_source: dataSource, // CRITICAL: Properly mark data source
        last_updated: new Date().toISOString()
      };

      console.log(`Updating campaign ${metrics.campaignId} with ${dataSource.toUpperCase()} metrics:`, {
        sales: dbMetrics.sales,
        spend: dbMetrics.spend,
        orders: dbMetrics.orders,
        data_source: dbMetrics.data_source,
        isRealData: isRealData
      });

      // Update the campaign with current metrics
      const { data, error } = await supabase
        .from('campaigns')
        .update(dbMetrics)
        .eq('connection_id', connectionId)
        .eq('amazon_campaign_id', metrics.campaignId.toString())
        .select();

      if (error) {
        console.error(`Error updating campaign ${metrics.campaignId}:`, error);
        errorCount++;
        continue;
      }

      if (data && data.length > 0) {
        const logPrefix = isRealData ? '✓ REAL API' : '⚠ SIMULATED';
        console.log(`${logPrefix} metrics updated for campaign ${metrics.campaignId}`);
        
        // Store daily metrics for historical tracking
        const today = new Date().toISOString().split('T')[0];
        
        const { error: historyError } = await supabase
          .from('campaign_metrics_history')
          .upsert({
            campaign_id: data[0].id,
            date: today,
            impressions: dbMetrics.impressions,
            clicks: dbMetrics.clicks,
            spend: dbMetrics.spend,
            sales: dbMetrics.sales,
            orders: dbMetrics.orders,
            acos: dbMetrics.acos,
            roas: dbMetrics.roas,
            data_source: dataSource
          }, {
            onConflict: 'campaign_id, date'
          });

        if (historyError) {
          console.warn(`Failed to store history for campaign ${metrics.campaignId}:`, historyError);
        } else {
          console.log(`✓ Stored ${dataSource} metrics history for campaign ${metrics.campaignId}`);
        }

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
  
  console.log('=== METRICS UPDATE SUMMARY ===');
  console.log(`Total processed: ${successCount + errorCount}`);
  console.log(`Successful updates: ${successCount}`);
  console.log(`Failed updates: ${errorCount}`);
  console.log(`REAL Amazon API data: ${realDataCount}`);
  console.log(`SIMULATED data: ${simulatedDataCount}`);
  
  // Enhanced month-over-month calculation with connection filter
  if (successCount > 0) {
    try {
      console.log('Calculating month-over-month changes for connection:', connectionId);
      
      // Update campaigns with previous month data for this connection only
      const { error: calcError } = await supabase
        .from('campaigns')
        .update({
          previous_month_sales: supabase.raw(`
            COALESCE((
              SELECT SUM(sales) 
              FROM campaign_metrics_history 
              WHERE campaign_id = campaigns.id 
              AND date >= date_trunc('month', now() - interval '1 month')
              AND date < date_trunc('month', now())
              AND data_source != 'simulated'
            ), 0)
          `),
          previous_month_spend: supabase.raw(`
            COALESCE((
              SELECT SUM(spend) 
              FROM campaign_metrics_history 
              WHERE campaign_id = campaigns.id 
              AND date >= date_trunc('month', now() - interval '1 month')
              AND date < date_trunc('month', now())
              AND data_source != 'simulated'
            ), 0)
          `),
          previous_month_orders: supabase.raw(`
            COALESCE((
              SELECT SUM(orders) 
              FROM campaign_metrics_history 
              WHERE campaign_id = campaigns.id 
              AND date >= date_trunc('month', now() - interval '1 month')
              AND date < date_trunc('month', now())
              AND data_source != 'simulated'
            ), 0)
          `),
          metrics_last_calculated: new Date().toISOString()
        })
        .eq('connection_id', connectionId);
        
      if (calcError) {
        console.warn('Failed to calculate month-over-month changes:', calcError);
      } else {
        console.log('✓ Successfully calculated month-over-month changes');
      }
    } catch (error) {
      console.warn('Error calculating changes:', error);
    }
  }
  
  if (successCount === 0 && errorCount > 0) {
    throw new Error(`Failed to update any campaign metrics. Check campaign IDs and connection mapping.`);
  }
  
  // Log final status for troubleshooting
  if (realDataCount > 0) {
    console.log(`SUCCESS: ${realDataCount} campaigns updated with REAL Amazon API data`);
  } else {
    console.log(`WARNING: No real Amazon API data was processed - all data is simulated`);
  }
}
