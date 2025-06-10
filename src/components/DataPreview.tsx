
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdvertisingData } from "@/pages/Index";
import { FileSpreadsheet, Users, Target, Hash } from "lucide-react";

interface DataPreviewProps {
  data: AdvertisingData;
}

const DataPreview = ({ data }: DataPreviewProps) => {
  const stats = [
    {
      label: "Portfolios",
      count: data.portfolios?.length || 0,
      icon: FileSpreadsheet,
      color: "bg-blue-100 text-blue-700"
    },
    {
      label: "Campaigns", 
      count: data.campaigns?.length || 0,
      icon: Target,
      color: "bg-green-100 text-green-700"
    },
    {
      label: "Ad Groups",
      count: data.adGroups?.length || 0,
      icon: Users,
      color: "bg-purple-100 text-purple-700"
    },
    {
      label: "Keywords",
      count: data.keywords?.length || 0,
      icon: Hash,
      color: "bg-orange-100 text-orange-700"
    }
  ];

  // Debug: Log the first keyword to see available fields
  if (data.keywords && data.keywords.length > 0) {
    console.log("First keyword object:", data.keywords[0]);
    console.log("Available keyword fields:", Object.keys(data.keywords[0]));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${stat.color} mb-2`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.count.toLocaleString()}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {data.keywords && data.keywords.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Sample Keywords Preview</h4>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.keywords.slice(0, 5).map((keyword: any, index: number) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm font-medium text-gray-700">
                  {keyword['Keyword text'] || keyword.keyword || keyword.Keyword || keyword['Targeting'] || 'N/A'}
                </span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    Bid: ${keyword.Bid || keyword.bid || keyword['Max CPC'] || '0.00'}
                  </Badge>
                  {keyword['Match type'] && (
                    <Badge variant="secondary" className="text-xs">
                      {keyword['Match type'] || keyword.matchType}
                    </Badge>
                  )}
                  {keyword.ACOS && (
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      ACOS: {(parseFloat(keyword.ACOS) * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {data.keywords.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                ...and {data.keywords.length - 5} more keywords
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPreview;
