
import React from 'react';
import FilterBar from "@/components/FilterBar";
import { usePerformanceSummary } from "@/hooks/usePerformanceSummary";
import { useWeeklyMetrics } from "@/hooks/useWeeklyMetrics";
import { useSyncProgress } from "@/hooks/useSyncProgress";
import PerformanceLoadingState from "./performance/PerformanceLoadingState";
import NoCampaignDataAlert from "./performance/NoCampaignDataAlert";
import PerformanceMetricCards from "./performance/PerformanceMetricCards";
import AdditionalMetrics from "./performance/AdditionalMetrics";
import WeeklyPerformanceMetrics from "./performance/WeeklyPerformanceMetrics";
import NoRealDataAlert from "./performance/NoRealDataAlert";
import DataQualityInsights from "./performance/DataQualityInsights";
import SyncProgressIndicator from "./SyncProgressIndicator";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";

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
  const { syncProgress, startSync } = useSyncProgress();
  const { syncConnection } = useAmazonConnections();

  // Get weekly metrics
  const { 
    weeklyMetrics, 
    loading: weeklyLoading, 
    hasRealData: hasWeeklyRealData 
  } = useWeeklyMetrics(selectedCountry, selectedCampaign, selectedProduct);

  const handleSyncData = async () => {
    if (connections.length > 0) {
      const interval = startSync(connections[0].id);
      try {
        await syncConnection(connections[0].id);
        clearInterval(interval);
        // Refresh the page after sync
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        clearInterval(interval);
        console.error('Sync failed:', error);
      }
    }
  };

  console.log('=== PERFORMANCE SUMMARY RENDER DEBUG ===');
  console.log('Loading states:', { loading, weeklyLoading });
  console.log('Data states:', { hasData, hasRealData });
  console.log('Metrics available:', metrics !== null);
  console.log('Connections:', connections.length);

  if (loading || weeklyLoading) {
    return <PerformanceLoadingState getFilteredDescription={getFilteredDescription} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">
          Real campaign performance metrics from Amazon API{getFilteredDescription()}
        </p>
      </div>

      {/* Sync Progress Indicator */}
      <SyncProgressIndicator 
        isActive={syncProgress.isActive}
        progress={syncProgress.progress}
        currentStep={syncProgress.currentStep}
        estimatedTimeRemaining={syncProgress.estimatedTimeRemaining}
      />

      {/* Show enhanced no data alert if no campaigns found */}
      {!hasData && (
        <NoCampaignDataAlert 
          connectionCount={connections.length}
          onSyncData={handleSyncData}
          isSyncing={syncProgress.isActive}
        />
      )}

      {/* Show main performance summary if we have real data */}
      {hasData && hasRealData && metrics && (
        <>
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
        </>
      )}

      {/* Show fallback when we have campaigns but no performance data */}
      {hasData && !hasRealData && (
        <>
          <FilterBar
            selectedCountry={selectedCountry}
            selectedAsin={selectedCampaign}
            selectedProduct={selectedProduct}
            onCountryChange={setSelectedCountry}
            onAsinChange={setSelectedCampaign}
            onProductChange={setSelectedProduct}
          />

          {dataQuality && (
            <DataQualityInsights 
              dataQuality={dataQuality}
              recommendations={recommendations}
            />
          )}

          <NoRealDataAlert 
            title="Processing Campaign Data"
            description={`Found ${dataQuality?.totalCampaigns || 0} campaigns from your Amazon API connection. Performance metrics are being calculated and will appear here once processing is complete.`}
            showSyncButton={true}
          />
        </>
      )}
    </div>
  );
};

export default PerformanceSummary;
