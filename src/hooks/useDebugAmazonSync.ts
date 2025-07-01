
import { useState } from 'react';

interface DebugInfo {
  status: string;
  lastSync: string | null;
  errors: string[];
  connectionCount: number;
}

interface DebugStep {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  data?: any;
}

export const useDebugAmazonSync = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    status: 'not_connected',
    lastSync: null,
    errors: ['Amazon functionality has been removed'],
    connectionCount: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);

  const refreshDebugInfo = async () => {
    setIsLoading(true);
    
    // Since Amazon functionality has been removed, return disconnected state
    setTimeout(() => {
      setDebugInfo({
        status: 'not_connected',
        lastSync: null,
        errors: ['Amazon functionality has been removed'],
        connectionCount: 0
      });
      setIsLoading(false);
    }, 1000);
  };

  const clearErrors = () => {
    setDebugInfo(prev => ({ ...prev, errors: [] }));
  };

  const runDebugSync = async () => {
    setIsDebugging(true);
    setDebugSteps([
      {
        step: 'Connection Check',
        status: 'error',
        message: 'Amazon functionality has been removed',
        details: 'This feature is no longer available',
        data: { removed: true }
      }
    ]);
    
    setTimeout(() => {
      setIsDebugging(false);
    }, 1000);
  };

  const clearDebugSteps = () => {
    setDebugSteps([]);
  };

  return {
    debugInfo,
    isLoading,
    refreshDebugInfo,
    clearErrors,
    debugSteps,
    isDebugging,
    runDebugSync,
    clearDebugSteps
  };
};
