
export interface PerformanceMetrics {
  totalSales: number;
  totalSpend: number;
  totalProfit: number;
  totalOrders: number;
  activeCampaigns: number;
  totalCampaigns: number;
  averageAcos: number;
  averageRoas: number;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averageCpc: number;
  conversionRate: number;
}

export interface FilterParams {
  selectedCountry?: string;
  selectedCampaign?: string;
  selectedProduct?: string;
}

export interface DataQualityInfo {
  hasRealData: boolean;
  realDataCampaigns: number;
  totalCampaigns: number;
  simulatedCampaigns: number;
  dataSourceBreakdown: Record<string, number>;
}
