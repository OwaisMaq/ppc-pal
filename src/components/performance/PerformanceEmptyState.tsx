
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AmazonConnection } from '@/lib/amazon/types';

interface PerformanceEmptyStateProps {
  connections: AmazonConnection[];
  getFilteredDescription: () => string;
}

const PerformanceEmptyState = ({ connections, getFilteredDescription }: PerformanceEmptyStateProps) => {
  const navigate = useNavigate();

  const handleAddConnection = () => {
    navigate('/settings');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">
          Campaign performance metrics from Amazon API{getFilteredDescription()}
        </p>
      </div>

      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertCircle className="h-5 w-5" />
            No Campaign Data Available
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-white">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {connections.length === 0 
                ? "You haven't connected any Amazon Advertising accounts yet. Connect your account to start viewing performance metrics."
                : "Your Amazon connection is set up but no campaign data has been synced yet. This could mean your account has no active campaigns or the sync process hasn't completed."
              }
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 flex-wrap">
            {connections.length === 0 ? (
              <Button 
                onClick={handleAddConnection}
                variant="default"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Amazon Account
              </Button>
            ) : (
              <Button 
                onClick={handleAddConnection}
                variant="default"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Data
              </Button>
            )}
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>

          <div className="text-sm text-orange-700">
            <p className="font-medium mb-2">Getting started:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ensure you have an active Amazon Advertising account</li>
              <li>Make sure your advertising campaigns are running</li>
              <li>Allow up to 24 hours for initial data sync</li>
              <li>Contact support if you continue having issues</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceEmptyState;
