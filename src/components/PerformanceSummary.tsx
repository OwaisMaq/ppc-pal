
import React from 'react';
import FilterBar from "@/components/FilterBar";
import { usePerformanceSummary } from "@/hooks/usePerformanceSummary";
import { useWeeklyMetrics } from "@/hooks/useWeeklyMetrics";
import PerformanceLoadingState from "./performance/PerformanceLoadingState";
import PerformanceEmptyState from "./performance/PerformanceEmptyState";
import PerformanceMetricCards from "./performance/PerformanceMetricCards";
import AdditionalMetrics from "./performance/AdditionalMetrics";
import WeeklyPerformanceMetrics from "./performance/WeeklyPerformanceMetrics";
import NoRealDataAlert from "./performance/NoRealDataAlert";
import DataQualityInsights from "./performance/DataQualityInsights";

const PerformanceSummary = () => {
  const {
    selectedCountry,
    setSelectedCountry,
    selectedCampaign,
    setSelectedCampaign,
    connections,
    metrics,
    loading,
    hasData,
    hasRealData,
    dataQuality,
    recommendations,
    getFilteredDescription,
    formatCurrency,
    formatPercentage
  } = usePerformanceSummary();

  const [selectedProduct, setSelectedProduct] = React.useState('all');

  // Get weekly metrics
  const { 
    weeklyMetrics, 
    loading: weeklyLoading, 
    hasRealData: hasWeeklyRealData 
  } = useWeeklyMetrics(selectedCountry, selectedCampaign, selectedProduct);

  console.log('=== PERFORMANCE SUMMARY RENDER DEBUG ===');
  console.log('Loading states:', { loading, weeklyLoading });
  console.log('Data states:', { hasData, hasRealData });
  console.log('Metrics available:', metrics !== null);
  console.log('Current filters:', { selectedCountry, selectedCampaign, selectedProduct });

  if (loading || weeklyLoading) {
    return <PerformanceLoadingState getFilteredDescription={getFilteredDescription} />;
  }

  // Show empty state if no data at all
  if (!hasData) {
    console.log('Showing empty state - no data available');
    return (
      <PerformanceEmptyState 
        connections={connections} 
        getFilteredDescription={getFilteredDescription} 
      />
    );
  }

  // Show main performance summary if we have real data (API campaigns)
  if (hasRealData && metrics) {
    console.log('✅ Showing performance summary with real data');
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
          <p className="text-gray-600">
            Real campaign performance metrics from Amazon API{getFilteredDescription()}
          </p>
        </div>

        <FilterBar
          selectedCountry={selectedCountry}
          selectedAsin={selectedCampaign}
          selectedProduct={selectedProduct}
          onCountryChange={setSelectedCountry}
          onAsinChange={setSelectedCampaign}
          onProductChange={setSelectedProduct}
        />

        {/* Data Quality Insights */}
        {dataQuality && (
          <DataQualityInsights 
            dataQuality={dataQuality}
            recommendations={recommendations}
          />
        )}

        {/* 7-Day Performance Metrics Section */}
        {hasWeeklyRealData && weeklyMetrics ? (
          <WeeklyPerformanceMetrics 
            metrics={weeklyMetrics}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />
        ) : (
          <NoRealDataAlert 
            title="No 7-Day Performance Data Available"
            description="No campaign performance data available for the last 7 days. Performance data typically appears 24-48 hours after campaign activity begins."
            showSyncButton={false}
          />
        )}

        {/* Monthly Performance Metrics Section */}
        <div className="pt-6 border-t border-gray-200">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Monthly Performance Overview</h3>
            <p className="text-gray-600">Campaign performance metrics from Amazon API</p>
          </div>

          <PerformanceMetricCards 
            metrics={metrics} 
            formatCurrency={formatCurrency} 
          />

          <AdditionalMetrics 
            metrics={metrics}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />
        </div>
      </div>
    );
  }

  // Show state when we have campaigns but no performance data
  console.log('Showing fallback state - campaigns available but no metrics calculated');
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">
          Real campaign performance metrics from Amazon API{getFilteredDescription()}
        </p>
      </div>

      <FilterBar
        selectedCountry={selectedCountry}
        selectedAsin={selectedCampaign}
        selectedProduct={selectedProduct}
        onCountryChange={setSelectedCountry}
        onAsinChange={setSelectedCampaign}
        onProductChange={setSelectedProduct}
      />

      {/* Data Quality Insights */}
      {dataQuality && (
        <DataQualityInsights 
          dataQuality={dataQuality}
          recommendations={recommendations}
        />
      )}

      {/* Main message for available campaigns but no calculated metrics */}
      <NoRealDataAlert 
        title="Calculating Performance Metrics"
        description={`Found ${dataQuality?.totalCampaigns || 0} campaigns from your Amazon API connection. Performance metrics are being calculated and will appear here once processing is complete. If this persists, try re-syncing your connection from Settings.`}
        showSyncButton={true}
      />
    </div>
  );
};

export default PerformanceSummary;
