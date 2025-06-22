
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';
import { processPerformanceData } from './performanceDataProcessor';

export const calculateMetrics = (campaigns: CampaignData[]): PerformanceMetrics | null => {
  console.log('=== CALCULATING PERFORMANCE METRICS WITH ENHANCED PROCESSING ===');
  console.log('Total campaigns received:', campaigns.length);
  
  if (!campaigns || campaigns.length === 0) {
    console.log('No campaigns provided for metrics calculation');
    return null;
  }

  // Use the enhanced performance data processor
  const { metrics, dataQuality, recommendations } = processPerformanceData(campaigns);

  console.log('=== DATA QUALITY ANALYSIS ===');
  console.log('Has real data:', dataQuality.hasRealData);
  console.log('Real data campaigns:', dataQuality.realDataCampaigns);
  console.log('Total campaigns:', dataQuality.totalCampaigns);
  console.log('Data source breakdown:', dataQuality.dataSourceBreakdown);

  if (recommendations.length > 0) {
    console.log('=== RECOMMENDATIONS ===');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  if (!metrics) {
    console.log('❌ NO METRICS CALCULATED - No real API data with performance metrics available');
    return null;
  }

  console.log('✅ ENHANCED METRICS CALCULATION COMPLETE');
  return metrics;
};

// Legacy function kept for backwards compatibility
export const calculateMetricsLegacy = calculateMetrics;
