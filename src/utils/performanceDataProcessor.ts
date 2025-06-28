
import { CampaignData } from '@/hooks/useCampaignData';
import { PerformanceMetrics } from '@/types/performance';

interface DataQuality {
  hasRealData: boolean;
  realDataCampaigns: number;
  totalCampaigns: number;
  simulatedCampaigns: number;
  dataSourceBreakdown: Record<string, number>;
  apiDataQuality: 'excellent' | 'good' | 'poor' | 'none';
  lastRealDataUpdate?: string;
  syncIssues: string[];
}

interface ProcessingResult {
  metrics: PerformanceMetrics | null;
  dataQuality: DataQuality;
  recommendations: string[];
  diagnostics: {
    campaignsWithMetrics: number;
    averageDataAge: number;
    commonIssues: string[];
  };
}

export const processPerformanceData = (campaigns: CampaignData[]): ProcessingResult => {
  console.log('=== COMPREHENSIVE PERFORMANCE DATA PROCESSING WITH DIAGNOSTICS ===');
  console.log(`Processing ${campaigns.length} campaigns with enhanced quality analysis`);

  // Initialize comprehensive data quality analysis
  const dataQuality: DataQuality = {
    hasRealData: false,
    realDataCampaigns: 0,
    totalCampaigns: campaigns.length,
    simulatedCampaigns: 0,
    dataSourceBreakdown: {},
    apiDataQuality: 'none',
    syncIssues: []
  };

  const recommendations: string[] = [];
  const diagnostics = {
    campaignsWithMetrics: 0,
    averageDataAge: 0,
    commonIssues: []
  };

  // Enhanced data source analysis
  let lastRealDataUpdate: Date | null = null;
  let totalDataAge = 0;
  let dataAgeCount = 0;

  campaigns.forEach(campaign => {
    const source = campaign.data_source || 'unknown';
    dataQuality.dataSourceBreakdown[source] = (dataQuality.dataSourceBreakdown[source] || 0) + 1;
    
    if (source === 'api') {
      dataQuality.realDataCampaigns++;
      
      // Track data freshness
      if (campaign.last_updated) {
        const updateTime = new Date(campaign.last_updated);
        if (!lastRealDataUpdate || updateTime > lastRealDataUpdate) {
          lastRealDataUpdate = updateTime;
        }
        
        const ageHours = (Date.now() - updateTime.getTime()) / (1000 * 60 * 60);
        totalDataAge += ageHours;
        dataAgeCount++;
      }
    } else if (source === 'simulated') {
      dataQuality.simulatedCampaigns++;
    }
  });

  dataQuality.hasRealData = dataQuality.realDataCampaigns > 0;
  dataQuality.lastRealDataUpdate = lastRealDataUpdate?.toISOString();
  
  // Calculate average data age
  if (dataAgeCount > 0) {
    diagnostics.averageDataAge = Math.round(totalDataAge / dataAgeCount);
  }

  // Determine API data quality
  const realDataRatio = dataQuality.realDataCampaigns / dataQuality.totalCampaigns;
  if (realDataRatio >= 0.9) {
    dataQuality.apiDataQuality = 'excellent';
  } else if (realDataRatio >= 0.5) {
    dataQuality.apiDataQuality = 'good';
  } else if (realDataRatio > 0) {
    dataQuality.apiDataQuality = 'poor';
  } else {
    dataQuality.apiDataQuality = 'none';
  }

  console.log('=== COMPREHENSIVE DATA QUALITY ANALYSIS ===');
  console.log('Data quality metrics:', {
    hasRealData: dataQuality.hasRealData,
    realDataCampaigns: dataQuality.realDataCampaigns,
    totalCampaigns: dataQuality.totalCampaigns,
    dataSourceBreakdown: dataQuality.dataSourceBreakdown,
    apiDataQuality: dataQuality.apiDataQuality,
    averageDataAge: diagnostics.averageDataAge + ' hours',
    lastRealDataUpdate: dataQuality.lastRealDataUpdate
  });

  // Enhanced campaign filtering with comprehensive metrics check
  const campaignsWithMetrics = campaigns.filter(campaign => {
    const hasMetrics = (campaign.sales || 0) > 0 || 
                     (campaign.spend || 0) > 0 || 
                     (campaign.orders || 0) > 0 ||
                     (campaign.clicks || 0) > 0 ||
                     (campaign.impressions || 0) > 0;
    
    if (!hasMetrics) {
      console.log(`Campaign ${campaign.name} has no metrics data (Source: ${campaign.data_source})`);
      if (campaign.data_source === 'api') {
        diagnostics.commonIssues.push(`API campaign "${campaign.name}" has no performance metrics`);
      }
    }
    
    return hasMetrics;
  });

  diagnostics.campaignsWithMetrics = campaignsWithMetrics.length;

  console.log(`Enhanced filtering results: ${campaignsWithMetrics.length} campaigns with metrics out of ${campaigns.length} total`);

  // Generate comprehensive recommendations based on data quality
  if (!dataQuality.hasRealData) {
    recommendations.push('No real Amazon API data found. Connect your Amazon account with proper advertising permissions and sync to get actual performance metrics.');
    dataQuality.syncIssues.push('No API data source detected');
  } else {
    // Check data freshness
    if (diagnostics.averageDataAge > 48) {
      recommendations.push(`Performance data is ${diagnostics.averageDataAge} hours old. Consider re-syncing for fresher metrics.`);
      dataQuality.syncIssues.push('Data may be stale');
    }
    
    // Check data completeness
    if (dataQuality.apiDataQuality === 'poor') {
      recommendations.push(`Only ${dataQuality.realDataCampaigns} of ${dataQuality.totalCampaigns} campaigns have real API data. Some campaigns may need re-syncing.`);
      dataQuality.syncIssues.push('Incomplete API data coverage');
    }
    
    // Check for campaigns without metrics
    const apiCampaignsWithoutMetrics = campaigns.filter(c => 
      c.data_source === 'api' && 
      !((c.sales || 0) > 0 || (c.spend || 0) > 0 || (c.orders || 0) > 0)
    );
    
    if (apiCampaignsWithoutMetrics.length > 0) {
      recommendations.push(`${apiCampaignsWithoutMetrics.length} API campaigns have no performance metrics. This may indicate recent campaigns or reporting permission issues.`);
      dataQuality.syncIssues.push('API campaigns missing performance data');
    }
  }
  
  if (dataQuality.realDataCampaigns > 0 && dataQuality.simulatedCampaigns > 0) {
    recommendations.push(`${dataQuality.realDataCampaigns} campaigns have real data, but ${dataQuality.simulatedCampaigns} are using simulated data. Consider re-syncing for complete real data.`);
  }
  
  if (campaignsWithMetrics.length === 0) {
    recommendations.push('No campaigns with performance metrics found. Ensure your campaigns have recent activity and try re-syncing.');
    diagnostics.commonIssues.push('No campaigns have performance metrics');
    return { metrics: null, dataQuality, recommendations, diagnostics };
  }

  // Enhanced metrics calculation with comprehensive tracking
  const totalSales = campaignsWithMetrics.reduce((sum, c) => sum + (c.sales || 0), 0);
  const totalSpend = campaignsWithMetrics.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalOrders = campaignsWithMetrics.reduce((sum, c) => sum + (c.orders || 0), 0);
  const totalClicks = campaignsWithMetrics.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalImpressions = campaignsWithMetrics.reduce((sum, c) => sum + (c.impressions || 0), 0);

  // Calculate derived metrics with enhanced precision
  const averageAcos = totalSales > 0 ? Number(((totalSpend / totalSales) * 100).toFixed(2)) : 0;
  const averageRoas = totalSpend > 0 ? Number((totalSales / totalSpend).toFixed(2)) : 0;
  const averageCpc = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0;
  const conversionRate = totalClicks > 0 ? Number(((totalOrders / totalClicks) * 100).toFixed(2)) : 0;
  const averageCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

  // Count active campaigns (enabled status)
  const activeCampaigns = campaignsWithMetrics.filter(c => c.status === 'enabled').length;

  // Calculate profit (simplified: sales - spend)
  const totalProfit = Number((totalSales - totalSpend).toFixed(2));

  const metrics: PerformanceMetrics = {
    totalSales: Number(totalSales.toFixed(2)),
    totalSpend: Number(totalSpend.toFixed(2)),
    totalProfit,
    totalOrders,
    totalClicks,
    totalImpressions,
    activeCampaigns,
    totalCampaigns: campaignsWithMetrics.length,
    averageAcos,
    averageRoas,
    averageCpc,
    averageCtr,
    conversionRate,
    salesChange: 0, // TODO: Calculate based on historical data
    spendChange: 0, // TODO: Calculate based on historical data
    profitChange: 0, // TODO: Calculate based on historical data
    ordersChange: 0, // TODO: Calculate based on historical data
    averageCostPerUnit: totalOrders > 0 ? Number((totalSpend / totalOrders).toFixed(2)) : 0,
    hasSimulatedData: dataQuality.simulatedCampaigns > 0,
    dataSourceInfo: `${dataQuality.realDataCampaigns} real, ${dataQuality.simulatedCampaigns} simulated (${dataQuality.apiDataQuality} quality)`
  };

  console.log('✅ COMPREHENSIVE METRICS CALCULATED:', {
    totalSales: metrics.totalSales,
    totalSpend: metrics.totalSpend,
    totalProfit: metrics.totalProfit,
    totalOrders: metrics.totalOrders,
    activeCampaigns: metrics.activeCampaigns,
    dataQuality: dataQuality.apiDataQuality,
    hasRealData: dataQuality.hasRealData,
    avgDataAge: diagnostics.averageDataAge + 'h',
    recommendations: recommendations.length
  });

  return { metrics, dataQuality, recommendations, diagnostics };
};
