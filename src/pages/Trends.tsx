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

  console.log('=== TRENDS PAGE - STRICT NO SIMULATION MODE ===');
  console.log('Total campaigns:', campaigns.length);
  console.log('Real API campaigns:', realCampaigns.length);
  console.log('Has real data:', hasRealData);
  console.log('Loading:', loading);

  if (loading) {
    return <TrendsLoadingState />;
  }

  if (!realCampaigns.length) {
    console.log('❌ No real API campaigns available - showing alert');
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <TrendsHeader 
            title="Performance Trends"
            description="Track your advertising performance over time with detailed analytics"
          />

          <NoRealDataAlert 
            title="No Real Trend Data Available"
            description="Trends require real campaign data from Amazon API. No real API data is currently available. Please sync your Amazon connection to get actual performance data."
            showSyncButton={true}
          />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!hasRealData) {
    console.log('❌ No real performance data available - showing alert');
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <TrendsHeader 
            title="Performance Trends"
            description="Track your advertising performance over time with detailed analytics"
          />

          <NoRealDataAlert 
            title="No Real Performance Data Available"
            description={`Found ${realCampaigns.length} real API campaigns but no performance metrics calculated yet. Performance data will appear here once Amazon API sync completes successfully.`}
            showSyncButton={true}
          />
        </div>
      </AuthenticatedLayout>
    );
  }

  console.log('✅ Displaying trends with real API data');

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <TrendsHeader 
          title="Performance Trends"
          description="Track your advertising performance over time with detailed analytics from real Amazon API data"
        />

        <FilterBar
          selectedCountry={selectedCountry}
          selectedAsin={selectedCampaign}
          selectedProduct={selectedProduct}
          onCountryChange={setSelectedCountry}
          onAsinChange={setSelectedCampaign}
          onProductChange={setSelectedProduct}
        />

        {metrics && trendsData.length > 0 && (
          <>
            <TrendsKeyMetrics
              totalSales={metrics.totalSales}
              totalSpend={metrics.totalSpend}
              totalProfit={metrics.totalProfit}
              totalOrders={metrics.totalOrders}
              salesChange={metrics.salesChange || 0}
              spendChange={metrics.spendChange || 0}
              profitChange={metrics.profitChange || 0}
              ordersChange={metrics.ordersChange || 0}
            />

            <TrendsChart data={trendsData} />

            <TrendsCampaignPerformance campaigns={realCampaigns} />
          </>
        )}

        {trendsData.length === 0 && (
          <NoRealDataAlert 
            title="No Trend Data Available"
            description="No trend data can be generated with current filters and available real API campaigns."
            showSyncButton={false}
          />
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default Trends;
