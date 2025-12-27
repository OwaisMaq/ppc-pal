import { BarChart3, PieChart, ArrowUpRight } from "lucide-react";

const campaignData = [
  { name: "SP - Brand", spend: 1240, sales: 5840, acos: 21.2, bar: 85 },
  { name: "SP - Category", spend: 890, sales: 3420, acos: 26.0, bar: 65 },
  { name: "SP - Auto", spend: 650, sales: 2180, acos: 29.8, bar: 50 },
  { name: "SB - Video", spend: 420, sales: 1890, acos: 22.2, bar: 45 },
];

const pieData = [
  { label: "Brand", value: 42, color: "bg-primary" },
  { label: "Category", value: 28, color: "bg-emerald-500" },
  { label: "Auto", value: 18, color: "bg-amber-500" },
  { label: "Video", value: 12, color: "bg-blue-500" },
];

export const AnalyticsPreview = () => {
  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Campaign Performance</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
          <ArrowUpRight className="h-3 w-3" />
          +18% overall
        </span>
      </div>
      
      {/* Bar Chart */}
      <div className="space-y-2">
        {campaignData.map((campaign, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate max-w-[120px]">{campaign.name}</span>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>${campaign.spend}</span>
                <span className={campaign.acos < 25 ? 'text-emerald-600' : 'text-amber-600'}>
                  {campaign.acos}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${campaign.bar}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Spend Distribution */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Spend Distribution</span>
          <PieChart className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-3 flex-1 rounded-full overflow-hidden">
            {pieData.map((segment, i) => (
              <div 
                key={i}
                className={`${segment.color} transition-all`}
                style={{ width: `${segment.value}%` }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {pieData.map((segment, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px]">
              <div className={`w-2 h-2 rounded-full ${segment.color}`} />
              <span className="text-muted-foreground">{segment.label}</span>
              <span className="font-medium">{segment.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
