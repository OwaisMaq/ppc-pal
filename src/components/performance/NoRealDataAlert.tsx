
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Settings, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NoRealDataAlertProps {
  title?: string;
  description?: string;
  showSyncButton?: boolean;
}

const NoRealDataAlert = ({ 
  title = "No Real Amazon API Data Available",
  description = "No real campaign data from Amazon API is available. Only real Amazon API data will be displayed - no simulated data is shown.",
  showSyncButton = true
}: NoRealDataAlertProps) => {
  const navigate = useNavigate();

  return (
    <Alert variant="destructive" className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-700">
        <div className="space-y-4">
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm mt-1">{description}</p>
          </div>
          
          <div className="bg-red-100 p-3 rounded-md">
            <p className="text-sm font-medium text-red-800 mb-2">Common Reasons:</p>
            <ul className="text-xs text-red-700 space-y-1">
              <li>• Campaigns are too new (Amazon data appears 24-48 hours after activity)</li>
              <li>• No active campaigns with performance metrics</li>
              <li>• Amazon account lacks advertising permissions</li>
              <li>• Data sync is not working properly</li>
            </ul>
          </div>
          
          {showSyncButton && (
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => navigate('/settings')}
                variant="outline" 
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <Settings className="h-4 w-4 mr-2" />
                Check Connection
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
              <Button 
                onClick={() => window.open('https://advertising.amazon.com', '_blank')}
                variant="outline" 
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Amazon Ads Console
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default NoRealDataAlert;
