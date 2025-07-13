import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  MousePointer, 
  Eye, 
  ShoppingCart,
  Target,
  BarChart3,
  Activity
} from "lucide-react";
import { CampaignMetrics } from "@/hooks/useCampaignMetrics";

interface PerformanceMetricCardsProps {
  metrics: CampaignMetrics | null;
  loading?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

const formatPercentage = (num: number) => {
  return `${num.toFixed(2)}%`;
};

export const PerformanceMetricCards = ({ metrics, loading }: PerformanceMetricCardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-gray-200 rounded w-20 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="col-span-full">
          <CardContent className="flex items-center justify-center h-24">
            <p className="text-muted-foreground">No campaign data available. Connect your Amazon account and sync your campaigns.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getAcosColor = (acos: number) => {
    if (acos <= 15) return "bg-green-100 text-green-800";
    if (acos <= 30) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getRoasColor = (roas: number) => {
    if (roas >= 4) return "bg-green-100 text-green-800";
    if (roas >= 2) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Spend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalSpend)}</div>
          <p className="text-xs text-muted-foreground">
            {formatNumber(metrics.campaignCount)} active campaigns
          </p>
        </CardContent>
      </Card>

      {/* Total Sales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalSales)}</div>
          <p className="text-xs text-muted-foreground">
            {formatNumber(metrics.totalOrders)} orders
          </p>
        </CardContent>
      </Card>

      {/* ACOS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ACOS</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(metrics.acos)}</div>
          <Badge className={`text-xs ${getAcosColor(metrics.acos)}`}>
            {metrics.acos <= 15 ? 'Excellent' : metrics.acos <= 30 ? 'Good' : 'High'}
          </Badge>
        </CardContent>
      </Card>

      {/* ROAS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ROAS</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.roas.toFixed(2)}x</div>
          <Badge className={`text-xs ${getRoasColor(metrics.roas)}`}>
            {metrics.roas >= 4 ? 'Excellent' : metrics.roas >= 2 ? 'Good' : 'Low'}
          </Badge>
        </CardContent>
      </Card>

      {/* Total Clicks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          <MousePointer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalClicks)}</div>
          <p className="text-xs text-muted-foreground">
            {formatPercentage(metrics.ctr)} CTR
          </p>
        </CardContent>
      </Card>

      {/* Total Impressions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Impressions</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalImpressions)}</div>
          <p className="text-xs text-muted-foreground">
            Total ad views
          </p>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(metrics.conversionRate)}</div>
          <p className="text-xs text-muted-foreground">
            Click to order rate
          </p>
        </CardContent>
      </Card>

      {/* Average Order Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.totalOrders > 0 
              ? formatCurrency(metrics.totalSales / metrics.totalOrders)
              : formatCurrency(0)
            }
          </div>
          <p className="text-xs text-muted-foreground">
            Per order
          </p>
        </CardContent>
      </Card>
    </div>
  );
};