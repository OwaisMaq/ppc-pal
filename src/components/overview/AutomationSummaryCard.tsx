import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import { Bot, CheckCircle2, XCircle, SkipForward, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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
            <Bot className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No automation runs yet</p>
            <Link to="/automate" className="text-sm text-primary hover:underline mt-1">
              Configure automation
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
            <Bot className="h-5 w-5 text-primary" />
            Automation Summary
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
          {/* Applied */}
          <div className="p-3 rounded-lg border bg-success/5 border-success/20">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Applied</span>
            </div>
            <p className="text-2xl font-bold text-success">{summary.actionsApplied}</p>
          </div>
          
          {/* Prevented */}
          <div className="p-3 rounded-lg border bg-warning/5 border-warning/20">
            <div className="flex items-center gap-1.5 mb-1">
              <XCircle className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-muted-foreground">Prevented</span>
            </div>
            <p className="text-2xl font-bold text-warning">{summary.actionsPrevented}</p>
          </div>
          
          {/* Skipped */}
          <div className="p-3 rounded-lg border bg-muted">
            <div className="flex items-center gap-1.5 mb-1">
              <SkipForward className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Skipped</span>
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{summary.actionsSkipped}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {summary.rulesEvaluated} rules evaluated in last cycle
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
                    applied: { icon: CheckCircle2, color: 'text-success' },
                    prevented: { icon: XCircle, color: 'text-warning' },
                    skipped: { icon: SkipForward, color: 'text-muted-foreground' }
                  };
                  const { icon: StatusIcon, color } = statusConfig[action.status];
                  
                  return (
                    <div key={action.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm">
                      <StatusIcon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{action.type}</p>
                        <p className="text-xs text-muted-foreground truncate">{action.target}</p>
                        {action.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{action.reason}</p>
                        )}
                      </div>
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