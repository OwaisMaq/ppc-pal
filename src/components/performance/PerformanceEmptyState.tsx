
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Settings, RotateCcw } from "lucide-react";
import { AmazonConnection } from "@/lib/amazon/types";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PerformanceEmptyStateProps {
  connections: AmazonConnection[];
  getFilteredDescription: () => string;
}

const PerformanceEmptyState = ({ connections, getFilteredDescription }: PerformanceEmptyStateProps) => {
  const navigate = useNavigate();
  
  // Check if any connections need setup or have errors
  const hasSetupRequired = connections.some(conn => 
    conn.profile_id?.includes('setup_required') || 
    conn.profile_id?.includes('needs_setup')
  );

  const hasLegacyErrors = connections.some(conn => 
    conn.profile_id?.startsWith('profile_') || 
    conn.profile_id === 'unknown' ||
    conn.status === 'error'
  );

  const getAlertContent = () => {
    if (connections.length === 0) {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        message: "No Amazon accounts connected yet. Connect your Amazon Ads account to view performance data.",
        action: (
          <Button 
            onClick={() => navigate('/settings')}
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            <Settings className="h-4 w-4 mr-2" />
            Connect Account
          </Button>
        )
      };
    }

    if (hasSetupRequired) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        message: "Amazon account connected but advertising setup is required. Please set up Amazon Advertising at advertising.amazon.com, then retry profile detection.",
        action: (
          <Button 
            onClick={() => navigate('/settings')}
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry Profile Detection
          </Button>
        )
      };
    }

    if (hasLegacyErrors) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        message: "Some Amazon connections have issues and need to be reconnected. Please check your account connections.",
        action: (
          <Button 
            onClick={() => navigate('/settings')}
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            <Settings className="h-4 w-4 mr-2" />
            Fix Connections
          </Button>
        )
      };
    }

    return {
      icon: <AlertCircle className="h-4 w-4" />,
      message: "No campaign data available yet. Sync your Amazon account to import campaign data.",
      action: (
        <Button 
          onClick={() => navigate('/settings')}
          variant="outline" 
          size="sm" 
          className="mt-3"
        >
          <Settings className="h-4 w-4 mr-2" />
          Sync Data
        </Button>
      )
    };
  };

  const alertContent = getAlertContent();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">
          Overview of your advertising performance metrics{getFilteredDescription()}
        </p>
      </div>

      <Alert>
        {alertContent.icon}
        <AlertDescription>
          <div>
            {alertContent.message}
            {alertContent.action}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PerformanceEmptyState;
