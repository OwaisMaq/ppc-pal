
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

  if (loading || weeklyLoading) {
    return <PerformanceLoadingState getFilteredDescription={getFilteredDescription} />;
  }

  // Show empty state if no data at all
  if (!hasData) {
    return (
      <PerformanceEmptyState 
        connections={connections} 
        getFilteredDescription={getFilteredDescription} 
      />
    );
  }

  // Show main performance summary if we have real data (API campaigns)
  if (hasRealData) {
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

          {metrics ? (
            <>
              <PerformanceMetricCards 
                metrics={metrics} 
                formatCurrency={formatCurrency} 
              />

              <AdditionalMetrics 
                metrics={metrics}
                formatCurrency={formatCurrency}
                formatPercentage={formatPercentage}
              />
            </>
          ) : (
            <NoRealDataAlert 
              title="Campaign Metrics Calculating"
              description="Your Amazon campaigns are connected successfully. Performance metrics are being calculated and will appear here once available."
              showSyncButton={false}
            />
          )}
        </div>
      </div>
    );
  }

  // Show error state only if no real API data is available
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

      {/* Main error message for no real data */}
      <NoRealDataAlert 
        title="No Amazon API Campaigns Found"
        description="No campaigns were found from your Amazon API connection. Please ensure: 1) Your Amazon Advertising account has active campaigns, 2) Your API connection has proper permissions, 3) Try re-syncing your connection from Settings."
        showSyncButton={true}
      />
    </div>
  );
};

export default PerformanceSummary;
