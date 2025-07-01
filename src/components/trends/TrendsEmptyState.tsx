
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Connection } from '@/types/common';

interface TrendsEmptyStateProps {
  connections: Connection[];
}

const TrendsEmptyState = ({ connections }: TrendsEmptyStateProps) => {
  const navigate = useNavigate();

  const handleConnect = () => {
    navigate('/settings');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Trends</h2>
        <p className="text-gray-600">
          Analyze your campaign performance trends over time
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <TrendingUp className="h-5 w-5" />
            No Trend Data Available
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-white">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {connections.length === 0 
                ? "Connect your advertising account to start viewing performance trends and analytics."
                : "No historical data available yet. Trends will appear once you have campaign data over multiple time periods."
              }
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={handleConnect}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {connections.length === 0 ? 'Connect Account' : 'View Settings'}
            </Button>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendsEmptyState;
