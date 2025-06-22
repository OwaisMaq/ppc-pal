
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import FilterBar from '@/components/FilterBar';
import TrendsChart from '@/components/trends/TrendsChart';
import TrendsKeyMetrics from '@/components/trends/TrendsKeyMetrics';
import TrendsHeader from '@/components/trends/TrendsHeader';
import TrendsLoadingState from '@/components/trends/TrendsLoadingState';
import TrendsEmptyState from '@/components/trends/TrendsEmptyState';
import TrendsCampaignPerformance from '@/components/trends/TrendsCampaignPerformance';
import NoRealDataAlert from '@/components/performance/NoRealDataAlert';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useTrendsData } from '@/hooks/useTrendsData';
import { filterRealDataOnly } from '@/utils/dataFilter';

const Trends = () => {
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  
  const { connections } = useAmazonConnections();
  const { campaigns, loading: campaignsLoading } = useCampaignData();
  const { metrics, loading: metricsLoading, hasRealData } = usePerformanceData(
    undefined, 
    selectedCountry, 
    selectedCampaign
  );

  const loading = campaignsLoading || metricsLoading;
  const realCampaigns = filterRealDataOnly(campaigns);
  const trendsData = useTrendsData(campaigns, connections, selectedCountry, selectedCampaign, selectedProduct);

  if (loading) {
    return <TrendsLoadingState />;
  }

  if (!campaigns.length) {
    return <TrendsEmptyState connections={connections} />;
  }

  if (!hasRealData || !realCampaigns.length) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <TrendsHeader 
            title="Performance Trends"
            description="Track your advertising performance over time with detailed analytics"
          />

          <NoRealDataAlert 
            title="No Real Trend Data Available"
            description="Trends require real campaign data from Amazon API. All current data is simulated and cannot be used for meaningful trend analysis."
          />
        </div>
      </AuthenticatedLayout>
    );
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

        {trendsData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendsChart data={trendsData} />
            <TrendsCampaignPerformance campaigns={realCampaigns} />
          </div>
        ) : (
          <NoRealDataAlert 
            title="No Trend Data for Current Filters"
            description="No real data matches your current filter selection. Try adjusting your filters or check if real data is available for the selected criteria."
            showSyncButton={false}
          />
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default Trends;
