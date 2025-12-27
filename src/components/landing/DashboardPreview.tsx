import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Eye, MousePointerClick, Zap, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";

const metrics = [
  { label: "Spend", value: "$4,231", change: -12, icon: DollarSign, color: "text-blue-500" },
  { label: "Sales", value: "$18,492", change: 23, icon: ShoppingCart, color: "text-emerald-500" },
  { label: "ACOS", value: "22.8%", change: -8, icon: TrendingDown, color: "text-amber-500" },
  { label: "ROAS", value: "4.37x", change: 15, icon: TrendingUp, color: "text-purple-500" },
];

const chartData = [
  { day: 'Mon', sales: 2840, spend: 580 },
  { day: 'Tue', sales: 3200, spend: 620 },
  { day: 'Wed', sales: 2950, spend: 540 },
  { day: 'Thu', sales: 4100, spend: 780 },
  { day: 'Fri', sales: 3800, spend: 720 },
  { day: 'Sat', sales: 4500, spend: 850 },
  { day: 'Sun', sales: 5100, spend: 890 },
];

const campaigns = [
  { name: "Brand - Exact Match", status: "active", spend: "$842", acos: "18.2%", trend: "up" },
  { name: "Product - Broad", status: "warning", spend: "$1,204", acos: "32.1%", trend: "down" },
  { name: "Competitor ASIN", status: "active", spend: "$567", acos: "21.4%", trend: "up" },
];

const recentActions = [
  { action: "Lowered bid", target: "premium headphones", value: "$1.20 → $0.95", time: "2m ago" },
  { action: "Paused keyword", target: "cheap earbuds", value: "High ACoS", time: "5m ago" },
  { action: "Added negative", target: "free shipping", value: "Auto", time: "12m ago" },
];

export const DashboardPreview = () => {
  const maxSales = Math.max(...chartData.map(d => d.sales));
  
  return (
    <div className="bg-background rounded-xl border border-border shadow-2xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex items-center justify-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">PPC Pal — Live Dashboard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-emerald-600 font-medium">Live</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-muted/50 rounded-lg p-3 border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{metric.label}</span>
                <metric.icon className={`h-3.5 w-3.5 ${metric.color}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold font-display">{metric.value}</span>
                <span className={`text-xs font-semibold ${metric.change > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {metric.change > 0 ? '↑' : '↓'}{Math.abs(metric.change)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Main Chart Area */}
          <div className="lg:col-span-3 bg-muted/30 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Performance Overview</h3>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  Sales
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Spend
                </span>
              </div>
            </div>
            
            {/* Chart */}
            <div className="relative h-32">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="border-t border-border/50" />
                ))}
              </div>
              
              {/* Bars */}
              <div className="relative h-full flex items-end gap-2">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-0.5 h-24">
                      <div 
                        className="w-3 bg-primary rounded-t transition-all hover:bg-primary/80"
                        style={{ height: `${(d.sales / maxSales) * 100}%` }}
                      />
                      <div 
                        className="w-3 bg-amber-500/70 rounded-t transition-all hover:bg-amber-500"
                        style={{ height: `${(d.spend / maxSales) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Live Actions Feed */}
          <div className="lg:col-span-2 bg-muted/30 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Live Actions
              </h3>
            </div>
            <div className="space-y-2.5">
              {recentActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-xs animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{action.action}: <span className="text-muted-foreground">{action.target}</span></p>
                    <p className="text-muted-foreground">{action.value}</p>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">{action.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Campaign Table */}
        <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/50">
            <h3 className="text-sm font-semibold">Top Campaigns</h3>
          </div>
          <div className="divide-y divide-border">
            {campaigns.map((campaign, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${campaign.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-sm font-medium truncate">{campaign.name}</span>
                  </div>
                </div>
                <div className="text-xs text-right">
                  <p className="font-medium">{campaign.spend}</p>
                  <p className="text-muted-foreground">spend</p>
                </div>
                <div className="text-xs text-right">
                  <p className={`font-medium ${campaign.trend === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {campaign.acos}
                  </p>
                  <p className="text-muted-foreground">ACoS</p>
                </div>
                {campaign.status === 'warning' && (
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom Stats */}
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { icon: Eye, value: "124,847", label: "Impressions" },
            { icon: MousePointerClick, value: "3,847", label: "Clicks" },
            { icon: ShoppingCart, value: "412", label: "Orders" },
            { icon: TrendingUp, value: "10.7%", label: "CVR" },
          ].map((stat, i) => (
            <div key={i} className="text-xs bg-muted/30 rounded-lg p-2 border border-border">
              <stat.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="font-semibold">{stat.value}</p>
              <p className="text-muted-foreground text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
