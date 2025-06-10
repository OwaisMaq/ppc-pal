
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdvertisingData } from "@/pages/Index";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

interface OptimizationResultsProps {
  originalData: AdvertisingData;
  optimizedData: AdvertisingData;
}

const OptimizationResults = ({ originalData, optimizedData }: OptimizationResultsProps) => {
  const calculateChanges = () => {
    const changes = {
      bidIncreases: 0,
      bidDecreases: 0,
      keywordsRemoved: 0,
      keywordsAdded: 0,
      avgBidChange: 0
    };

    // Compare keywords for changes
    const originalKeywords = originalData.keywords || [];
    const optimizedKeywords = optimizedData.keywords || [];

    changes.keywordsRemoved = Math.max(0, originalKeywords.length - optimizedKeywords.length);
    changes.keywordsAdded = Math.max(0, optimizedKeywords.length - originalKeywords.length);

    // Simulate bid changes for demonstration
    let totalBidChange = 0;
    let bidChanges = 0;

    optimizedKeywords.forEach((keyword: any, index: number) => {
      const original = originalKeywords[index];
      if (original) {
        const originalBid = parseFloat(original.bid || original.Bid || original['Max CPC'] || '0');
        const optimizedBid = parseFloat(keyword.bid || keyword.Bid || keyword['Max CPC'] || '0');
        
        if (optimizedBid > originalBid) {
          changes.bidIncreases++;
          totalBidChange += (optimizedBid - originalBid);
          bidChanges++;
        } else if (optimizedBid < originalBid) {
          changes.bidDecreases++;
          totalBidChange += (optimizedBid - originalBid);
          bidChanges++;
        }
      }
    });

    changes.avgBidChange = bidChanges > 0 ? totalBidChange / bidChanges : 0;

    return changes;
  };

  const changes = calculateChanges();

  const metrics = [
    {
      label: "Bid Increases",
      value: changes.bidIncreases,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      label: "Bid Decreases", 
      value: changes.bidDecreases,
      icon: TrendingDown,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      label: "Keywords Removed",
      value: changes.keywordsRemoved,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100"
    },
    {
      label: "Optimizations Applied",
      value: changes.bidIncreases + changes.bidDecreases + changes.keywordsRemoved,
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${metric.bgColor} mb-2`}>
              <metric.icon className={`h-6 w-6 ${metric.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
            <div className="text-sm text-gray-600">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Optimization Summary</h4>
              <p className="text-sm text-gray-600">
                AI analysis completed with {metrics[3].value} total optimizations applied
              </p>
            </div>
            <Badge className="bg-green-600 text-white">
              Ready to Download
            </Badge>
          </div>
          
          {changes.avgBidChange !== 0 && (
            <div className="mt-4 p-3 bg-white rounded border">
              <p className="text-sm">
                <span className="font-medium">Average Bid Change:</span>{' '}
                <span className={changes.avgBidChange > 0 ? 'text-green-600' : 'text-red-600'}>
                  {changes.avgBidChange > 0 ? '+' : ''}${changes.avgBidChange.toFixed(2)}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">AI Recommendations Applied:</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Increased bids on high-performing keywords
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Reduced bids on underperforming keywords
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Removed keywords with poor conversion rates
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Optimized match types for better targeting
          </li>
        </ul>
      </div>
    </div>
  );
};

export default OptimizationResults;
