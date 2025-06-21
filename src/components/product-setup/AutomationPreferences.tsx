
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAutomationPreferences } from '@/hooks/useAutomationPreferences';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useAutomationPreferencesForm } from '@/hooks/useAutomationPreferencesForm';

// Component imports
import ConnectionSelector from './automation/ConnectionSelector';
import OptimizationScheduleCard from './automation/OptimizationScheduleCard';
import BidManagementCard from './automation/BidManagementCard';
import KeywordDiscoveryCard from './automation/KeywordDiscoveryCard';
import AutoPausingCard from './automation/AutoPausingCard';
import BudgetManagementCard from './automation/BudgetManagementCard';
import EmptyConnectionState from './automation/EmptyConnectionState';
import OptimizationStatus from './automation/OptimizationStatus';

const AutomationPreferences = () => {
  const { connections } = useAmazonConnections();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const { preferences, loading, savePreferences } = useAutomationPreferences(selectedConnectionId);
  
  const {
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
    getFormData,
  } = useAutomationPreferencesForm(preferences);

  // Get active connections
  const activeConnections = connections.filter(c => c.status === 'active');

  // Set default connection
  useEffect(() => {
    if (activeConnections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(activeConnections[0].id);
    }
  }, [activeConnections, selectedConnectionId]);

  const handleSave = async () => {
    const success = await savePreferences(getFormData());
    if (success) {
      console.log('Automation preferences saved successfully');
    }
  };

  if (activeConnections.length === 0) {
    return <EmptyConnectionState />;
  }

  return (
    <div className="space-y-6">
      <ConnectionSelector
        connections={activeConnections}
        selectedConnectionId={selectedConnectionId}
        onConnectionChange={setSelectedConnectionId}
      />

      <OptimizationScheduleCard
        autoOptimization={autoOptimization}
        optimizationFrequency={optimizationFrequency}
        onAutoOptimizationChange={setAutoOptimization}
        onFrequencyChange={setOptimizationFrequency}
      />

      <BidManagementCard
        autoBidding={autoBidding}
        bidAdjustmentRange={bidAdjustmentRange}
        performanceThreshold={performanceThreshold}
        onAutoBiddingChange={setAutoBidding}
        onBidAdjustmentChange={setBidAdjustmentRange}
        onPerformanceThresholdChange={setPerformanceThreshold}
      />

      <KeywordDiscoveryCard
        autoKeywords={autoKeywords}
        onAutoKeywordsChange={setAutoKeywords}
      />

      <AutoPausingCard
        autoPausing={autoPausing}
        pauseThreshold={pauseThreshold}
        onAutoPausingChange={setAutoPausing}
        onPauseThresholdChange={setPauseThreshold}
      />

      <BudgetManagementCard
        budgetAdjustment={budgetAdjustment}
        budgetIncrease={budgetIncrease}
        onBudgetAdjustmentChange={setBudgetAdjustment}
        onBudgetIncreaseChange={setBudgetIncrease}
      />

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={loading || !selectedConnectionId}
          className="px-8"
        >
          {loading ? 'Saving...' : 'Save Automation Preferences'}
        </Button>
      </div>

      {preferences?.last_optimization_run && (
        <OptimizationStatus lastOptimizationRun={preferences.last_optimization_run} />
      )}
    </div>
  );
};

export default AutomationPreferences;
