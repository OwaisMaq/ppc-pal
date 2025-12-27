import { Search, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";

const keywords = [
  { 
    term: "yoga mat thick", 
    acos: 18.2, 
    spend: 142.50, 
    sales: 782.40,
    status: "winner",
    trend: "up"
  },
  { 
    term: "exercise mat home", 
    acos: 24.1, 
    spend: 89.20, 
    sales: 370.00,
    status: "good",
    trend: "up"
  },
  { 
    term: "workout mat cheap", 
    acos: 67.3, 
    spend: 45.80, 
    sales: 68.00,
    status: "warning",
    trend: "down"
  },
  { 
    term: "gym equipment free shipping", 
    acos: 120.5, 
    spend: 38.20, 
    sales: 31.70,
    status: "danger",
    trend: "down"
  },
];

export const KeywordsPreview = () => {
  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Top Search Terms</span>
        </div>
        <span className="text-xs text-muted-foreground">Last 7 days</span>
      </div>
      
      {/* Keywords Table */}
      <div className="space-y-1">
        <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground px-2 py-1">
          <div className="col-span-5">Keyword</div>
          <div className="col-span-2 text-right">ACOS</div>
          <div className="col-span-2 text-right">Spend</div>
          <div className="col-span-2 text-right">Sales</div>
          <div className="col-span-1"></div>
        </div>
        
        {keywords.map((kw, i) => (
          <div 
            key={i} 
            className={`grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg text-xs ${
              kw.status === 'winner' ? 'bg-emerald-500/5 border border-emerald-500/20' :
              kw.status === 'warning' ? 'bg-amber-500/5 border border-amber-500/20' :
              kw.status === 'danger' ? 'bg-red-500/5 border border-red-500/20' :
              'bg-muted/50 border border-border'
            }`}
          >
            <div className="col-span-5 font-medium truncate flex items-center gap-1.5">
              {kw.status === 'winner' && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />}
              {kw.status === 'danger' && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
              <span className="truncate">{kw.term}</span>
            </div>
            <div className={`col-span-2 text-right font-medium ${
              kw.acos < 25 ? 'text-emerald-600' : 
              kw.acos < 50 ? 'text-amber-600' : 'text-red-500'
            }`}>
              {kw.acos}%
            </div>
            <div className="col-span-2 text-right text-muted-foreground">${kw.spend.toFixed(0)}</div>
            <div className="col-span-2 text-right">${kw.sales.toFixed(0)}</div>
            <div className="col-span-1 flex justify-end">
              {kw.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
        <span className="text-muted-foreground">2 keywords need attention</span>
        <span className="text-primary font-medium">View all →</span>
      </div>
    </div>
  );
};
