import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import { Bot, CheckCircle2, XCircle, Lightbulb, ChevronDown, ChevronRight, Clock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { LogicChip } from "@/components/ui/LogicChip";

interface AutomationCycleSummary {
  lastRunAt?: string;
  rulesEvaluated: number;
  actionsApplied: number;
  actionsPrevented: number;
  actionsSkipped: number;
  recentActions?: {
    id: string;
    type: string;
    target: string;
    status: 'applied' | 'prevented' | 'skipped';
    reason?: string;
  }[];
}

interface AutomationSummaryCardProps {
  summary: AutomationCycleSummary | null;
  loading?: boolean;
}

export const AutomationSummaryCard = ({ summary, loading }: AutomationSummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <ShieldCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No protection runs yet</p>
            <Link to="/automate" className="text-sm text-primary hover:underline mt-1">
              Configure protection rules
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasRecentActions = summary.recentActions && summary.recentActions.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Protection Summary
          </CardTitle>
          {summary.lastRunAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(summary.lastRunAt), { addSuffix: true })}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {/* Protected - Primary outcome */}
          <div className="p-3 rounded-lg border border-success/30 bg-success/5">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Applied</span>
            </div>
            <p className="text-2xl font-display font-bold text-success">{summary.actionsApplied}</p>
          </div>
          
          {/* Prevented */}
          <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
            <div className="flex items-center gap-1.5 mb-1">
              <XCircle className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-muted-foreground">Prevented</span>
            </div>
            <p className="text-2xl font-display font-bold text-warning">{summary.actionsPrevented}</p>
          </div>
          
          {/* Suggested */}
          <div className="p-3 rounded-lg border border-info/30 bg-info/5">
            <div className="flex items-center gap-1.5 mb-1">
              <Lightbulb className="h-4 w-4 text-info" />
              <span className="text-xs font-medium text-muted-foreground">Suggested</span>
            </div>
            <p className="text-2xl font-display font-bold text-info">{summary.actionsSkipped}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {summary.rulesEvaluated} protection rules evaluated
        </p>

        {hasRecentActions && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger className="w-full flex items-center justify-center gap-1 p-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50">
              View recent actions
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {summary.recentActions?.map((action) => {
                  const statusConfig = {
                    applied: { icon: CheckCircle2, color: 'text-success', dotColor: 'bg-success' },
                    prevented: { icon: XCircle, color: 'text-warning', dotColor: 'bg-warning' },
                    skipped: { icon: Lightbulb, color: 'text-info', dotColor: 'bg-info' }
                  };
                  const { icon: StatusIcon, color, dotColor } = statusConfig[action.status];
                  
                  return (
                    <div key={action.id} className="p-3 rounded-lg border border-border bg-card text-sm">
                      <div className="flex items-start gap-2 mb-2">
                        <div className={cn("status-dot mt-1.5", dotColor)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{action.type}</p>
                            <StatusIcon className={cn("h-4 w-4 flex-shrink-0", color)} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{action.target}</p>
                        </div>
                      </div>
                      {action.reason && (
                        <LogicChip
                          trigger="Rule"
                          action={action.reason}
                          variant="compact"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <Link 
          to="/automate"
          className="flex items-center justify-center gap-1 p-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View full history
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
};
