
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
      // Determine data source based on fromAPI flag
      const dataSource = metrics.fromAPI === true ? 'api' : 'simulated';
      
      // Map API field names to database field names
      const dbMetrics = {
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        spend: metrics.spend || metrics.cost || 0,
        sales: metrics.sales || metrics.sales14d || 0,
        orders: metrics.orders || metrics.purchases14d || 0,
        acos: metrics.acos || (metrics.spend && metrics.sales ? (metrics.spend / metrics.sales) * 100 : null),
        roas: metrics.roas || (metrics.spend && metrics.sales ? metrics.sales / metrics.spend : null),
        data_source: dataSource,
        last_updated: new Date().toISOString()
      };

      console.log(`Updating campaign ${metrics.campaignId} with ${dataSource} metrics:`, dbMetrics);

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
        console.log(`Successfully updated ${dataSource} metrics for campaign ${metrics.campaignId}: sales=${dbMetrics.sales}, spend=${dbMetrics.spend}, orders=${dbMetrics.orders}`);
        
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
          console.log(`Stored daily ${dataSource} metrics history for campaign ${metrics.campaignId}`);
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
  
  console.log(`Campaign metrics update completed: ${successCount} successful, ${errorCount} errors`);
  
  // Calculate month-over-month changes after updating metrics
  if (successCount > 0) {
    try {
      console.log('Calculating month-over-month changes...');
      const { error: calcError } = await supabase.rpc('calculate_campaign_changes');
      if (calcError) {
        console.warn('Failed to calculate month-over-month changes:', calcError);
      } else {
        console.log('Successfully calculated month-over-month changes');
      }
    } catch (error) {
      console.warn('Error calculating changes:', error);
    }
  }
  
  if (successCount === 0 && errorCount > 0) {
    throw new Error(`Failed to update any campaign metrics. Check campaign IDs and connection mapping.`);
  }
}
