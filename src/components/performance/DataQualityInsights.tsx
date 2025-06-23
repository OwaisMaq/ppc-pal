
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Database, Activity, AlertCircle } from "lucide-react";

interface DataQualityInsightsProps {
  dataQuality: any;
  recommendations: string[];
}

const DataQualityInsights = ({ dataQuality, recommendations }: DataQualityInsightsProps) => {
  if (!dataQuality) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Info className="h-5 w-5" />
          Data Quality Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Total Campaigns</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{dataQuality.totalCampaigns}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Real API Data</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{dataQuality.realDataCampaigns}</div>
          </div>
          
          {dataQuality.debugInfo && (
            <>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">With Metrics</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{dataQuality.debugInfo.campaignsWithMetrics}</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Database className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">From API</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{dataQuality.debugInfo.campaignsFromAPI}</div>
              </div>
            </>
          )}
        </div>

        {/* Data Source Breakdown */}
        {Object.keys(dataQuality.dataSourceBreakdown).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-2">Data Sources:</h4>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(dataQuality.dataSourceBreakdown).map(([source, count]) => (
                <Badge 
                  key={source} 
                  variant={source === 'api' ? 'default' : 'secondary'}
                  className={source === 'api' ? 'bg-green-100 text-green-800' : ''}
                >
                  {source}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Debug Information */}
        {dataQuality.debugInfo && (
          <div className="bg-blue-100 p-3 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Debug Information:</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <div>• Campaigns with performance metrics: {dataQuality.debugInfo.campaignsWithMetrics}</div>
              <div>• Campaigns from Amazon API: {dataQuality.debugInfo.campaignsFromAPI}</div>
              <div>• Empty campaigns (no metrics): {dataQuality.debugInfo.emptyCampaigns}</div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-blue-500 mt-1">•</span>
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
