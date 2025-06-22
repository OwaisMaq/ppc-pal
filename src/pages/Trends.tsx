
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import FilterBar from '@/components/FilterBar';
import TrendsChart from '@/components/trends/TrendsChart';
import TrendsKeyMetrics from '@/components/trends/TrendsKeyMetrics';
import TrendsHeader from '@/components/trends/TrendsHeader';
import TrendsLoadingState from '@/components/trends/TrendsLoadingState';
import TrendsEmptyState from '@/components/trends/TrendsEmptyState';
import TrendsCampaignPerformance from '@/components/trends/TrendsCampaignPerformance';
import TrendsDataAlert from '@/components/trends/TrendsDataAlert';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useTrendsData } from '@/hooks/useTrendsData';

const Trends = () => {
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  
  const { connections } = useAmazonConnections();
  const { campaigns, loading: campaignsLoading } = useCampaignData();
  const { metrics, loading: metricsLoading } = usePerformanceData(
    undefined, 
    selectedCountry, 
    selectedCampaign
  );

  const loading = campaignsLoading || metricsLoading;
  const trendsData = useTrendsData(campaigns, connections, selectedCountry, selectedCampaign, selectedProduct);

  if (loading) {
    return <TrendsLoadingState />;
  }

  if (!campaigns.length) {
    return <TrendsEmptyState connections={connections} />;
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <TrendsHeader 
          title="Performance Trends"
          description="Track your advertising performance over time with detailed analytics"
        />

        <FilterBar
          selectedCountry={selectedCountry}
          selectedAsin={selectedCampaign}
          selectedProduct={selectedProduct}
          onCountryChange={setSelectedCountry}
          onAsinChange={setSelectedCampaign}
          onProductChange={setSelectedProduct}
        />

        {metrics && (
          <TrendsKeyMetrics
            totalSales={metrics.totalSales}
            totalSpend={metrics.totalSpend}
            totalProfit={metrics.totalProfit}
            totalOrders={metrics.totalOrders}
            salesChange={metrics.salesChange}
            spendChange={metrics.spendChange}
            profitChange={metrics.profitChange}
            ordersChange={metrics.ordersChange}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendsChart data={trendsData} />
          <TrendsCampaignPerformance campaigns={campaigns} />
        </div>

        {metrics?.hasSimulatedData && (
          <TrendsDataAlert 
            hasSimulatedData={metrics.hasSimulatedData}
            dataSourceInfo={metrics.dataSourceInfo}
          />
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default Trends;
