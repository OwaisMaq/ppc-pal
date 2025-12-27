import { Eye, Activity, RefreshCw, Zap } from "lucide-react";

const liveMetrics = [
  { label: "Impressions", value: "12,847", change: "+342" },
  { label: "Clicks", value: "487", change: "+23" },
  { label: "Spend", value: "$124.50", change: "+$8.20" },
  { label: "Orders", value: "18", change: "+2" },
];

export const AnalyzePreview = () => {
  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Real-Time Metrics</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <Activity className="h-3 w-3" />
          <span>Live</span>
        </div>
      </div>
      
      {/* Live feed simulation */}
      <div className="relative h-20 bg-muted/30 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-end px-2 pb-2">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="flex-1 mx-0.5 bg-primary/60 rounded-t animate-pulse"
              style={{ 
                height: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded">
          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
          Updating...
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {liveMetrics.map((metric, i) => (
          <div key={i} className="p-2 bg-muted/50 rounded-lg">
            <p className="text-[10px] text-muted-foreground">{metric.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium">{metric.value}</span>
              <span className="text-[10px] text-emerald-600">{metric.change}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Data freshness */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
        <Zap className="h-3.5 w-3.5 text-emerald-600" />
        <span>Data updates every 15 minutes</span>
      </div>
    </div>
  );
};
