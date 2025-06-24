
import { Region, getBaseUrl } from './types.ts';

export async function fetchBasicMetrics(
  accessToken: string,
  clientId: string,
  profileId: string,
  baseUrl: string,
  campaignIds: string[]
): Promise<any[]> {
  console.log('=== GENERATING ENHANCED SIMULATED METRICS ===');
  console.log(`Creating simulated metrics for ${campaignIds.length} campaign UUIDs`);
  console.log('Campaign UUIDs:', campaignIds);
  
  const metrics = [];
  
  for (const campaignUuid of campaignIds) {
    try {
      // Generate more realistic sample data based on typical Amazon campaign performance
      const isHighPerformer = Math.random() > 0.7; // 30% are high performers
      const isEnabled = Math.random() > 0.15; // 85% are enabled
      
      let performanceMultiplier;
      if (!isEnabled) {
        performanceMultiplier = 0.05; // Paused campaigns have minimal activity
      } else if (isHighPerformer) {
        performanceMultiplier = 1.2 + Math.random() * 0.8; // High performers: 1.2x to 2.0x
      } else {
        performanceMultiplier = 0.3 + Math.random() * 0.9; // Regular performers: 0.3x to 1.2x
      }
      
      // Base metrics that scale with campaign performance
      const baseImpressions = Math.floor((2000 + Math.random() * 48000) * performanceMultiplier);
      const ctr = isHighPerformer ? (2.5 + Math.random() * 3.5) : (1.0 + Math.random() * 2.5); // 1-6% CTR
      const clicks = Math.floor(baseImpressions * (ctr / 100));
      
      const conversionRate = isHighPerformer ? (12 + Math.random() * 18) : (6 + Math.random() * 12); // 6-30% conversion
      const orders = Math.floor(clicks * (conversionRate / 100));
      
      const avgOrderValue = 20 + Math.random() * 80; // $20 to $100 AOV
      const sales = Number((orders * avgOrderValue).toFixed(2));
      
      const cpc = isHighPerformer ? (0.45 + Math.random() * 1.55) : (0.25 + Math.random() * 2.25); // $0.25 to $2.50 CPC
      const spend = Number((clicks * cpc).toFixed(2));
      
      const acos = spend > 0 && sales > 0 ? Number(((spend / sales) * 100).toFixed(2)) : 0;
      const roas = spend > 0 ? Number((sales / spend).toFixed(2)) : 0;

      const simulatedMetrics = {
        campaignId: campaignUuid, // Use the UUID for simulated data
        impressions: baseImpressions,
        clicks: clicks,
        spend: spend,
        sales: sales,
        orders: orders,
        ctr: Number(ctr.toFixed(2)),
        cpc: Number(cpc.toFixed(2)),
        acos: acos,
        roas: roas,
        conversionRate: Number(conversionRate.toFixed(2)),
        fromAPI: false // Explicitly mark as simulated data
      };

      metrics.push(simulatedMetrics);

      console.log(`✓ Generated ${isHighPerformer ? 'HIGH-PERFORMING' : 'STANDARD'} simulated metrics for campaign ${campaignUuid}:`);
      console.log(`   Sales: $${simulatedMetrics.sales}, Spend: $${simulatedMetrics.spend}, Orders: ${simulatedMetrics.orders}, ACOS: ${simulatedMetrics.acos}%`);

    } catch (error) {
      console.warn(`Failed to generate simulated data for campaign ${campaignUuid}:`, error);
    }
  }
  
  console.log(`✓ Generated ${metrics.length} ENHANCED SIMULATED metric records`);
  console.log('⚠️ NOTE: This is simulated data for development purposes');
  return metrics;
}
