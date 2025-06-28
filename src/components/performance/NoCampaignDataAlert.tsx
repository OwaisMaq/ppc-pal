
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ExternalLink, RefreshCw, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoCampaignDataAlertProps {
  connectionCount: number;
  onSyncData?: () => void;
  isSyncing?: boolean;
}

const NoCampaignDataAlert = ({ 
  connectionCount, 
  onSyncData,
  isSyncing = false 
}: NoCampaignDataAlertProps) => {
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
          No Campaign Data Available
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-white">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {connectionCount === 0 
              ? "You haven't connected any Amazon Advertising accounts yet. Connect your account to start viewing performance metrics."
              : "Your Amazon connection is active, but no campaign data was found. This usually means your Amazon Advertising account doesn't have any active campaigns yet."
            }
          </AlertDescription>
        </Alert>

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

        <div className="text-sm text-orange-700">
          <p className="font-medium mb-2">
            {connectionCount === 0 ? "Getting started:" : "To see performance data:"}
          </p>
          <ul className="list-disc list-inside space-y-1">
            {connectionCount === 0 ? (
              <>
                <li>Connect your Amazon Advertising account</li>
                <li>Create advertising campaigns in Amazon Seller Central or Vendor Central</li>
                <li>Allow campaigns to run and generate performance data</li>
                <li>Return here to view your metrics</li>
              </>
            ) : (
              <>
                <li>Create advertising campaigns in your Amazon Advertising account</li>
                <li>Ensure campaigns are active and have begun generating impressions</li>
                <li>Allow 2-4 hours for initial performance data to appear</li>
                <li>Use the "Re-sync Data" button to refresh after creating campaigns</li>
              </>
            )}
          </ul>
        </div>

        {connectionCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Connection Status:</strong> Your Amazon Advertising account is connected and accessible. 
                The sync process completed successfully, but found 0 campaigns in your account.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NoCampaignDataAlert;
