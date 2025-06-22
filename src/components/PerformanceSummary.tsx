
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

  if (!hasData) {
    return (
      <PerformanceEmptyState 
        connections={connections} 
        getFilteredDescription={getFilteredDescription} 
      />
    );
  }

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
          title="No Real 7-Day Data Available"
          description="No real campaign data from Amazon API available for the last 7 days. Performance data typically appears 24-48 hours after campaign activity begins."
          showSyncButton={true}
        />
      )}

      {/* Monthly Performance Metrics Section */}
      <div className="pt-6 border-t border-gray-200">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Monthly Performance Overview</h3>
          <p className="text-gray-600">Real campaign performance metrics from Amazon API</p>
        </div>

        {!hasRealData ? (
          <NoRealDataAlert 
            description="No real campaign data from Amazon API available. Please sync your Amazon account to get real performance metrics. Performance data typically appears 24-48 hours after campaign activity begins."
          />
        ) : metrics ? (
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
            title="Unable to Calculate Real Metrics"
            description="No real data from Amazon API meets the criteria for metrics calculation. Please check your connection and sync data. Performance metrics require active campaigns with recent activity."
          />
        )}
      </div>
    </div>
  );
};

export default PerformanceSummary;
