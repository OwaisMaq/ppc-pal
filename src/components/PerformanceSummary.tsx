
import React from 'react';
import FilterBar from "@/components/FilterBar";
import { usePerformanceSummary } from "@/hooks/usePerformanceSummary";
import PerformanceLoadingState from "./performance/PerformanceLoadingState";
import PerformanceEmptyState from "./performance/PerformanceEmptyState";
import PerformanceMetricCards from "./performance/PerformanceMetricCards";
import AdditionalMetrics from "./performance/AdditionalMetrics";

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

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
          <p className="text-gray-600">Unable to calculate performance metrics</p>
        </div>
      </div>
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
  );
};

export default PerformanceSummary;
