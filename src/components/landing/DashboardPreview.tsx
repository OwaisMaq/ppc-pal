import { TrendingUp, TrendingDown, DollarSign, MousePointerClick, Eye, ShoppingCart } from "lucide-react";

const metrics = [
  { label: "Spend", value: "$4,231", change: -12, icon: DollarSign },
  { label: "Sales", value: "$18,492", change: 23, icon: ShoppingCart },
  { label: "ACOS", value: "22.8%", change: -8, icon: TrendingDown },
  { label: "ROAS", value: "4.37x", change: 15, icon: TrendingUp },
];

const chartData = [45, 52, 38, 65, 48, 72, 58, 80, 68, 75, 82, 90];

export const DashboardPreview = () => {
  return (
    <div className="bg-background rounded-lg border border-border shadow-lg overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-muted-foreground">PPC Pal — Dashboard</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-muted/50 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{metric.label}</span>
                <metric.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold font-display">{metric.value}</span>
                <span className={`text-xs font-medium ${metric.change > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Mini Chart */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium">Sales Trend (7 days)</span>
            <span className="text-xs text-emerald-600 font-medium">+23% vs last week</span>
          </div>
          <div className="flex items-end gap-1 h-16">
            {chartData.map((value, i) => (
              <div 
                key={i} 
                className="flex-1 bg-primary/80 rounded-t transition-all hover:bg-primary"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="text-xs">
            <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="font-medium">124K</p>
            <p className="text-muted-foreground">Impressions</p>
          </div>
          <div className="text-xs">
            <MousePointerClick className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="font-medium">3,847</p>
            <p className="text-muted-foreground">Clicks</p>
          </div>
          <div className="text-xs">
            <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="font-medium">412</p>
            <p className="text-muted-foreground">Orders</p>
          </div>
        </div>
      </div>
    </div>
  );
};
