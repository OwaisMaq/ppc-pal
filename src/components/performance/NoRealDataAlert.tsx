
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NoRealDataAlertProps {
  title?: string;
  description?: string;
  showSyncButton?: boolean;
}

const NoRealDataAlert = ({ 
  title = "No Real Data Available",
  description = "All campaign data is simulated. Real data from Amazon API is required to display accurate metrics.",
  showSyncButton = true
}: NoRealDataAlertProps) => {
  const navigate = useNavigate();

  return (
    <Alert variant="destructive" className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-700">
        <div className="space-y-3">
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm mt-1">{description}</p>
          </div>
          {showSyncButton && (
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/settings')}
                variant="outline" 
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <Settings className="h-4 w-4 mr-2" />
                Check Connections
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline" 
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Sync
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default NoRealDataAlert;
