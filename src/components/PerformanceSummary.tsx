
import React from 'react';
import FilterBar from "@/components/FilterBar";
import { usePerformanceSummary } from "@/hooks/usePerformanceSummary";
import PerformanceLoadingState from "./performance/PerformanceLoadingState";
import PerformanceEmptyState from "./performance/PerformanceEmptyState";
import PerformanceMetricCards from "./performance/PerformanceMetricCards";
import AdditionalMetrics from "./performance/AdditionalMetrics";
import NoRealDataAlert from "./performance/NoRealDataAlert";

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
    getFilteredDescription,
    formatCurrency,
    formatPercentage
  } = usePerformanceSummary();

  // Add missing selectedProduct state
  const [selectedProduct, setSelectedProduct] = React.useState('all');

  if (loading) {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">
          Overview of your advertising performance metrics{getFilteredDescription()}
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

      {!hasRealData ? (
        <NoRealDataAlert 
          description="No real campaign data available. All current data is simulated. Please sync your Amazon account to get real performance metrics."
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
          title="Unable to Calculate Metrics"
          description="Real data is available but metrics calculation failed. Please check your connection and try again."
        />
      )}
    </div>
  );
};

export default PerformanceSummary;
