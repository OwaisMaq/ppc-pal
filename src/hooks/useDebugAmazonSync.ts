
import { useState } from 'react';

interface DebugInfo {
  status: string;
  lastSync: string | null;
  errors: string[];
  connectionCount: number;
}

export const useDebugAmazonSync = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    status: 'not_connected',
    lastSync: null,
    errors: [],
    connectionCount: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const refreshDebugInfo = async () => {
    setIsLoading(true);
    
    // Mock debug info
    setTimeout(() => {
      setDebugInfo({
        status: 'connected',
        lastSync: new Date().toISOString(),
        errors: [],
        connectionCount: 1
      });
      setIsLoading(false);
    }, 1000);
  };

  const clearErrors = () => {
    setDebugInfo(prev => ({ ...prev, errors: [] }));
  };

  return {
    debugInfo,
    isLoading,
    refreshDebugInfo,
    clearErrors
  };
};
