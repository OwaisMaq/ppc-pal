
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SyncProgress {
  isActive: boolean;
  progress: number;
  currentStep: string;
  estimatedTimeRemaining: number;
}

export const useSyncProgress = () => {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isActive: false,
    progress: 0,
    currentStep: '',
    estimatedTimeRemaining: 0
  });
  const { toast } = useToast();

  const startSync = (connectionId: string) => {
    setSyncProgress({
      isActive: true,
      progress: 0,
      currentStep: 'Validating Amazon connection...',
      estimatedTimeRemaining: 45
    });

    // Simulate sync progress steps
    const steps = [
      { step: 'Validating Amazon connection...', progress: 10, time: 5 },
      { step: 'Fetching campaign data from Amazon API...', progress: 30, time: 15 },
      { step: 'Processing campaign information...', progress: 60, time: 10 },
      { step: 'Fetching performance metrics...', progress: 80, time: 10 },
      { step: 'Finalizing data sync...', progress: 95, time: 5 },
      { step: 'Sync completed!', progress: 100, time: 0 }
    ];

    let currentStepIndex = 0;
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        const currentStepData = steps[currentStepIndex];
        setSyncProgress(prev => ({
          ...prev,
          progress: currentStepData.progress,
          currentStep: currentStepData.step,
          estimatedTimeRemaining: currentStepData.time
        }));
        currentStepIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setSyncProgress(prev => ({ ...prev, isActive: false }));
        }, 2000);
      }
    }, 3000);

    return interval;
  };

  const stopSync = () => {
    setSyncProgress({
      isActive: false,
      progress: 0,
      currentStep: '',
      estimatedTimeRemaining: 0
    });
  };

  return {
    syncProgress,
    startSync,
    stopSync
  };
};
