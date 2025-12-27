import { Zap, Check, Clock, ArrowDown, ArrowUp } from "lucide-react";

const recentActions = [
  { 
    rule: "ACOS > 40%", 
    action: "Bid -15%", 
    target: "yoga mat waterproof", 
    status: "applied",
    time: "2m ago",
    impact: "-$0.23"
  },
  { 
    rule: "Conv. Rate > 12%", 
    action: "Bid +20%", 
    target: "resistance bands set", 
    status: "applied",
    time: "8m ago",
    impact: "+$0.45"
  },
  { 
    rule: "Clicks > 50, Sales = 0", 
    action: "Pause", 
    target: "exercise equipment cheap", 
    status: "pending",
    time: "12m ago",
    impact: "Save $18/day"
  },
];

export const AutomationPreview = () => {
  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Automation Active</p>
            <p className="text-xs text-muted-foreground">3 rules running</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live
        </div>
      </div>
      
      {/* Actions List */}
      <div className="space-y-2">
        {recentActions.map((action, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3 border border-border">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-[10px] font-mono">
                    {action.rule}
                  </span>
                  <span className="text-muted-foreground text-[10px]">→</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                    action.action.includes('+') ? 'bg-emerald-500/10 text-emerald-600' : 
                    action.action.includes('-') ? 'bg-amber-500/10 text-amber-600' : 
                    'bg-red-500/10 text-red-600'
                  }`}>
                    {action.action.includes('+') ? <ArrowUp className="h-2.5 w-2.5" /> : 
                     action.action.includes('-') ? <ArrowDown className="h-2.5 w-2.5" /> : null}
                    {action.action}
                  </span>
                </div>
                <p className="text-xs truncate text-muted-foreground">{action.target}</p>
              </div>
              <div className="text-right shrink-0">
                {action.status === 'applied' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                    <Check className="h-3 w-3" /> Applied
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground">{action.time}</p>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Impact: <span className={action.impact.includes('+') ? 'text-emerald-600' : 'text-amber-600'}>{action.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
