
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PerformanceMetrics } from '@/types/performance';

export const useWeeklyMetrics = (
  selectedCountry?: string,
  selectedCampaign?: string,
  selectedProduct?: string
) => {
  const { user } = useAuth();
  const [weeklyMetrics, setWeeklyMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRealData, setHasRealData] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Since Amazon functionality has been removed, return empty metrics
    setLoading(false);
    setWeeklyMetrics(null);
    setHasRealData(false);
  }, [user, selectedCountry, selectedCampaign, selectedProduct]);

  return {
    weeklyMetrics,
    loading,
    hasRealData
  };
};
