
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Info, Clock, RefreshCw, Settings, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DataQualityInsightsProps {
  dataQuality: {
    hasRealData: boolean;
    realDataCampaigns: number;
    totalCampaigns: number;
    simulatedCampaigns: number;
    dataSourceBreakdown: Record<string, number>;
    apiDataQuality?: 'excellent' | 'good' | 'poor' | 'none';
    lastRealDataUpdate?: string;
    syncIssues?: string[];
  };
  recommendations: string[];
}

const DataQualityInsights = ({ dataQuality, recommendations }: DataQualityInsightsProps) => {
  const navigate = useNavigate();
  
  const getStatusIcon = () => {
    switch (dataQuality.apiDataQuality) {
      case 'excellent':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'good':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'poor':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'none':
      default:
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (dataQuality.apiDataQuality) {
      case 'excellent':
        return "text-green-700 bg-green-50 border-green-200";
      case 'good':
        return "text-blue-700 bg-blue-50 border-blue-200";
      case 'poor':
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case 'none':
      default:
        return "text-red-700 bg-red-50 border-red-200";
    }
  };

  const getDataQualityMessage = () => {
    switch (dataQuality.apiDataQuality) {
      case 'excellent':
        return `Excellent data quality: ${dataQuality.realDataCampaigns} of ${dataQuality.totalCampaigns} campaigns have real Amazon API data`;
      case 'good':
        return `Good data quality: ${dataQuality.realDataCampaigns} of ${dataQuality.totalCampaigns} campaigns have real API data`;
      case 'poor':
        return `Limited data quality: Only ${dataQuality.realDataCampaigns} of ${dataQuality.totalCampaigns} campaigns have real API data`;
      case 'none':
      default:
        return "No real Amazon API data found - using simulated data for development purposes";
    }
  };

  const getDataFreshness = () => {
    if (!dataQuality.lastRealDataUpdate) return null;
    
    const updateTime = new Date(dataQuality.lastRealDataUpdate);
    const hoursAgo = Math.floor((Date.now() - updateTime.getTime()) / (1000 * 60 * 60));
    
    if (hoursAgo < 1) {
      return "Updated within the last hour";
    } else if (hoursAgo < 24) {
      return `Updated ${hoursAgo} hours ago`;
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      return `Updated ${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
    }
  };

  const handleSync = () => {
    navigate('/settings');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Card className={`${getStatusColor()} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          Amazon API Data Quality
          {dataQuality.apiDataQuality && (
            <Badge variant={dataQuality.apiDataQuality === 'excellent' ? 'default' : 
                          dataQuality.apiDataQuality === 'good' ? 'secondary' :
                          dataQuality.apiDataQuality === 'poor' ? 'outline' : 'destructive'}>
              {dataQuality.apiDataQuality.toUpperCase()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium mb-2">{getDataQualityMessage()}</p>
          
          {/* Data freshness indicator */}
          {dataQuality.lastRealDataUpdate && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <Clock className="h-4 w-4" />
              {getDataFreshness()}
            </div>
          )}
          
          {/* Data source breakdown */}
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(dataQuality.dataSourceBreakdown).map(([source, count]) => (
              <Badge 
                key={source} 
                variant={source === 'api' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {source}: {count} campaigns
              </Badge>
            ))}
          </div>
        </div>

        {/* Sync issues */}
        {dataQuality.syncIssues && dataQuality.syncIssues.length > 0 && (
          <div className="bg-white bg-opacity-50 p-3 rounded-md">
            <p className="font-medium text-sm mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Sync Issues Detected:
            </p>
            <ul className="space-y-1">
              {dataQuality.syncIssues.map((issue, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <p className="font-medium text-sm mb-2">Recommendations:</p>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap pt-2">
          {dataQuality.apiDataQuality !== 'excellent' && (
            <Button 
              onClick={handleSync}
              variant="outline" 
              size="sm"
              className="border-current text-current hover:bg-white hover:bg-opacity-20"
            >
              <Settings className="h-4 w-4 mr-2" />
              Improve Data Quality
            </Button>
          )}
          <Button 
            onClick={handleRefresh}
            variant="outline" 
            size="sm"
            className="border-current text-current hover:bg-white hover:bg-opacity-20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataQualityInsights;
