
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ExternalLink, RefreshCw, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoRealDataAlertProps {
  title?: string;
  description?: string;
  showSyncButton?: boolean;
  connectionCount?: number;
  onSyncData?: () => void;
  isSyncing?: boolean;
}

const NoRealDataAlert = ({ 
  title = "No Real Data Available",
  description = "No real Amazon API data is currently available.",
  showSyncButton = false,
  connectionCount = 0,
  onSyncData,
  isSyncing = false 
}: NoRealDataAlertProps) => {
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  const handleOpenAmazonAds = () => {
    window.open('https://advertising.amazon.com', '_blank');
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Info className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-white">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {description}
          </AlertDescription>
        </Alert>

        {showSyncButton && (
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              {connectionCount === 0 ? (
                <Button 
                  onClick={handleGoToSettings}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Amazon Account
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleOpenAmazonAds}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Create Campaigns in Amazon
                  </Button>
                  <Button 
                    onClick={onSyncData}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Re-sync Data
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NoRealDataAlert;
