
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TrendsDataAlertProps {
  hasSimulatedData: boolean;
  dataSourceInfo: string;
}

const TrendsDataAlert = ({ hasSimulatedData, dataSourceInfo }: TrendsDataAlertProps) => {
  if (!hasSimulatedData) return null;

  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {dataSourceInfo}. Consider reconnecting your Amazon account if you continue to see simulated data.
      </AlertDescription>
    </Alert>
  );
};

export default TrendsDataAlert;
