import { Link2, CheckCircle2, Shield, Clock } from "lucide-react";

export const ConnectPreview = () => {
  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Link2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Amazon Ads Connected</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xs text-muted-foreground">Seller Central • NA Marketplace</p>
        </div>
      </div>
      
      {/* Steps completed */}
      <div className="space-y-2">
        {[
          { label: "Account authorized", done: true },
          { label: "Campaigns synced", done: true },
          { label: "Historical data loaded", done: true },
          { label: "Automation ready", done: true },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
          </div>
        ))}
      </div>
      
      {/* Security note */}
      <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg text-xs">
        <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Bank-level encryption</p>
          <p className="text-muted-foreground">Your credentials never touch our servers</p>
        </div>
      </div>
      
      {/* Setup time */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
        <Clock className="h-3.5 w-3.5" />
        <span>Setup takes less than 2 minutes</span>
      </div>
    </div>
  );
};
