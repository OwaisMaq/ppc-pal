
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, RefreshCw, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoRealDataAlertProps {
  title: string;
  description: string;
  showSyncButton?: boolean;
}

const NoRealDataAlert = ({ title, description, showSyncButton = true }: NoRealDataAlertProps) => {
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Info className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-white">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            {description}
          </AlertDescription>
        </Alert>

        {showSyncButton && (
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={handleGoToSettings}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Go to Settings
            </Button>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        )}

        <div className="text-sm text-blue-700">
          <p className="font-medium mb-2">What you can do:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check your Amazon Advertising account for active campaigns</li>
            <li>Ensure your campaigns have recent activity (impressions, clicks, or spend)</li>
            <li>Try re-syncing your Amazon connection from Settings</li>
            <li>Contact support if the issue persists after 24 hours</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default NoRealDataAlert;
