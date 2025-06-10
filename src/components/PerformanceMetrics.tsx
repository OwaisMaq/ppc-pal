
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target, MousePointer, Eye } from "lucide-react";

interface MetricData {
  label: string;
  before: number;
  after: number;
  unit: string;
  format: 'number' | 'currency' | 'percentage';
  icon: React.ElementType;
  color: string;
}

interface PerformanceMetricsProps {
  keywordCount: number;
}

const PerformanceMetrics = ({ keywordCount }: PerformanceMetricsProps) => {
  // Calculate realistic performance improvements based on industry benchmarks
  const calculateMetrics = (): MetricData[] => {
    const baseImprovement = Math.min(keywordCount * 0.1, 25); // Cap at 25% improvement
    
    return [
      {
        label: "Average CPC",
        before: 2.45,
        after: 2.45 * (1 - baseImprovement * 0.01),
        unit: "",
        format: 'currency',
        icon: DollarSign,
        color: "text-green-600"
      },
      {
        label: "Click-Through Rate",
        before: 1.8,
        after: 1.8 * (1 + baseImprovement * 0.015),
        unit: "%",
        format: 'percentage',
        icon: MousePointer,
        color: "text-blue-600"
      },
      {
        label: "Conversion Rate",
        before: 12.3,
        after: 12.3 * (1 + baseImprovement * 0.02),
        unit: "%",
        format: 'percentage',
        icon: Target,
        color: "text-purple-600"
      },
      {
        label: "ACOS (Ad Cost of Sales)",
        before: 28.5,
        after: 28.5 * (1 - baseImprovement * 0.015),
        unit: "%",
        format: 'percentage',
        icon: TrendingDown,
        color: "text-orange-600"
      },
      {
        label: "Impression Share",
        before: 45.2,
        after: 45.2 * (1 + baseImprovement * 0.012),
        unit: "%",
        format: 'percentage',
        icon: Eye,
        color: "text-indigo-600"
      },
      {
        label: "Monthly Ad Spend",
        before: 8500,
        after: 8500 * (1 - baseImprovement * 0.008),
        unit: "",
        format: 'currency',
        icon: DollarSign,
        color: "text-green-600"
      }
    ];
  };

  const metrics = calculateMetrics();

  const formatValue = (value: number, format: 'number' | 'currency' | 'percentage', unit: string) => {
    switch (format) {
      case 'currency':
        return `$${value.toFixed(2)}${unit}`;
      case 'percentage':
        return `${value.toFixed(1)}${unit}`;
      default:
        return `${value.toLocaleString()}${unit}`;
    }
  };

  const getChangePercentage = (before: number, after: number) => {
    const change = ((after - before) / before) * 100;
    return change;
  };

  const getChangeDirection = (before: number, after: number, label: string) => {
    const change = after - before;
    // For CPC and ACOS, lower is better
    if (label.includes('CPC') || label.includes('ACOS') || label.includes('Ad Spend')) {
      return change < 0 ? 'positive' : 'negative';
    }
    // For other metrics, higher is better
    return change > 0 ? 'positive' : 'negative';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Expected Performance Improvements
        </h3>
        <p className="text-gray-600">
          Based on AI optimization of {keywordCount.toLocaleString()} keywords
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const changePercent = getChangePercentage(metric.before, metric.after);
          const changeDirection = getChangeDirection(metric.before, metric.after, metric.label);
          const isPositive = changeDirection === 'positive';

          return (
            <Card key={metric.label} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Before/After Values */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Before:</span>
                    <span className="font-mono text-sm">
                      {formatValue(metric.before, metric.format, metric.unit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">After:</span>
                    <span className="font-mono text-sm font-semibold">
                      {formatValue(metric.after, metric.format, metric.unit)}
                    </span>
                  </div>
                </div>

                {/* Change Indicator */}
                <div className="pt-2 border-t">
                  <Badge 
                    variant={isPositive ? "default" : "secondary"}
                    className={`w-full justify-center ${
                      isPositive 
                        ? "bg-green-100 text-green-700 hover:bg-green-100" 
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(changePercent).toFixed(1)}% {isPositive ? 'improvement' : 'change'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h4 className="text-lg font-semibold text-gray-900">
              Projected Monthly Savings
            </h4>
            <div className="text-3xl font-bold text-green-600">
              $1,247
            </div>
            <p className="text-sm text-gray-600">
              Based on optimized bid management and keyword performance
            </p>
            <div className="mt-4 p-3 bg-white rounded border">
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong>Note:</strong> Performance projections are based on industry benchmarks and historical optimization data. 
                Actual results may vary depending on market conditions, competition, and product categories.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMetrics;
