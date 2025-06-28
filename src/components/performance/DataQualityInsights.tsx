
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

interface DataQualityInsightsProps {
  dataQuality: {
    hasRealData: boolean;
    realDataCampaigns: number;
    totalCampaigns: number;
    simulatedCampaigns: number;
    dataSourceBreakdown: Record<string, number>;
  };
  recommendations: string[];
}

const DataQualityInsights = ({ dataQuality, recommendations }: DataQualityInsightsProps) => {
  const getStatusIcon = () => {
    if (dataQuality.hasRealData && dataQuality.realDataCampaigns === dataQuality.totalCampaigns) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (dataQuality.hasRealData) {
      return <Info className="h-5 w-5 text-blue-600" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
  };

  const getStatusColor = () => {
    if (dataQuality.hasRealData && dataQuality.realDataCampaigns === dataQuality.totalCampaigns) {
      return "text-green-700 bg-green-50 border-green-200";
    } else if (dataQuality.hasRealData) {
      return "text-blue-700 bg-blue-50 border-blue-200";
    } else {
      return "text-orange-700 bg-orange-50 border-orange-200";
    }
  };

  const getDataQualityMessage = () => {
    if (dataQuality.hasRealData && dataQuality.realDataCampaigns === dataQuality.totalCampaigns) {
      return "All data is from real Amazon API sources";
    } else if (dataQuality.hasRealData) {
      return `${dataQuality.realDataCampaigns} of ${dataQuality.totalCampaigns} campaigns have real API data`;
    } else {
      return "Using simulated data for development purposes";
    }
  };

  return (
    <Card className={`${getStatusColor()} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          Data Quality Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium mb-2">{getDataQualityMessage()}</p>
          
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
      </CardContent>
    </Card>
  );
};

export default DataQualityInsights;
