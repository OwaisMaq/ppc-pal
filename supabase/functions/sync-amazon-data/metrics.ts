
import { Region, getBaseUrl } from './types.ts';

export async function fetchBasicMetrics(
  accessToken: string,
  clientId: string,
  profileId: string,
  baseUrl: string,
  campaignIds: string[]
): Promise<any[]> {
  console.log('=== GENERATING ENHANCED SIMULATED METRICS WITH DETAILED LOGGING ===');
  console.log(`🎭 Creating simulated metrics for ${campaignIds.length} campaign UUIDs`);
  console.log(`🔍 Campaign UUIDs to process:`, campaignIds);
  console.log(`⚠️ NOTICE: This is fallback simulated data for development purposes`);
  console.log(`🎯 To get real metrics, ensure campaigns have activity and proper API permissions`);
  
  const metrics = [];
  
  // Generate campaign performance profiles for more realistic data
  const performanceProfiles = [
    { name: 'High Performer', weight: 0.15, multiplier: [1.8, 2.5], ctr: [3.5, 6.0], conversionRate: [15, 25] },
    { name: 'Good Performer', weight: 0.25, multiplier: [1.2, 1.8], ctr: [2.5, 4.0], conversionRate: [10, 18] },
    { name: 'Average Performer', weight: 0.35, multiplier: [0.8, 1.2], ctr: [1.5, 3.0], conversionRate: [8, 15] },
    { name: 'Poor Performer', weight: 0.20, multiplier: [0.3, 0.8], ctr: [0.8, 2.0], conversionRate: [3, 10] },
    { name: 'Paused/Inactive', weight: 0.05, multiplier: [0.0, 0.1], ctr: [0.0, 0.5], conversionRate: [0, 5] }
  ];
  
  console.log(`📊 Using ${performanceProfiles.length} performance profiles for realistic data generation`);
  
  for (const [index, campaignUuid] of campaignIds.entries()) {
    try {
      console.log(`\n🔄 Processing campaign ${index + 1}/${campaignIds.length}: ${campaignUuid}`);
      
      // Select performance profile based on weights
      const random = Math.random();
      let cumulativeWeight = 0;
      let selectedProfile = performanceProfiles[2]; // Default to average
      
      for (const profile of performanceProfiles) {
        cumulativeWeight += profile.weight;
        if (random <= cumulativeWeight) {
          selectedProfile = profile;
          break;
        }
      }
      
      console.log(`🎯 Selected performance profile: ${selectedProfile.name}`);
      
      const isEnabled = selectedProfile.name !== 'Paused/Inactive';
      const performanceMultiplier = selectedProfile.multiplier[0] + 
        Math.random() * (selectedProfile.multiplier[1] - selectedProfile.multiplier[0]);
      
      console.log(`⚡ Performance multiplier: ${performanceMultiplier.toFixed(2)}x`);
      console.log(`🟢 Campaign enabled: ${isEnabled}`);
      
      // Base metrics that scale with campaign performance
      const baseImpressions = Math.floor((1000 + Math.random() * 49000) * performanceMultiplier);
      
      const ctrRange = selectedProfile.ctr;
      const ctr = ctrRange[0] + Math.random() * (ctrRange[1] - ctrRange[0]);
      const clicks = Math.floor(baseImpressions * (ctr / 100));
      
      const conversionRange = selectedProfile.conversionRate;
      const conversionRate = conversionRange[0] + Math.random() * (conversionRange[1] - conversionRange[0]);
      const orders = Math.floor(clicks * (conversionRate / 100));
      
      // Realistic AOV based on campaign performance
      const baseAOV = selectedProfile.name === 'High Performer' ? 45 : 
                     selectedProfile.name === 'Good Performer' ? 35 :
                     selectedProfile.name === 'Average Performer' ? 28 : 20;
      const aovVariation = 0.7 + Math.random() * 0.6; // 0.7x to 1.3x variation
      const avgOrderValue = baseAOV * aovVariation;
      const sales = Number((orders * avgOrderValue).toFixed(2));
      
      // Realistic CPC based on performance and competition
      const baseCPC = selectedProfile.name === 'High Performer' ? 0.85 : 
                      selectedProfile.name === 'Good Performer' ? 1.20 :
                      selectedProfile.name === 'Average Performer' ? 1.80 : 2.50;
      const cpcVariation = 0.6 + Math.random() * 0.8; // 0.6x to 1.4x variation
      const cpc = baseCPC * cpcVariation;
      const spend = Number((clicks * cpc).toFixed(2));
      
      // Calculate derived metrics
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
        fromAPI: false, // Explicitly mark as simulated data
        performanceProfile: selectedProfile.name,
        dataQuality: 'simulated'
      };

      metrics.push(simulatedMetrics);

      console.log(`✅ Generated ${selectedProfile.name.toUpperCase()} simulated metrics:`, {
        campaignId: campaignUuid,
        profile: selectedProfile.name,
        sales: `$${simulatedMetrics.sales}`,
        spend: `$${simulatedMetrics.spend}`,
        orders: simulatedMetrics.orders,
        acos: `${simulatedMetrics.acos}%`,
        roas: `${simulatedMetrics.roas}x`,
        impressions: simulatedMetrics.impressions.toLocaleString(),
        clicks: simulatedMetrics.clicks.toLocaleString(),
        ctr: `${simulatedMetrics.ctr}%`,
        cpc: `$${simulatedMetrics.cpc}`,
        conversionRate: `${simulatedMetrics.conversionRate}%`
      });

    } catch (error) {
      console.error(`💥 Failed to generate simulated data for campaign ${campaignUuid}:`, {
        error: error.message,
        stack: error.stack?.substring(0, 100)
      });
    }
  }
  
  // Generate summary statistics
  const totalSales = metrics.reduce((sum, m) => sum + m.sales, 0);
  const totalSpend = metrics.reduce((sum, m) => sum + m.spend, 0);
  const totalOrders = metrics.reduce((sum, m) => sum + m.orders, 0);
  const profileCounts = metrics.reduce((acc, m) => {
    acc[m.performanceProfile] = (acc[m.performanceProfile] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n=== SIMULATED METRICS GENERATION COMPLETE ===');
  console.log(`✅ Successfully generated ${metrics.length} ENHANCED SIMULATED metric records`);
  console.log(`📊 Summary statistics:`, {
    totalSales: `$${totalSales.toFixed(2)}`,
    totalSpend: `$${totalSpend.toFixed(2)}`,
    totalOrders: totalOrders,
    avgAcos: totalSales > 0 ? `${((totalSpend / totalSales) * 100).toFixed(1)}%` : '0%',
    profileDistribution: profileCounts
  });
  console.log('⚠️ IMPORTANT: This is simulated data for development purposes');
  console.log('🎯 Real data will appear once Amazon API calls succeed and return performance metrics');
  
  return metrics;
}
