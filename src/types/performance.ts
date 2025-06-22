
export interface PerformanceMetrics {
  totalSales: number;
  totalSpend: number;
  totalProfit: number;
  totalOrders: number;
  averageAcos: number;
  averageRoas: number;
  averageCostPerUnit: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  averageCpc: number;
  conversionRate: number;
  // Month-over-month changes
  salesChange: number;
  spendChange: number;
  ordersChange: number;
  profitChange: number;
  // Data quality indicators
  hasSimulatedData: boolean;
  dataSourceInfo: string;
}

export interface FilterParams {
  selectedCountry?: string;
  selectedCampaign?: string;
  selectedProduct?: string;
}
