
import { useState } from 'react';
import { usePerformanceData } from './usePerformanceData';
import { useAmazonConnections } from './useAmazonConnections';

export const usePerformanceSummary = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const { connections } = useAmazonConnections();
  const { metrics, loading, hasData } = usePerformanceData(undefined, selectedCountry, selectedCampaign);

  const getFilteredDescription = () => {
    const parts = [];
    if (selectedCountry !== "all") {
      const countryLabels: { [key: string]: string } = {
        "US": "United States",
        "CA": "Canada", 
        "UK": "United Kingdom",
        "DE": "Germany",
        "FR": "France",
        "IT": "Italy",
        "ES": "Spain",
        "JP": "Japan",
        "AU": "Australia",
        "NL": "Netherlands"
      };
      parts.push(`in ${countryLabels[selectedCountry] || selectedCountry}`);
    }
    if (selectedCampaign !== "all") {
      parts.push(`for selected campaign`);
    }
    return parts.length > 0 ? ` ${parts.join(" ")}` : "";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return {
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
  };
};
