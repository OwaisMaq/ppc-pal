
import { useState, useEffect } from 'react';
import { AutomationPreferences } from '@/hooks/useAutomationPreferences';

export const useAutomationPreferencesForm = (preferences: AutomationPreferences | null) => {
  const [autoOptimization, setAutoOptimization] = useState(false);
  const [optimizationFrequency, setOptimizationFrequency] = useState([24]);
  const [autoBidding, setAutoBidding] = useState(false);
  const [autoKeywords, setAutoKeywords] = useState(false);
  const [autoPausing, setAutoPausing] = useState(false);
  const [budgetAdjustment, setBudgetAdjustment] = useState(false);
  
  const [bidAdjustmentRange, setBidAdjustmentRange] = useState([20]);
  const [performanceThreshold, setPerformanceThreshold] = useState([7]);
  const [pauseThreshold, setPauseThreshold] = useState('50');
  const [budgetIncrease, setBudgetIncrease] = useState([15]);

  // Update form values when preferences change
  useEffect(() => {
    if (preferences) {
      setAutoOptimization(preferences.auto_optimization_enabled);
      setOptimizationFrequency([preferences.optimization_frequency_hours]);
      setAutoBidding(preferences.auto_bidding_enabled);
      setAutoKeywords(preferences.auto_keywords_enabled);
      setAutoPausing(preferences.auto_pausing_enabled);
      setBudgetAdjustment(preferences.budget_optimization_enabled);
      setBidAdjustmentRange([preferences.max_bid_adjustment_percent]);
      setPerformanceThreshold([preferences.performance_review_days]);
      setPauseThreshold(preferences.acos_pause_threshold.toString());
      setBudgetIncrease([preferences.max_budget_increase_percent]);
    }
  }, [preferences]);

  const getFormData = () => ({
    auto_optimization_enabled: autoOptimization,
    optimization_frequency_hours: optimizationFrequency[0],
    auto_bidding_enabled: autoBidding,
    max_bid_adjustment_percent: bidAdjustmentRange[0],
    performance_review_days: performanceThreshold[0],
    auto_keywords_enabled: autoKeywords,
    auto_pausing_enabled: autoPausing,
    acos_pause_threshold: parseFloat(pauseThreshold),
    budget_optimization_enabled: budgetAdjustment,
    max_budget_increase_percent: budgetIncrease[0],
  });

  return {
    // State values
    autoOptimization,
    optimizationFrequency,
    autoBidding,
    autoKeywords,
    autoPausing,
    budgetAdjustment,
    bidAdjustmentRange,
    performanceThreshold,
    pauseThreshold,
    budgetIncrease,
    
    // Setters
    setAutoOptimization,
    setOptimizationFrequency,
    setAutoBidding,
    setAutoKeywords,
    setAutoPausing,
    setBudgetAdjustment,
    setBidAdjustmentRange,
    setPerformanceThreshold,
    setPauseThreshold,
    setBudgetIncrease,
    
    // Helper
    getFormData,
  };
};
