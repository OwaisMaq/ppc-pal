
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, TrendingUp } from "lucide-react";

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
  const { hasRealData, realDataCampaigns, totalCampaigns, dataSourceBreakdown } = dataQuality;

  const getDataQualityStatus = () => {
    if (realDataCampaigns === 0) {
      return {
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        status: 'No Real Data',
        description: 'No real Amazon API data available'
      };
    } else if (realDataCampaigns === totalCampaigns) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        status: 'Excellent Data Quality',
        description: 'All campaigns have real API data'
      };
    } else {
      return {
        icon: Info,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        status: 'Partial Real Data',
        description: `${realDataCampaigns} of ${totalCampaigns} campaigns have real data`
      };
    }
  };

  const qualityStatus = getDataQualityStatus();
  const Icon = qualityStatus.icon;

  return (
    <Card className={`${qualityStatus.borderColor} ${qualityStatus.bgColor}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className={`h-4 w-4 ${qualityStatus.color}`} />
          Data Quality Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{qualityStatus.status}</span>
            <Badge variant={hasRealData ? "default" : "secondary"} className="text-xs">
              {hasRealData ? "Real Data Available" : "No Real Data"}
            </Badge>
          </div>
          <p className={`text-xs ${qualityStatus.color}`}>
            {qualityStatus.description}
          </p>
        </div>

        {/* Data Source Breakdown */}
        {Object.keys(dataSourceBreakdown).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700">Data Sources</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(dataSourceBreakdown).map(([source, count]) => (
                <div key={source} className="flex justify-between items-center text-xs">
                  <span className="capitalize">
                    {source === 'api' ? 'Real API' : source}:
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start gap-1">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progress Bar */}
        {totalCampaigns > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Data Coverage</span>
              <span>{Math.round((realDataCampaigns / totalCampaigns) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  realDataCampaigns === totalCampaigns ? 'bg-green-500' : 
                  realDataCampaigns > 0 ? 'bg-blue-500' : 'bg-red-500'
                }`}
                style={{ width: `${(realDataCampaigns / totalCampaigns) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataQualityInsights;
