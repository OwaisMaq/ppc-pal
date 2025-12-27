import { Settings2, CheckCircle2, Clock, Sparkles } from "lucide-react";

const optimizations = [
  { 
    time: "2:34 AM", 
    action: "Reduced bid on 'cheap yoga mat' by 20%",
    reason: "ACOS exceeded 45% threshold",
    saved: "$4.20"
  },
  { 
    time: "6:12 AM", 
    action: "Increased bid on 'premium exercise mat' by 15%",
    reason: "Conversion rate above 15%",
    impact: "+12 sales"
  },
  { 
    time: "9:45 AM", 
    action: "Paused keyword 'free workout equipment'",
    reason: "No conversions after 80 clicks",
    saved: "$28.40"
  },
];

export const OptimizePreview = () => {
  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Overnight Activity</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-xs rounded-full">
          <Sparkles className="h-3 w-3" />
          3 optimizations
        </span>
      </div>
      
      {/* Timeline */}
      <div className="space-y-3">
        {optimizations.map((opt, i) => (
          <div key={i} className="relative pl-4 pb-3 border-l-2 border-border last:border-l-0 last:pb-0">
            <div className="absolute left-[-5px] top-0 h-2 w-2 rounded-full bg-emerald-500" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{opt.time}</span>
                {opt.saved && (
                  <span className="text-[10px] font-medium text-emerald-600">Saved {opt.saved}</span>
                )}
                {opt.impact && (
                  <span className="text-[10px] font-medium text-primary">{opt.impact}</span>
                )}
              </div>
              <p className="text-xs font-medium">{opt.action}</p>
              <p className="text-[10px] text-muted-foreground">{opt.reason}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="flex items-center justify-between p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-medium">All optimizations applied</span>
        </div>
        <span className="text-xs text-emerald-600 font-medium">$32.60 saved</span>
      </div>
    </div>
  );
};
