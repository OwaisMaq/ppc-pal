import { DollarSign, TrendingDown, Ban, Target } from "lucide-react";

const savingsBreakdown = [
  { label: "Wasted clicks eliminated", value: 847, savings: 312.40, icon: Ban },
  { label: "Bid optimizations", value: 234, savings: 189.50, icon: TrendingDown },
  { label: "Paused underperformers", value: 12, savings: 156.20, icon: Target },
];

export const SavingsPreview = () => {
  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-4">
      {/* Hero Metric */}
      <div className="text-center py-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-2">
          <DollarSign className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="text-3xl font-display font-bold text-emerald-600">$658.10</p>
        <p className="text-sm text-muted-foreground">Saved this month</p>
      </div>
      
      {/* Breakdown */}
      <div className="space-y-2">
        {savingsBreakdown.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
                <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.value} actions</p>
              </div>
            </div>
            <span className="text-sm font-medium text-emerald-600">+${item.savings.toFixed(0)}</span>
          </div>
        ))}
      </div>
      
      {/* Projected */}
      <div className="text-center pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">Projected yearly savings</p>
        <p className="text-lg font-display font-semibold">$7,897</p>
      </div>
    </div>
  );
};
