
import { useState } from 'react';
import { usePerformanceData } from './usePerformanceData';
import { useAmazonConnections } from './useAmazonConnections';

export const usePerformanceSummary = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const { connections } = useAmazonConnections();
  
  // FIXED: Do not pass selectedCountry as connectionId
  const { 
    metrics, 
    loading, 
    hasData, 
    hasRealData, 
    dataQuality, 
    recommendations 
  } = usePerformanceData(undefined, selectedCountry, selectedCampaign);

  console.log('=== PERFORMANCE SUMMARY HOOK DEBUG ===');
  console.log('Selected filters:', { selectedCountry, selectedCampaign });
  console.log('Has data:', hasData);
  console.log('Has real data:', hasRealData);
  console.log('Metrics available:', metrics !== null);

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
    hasRealData,
    dataQuality,
    recommendations,
    getFilteredDescription,
    formatCurrency,
    formatPercentage
  };
};
