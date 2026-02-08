import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditLogTabProps {
  profileId: string;
}

interface RuleRun {
  id: string;
  rule_id: string;
  started_at: string;
  finished_at: string | null;
  status: string | null;
  alerts_created: number | null;
  actions_enqueued: number | null;
  evaluated: number | null;
  error: string | null;
  automation_rules?: { name: string; rule_type: string } | null;
}

interface ActionRecord {
  id: string;
  action_type: string;
  status: string;
  created_at: string | null;
  applied_at: string | null;
  payload: any;
  error: string | null;
  before_state: any;
  rule_id: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
  error: 'bg-destructive/10 text-destructive',
  pending: 'bg-warning/10 text-warning',
  applied: 'bg-success/10 text-success',
  queued: 'bg-muted text-muted-foreground',
  skipped: 'bg-muted text-muted-foreground',
};

export const AuditLogTab: React.FC<AuditLogTabProps> = ({ profileId }) => {
  const [runs, setRuns] = useState<RuleRun[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'runs' | 'actions'>('runs');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);

  const fetchData = async () => {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange);
    const cutoffISO = cutoff.toISOString();
    try {
      const [runsRes, actionsRes] = await Promise.all([
        supabase
          .from('automation_rule_runs')
          .select('*, automation_rules(name, rule_type)')
          .eq('profile_id', profileId)
          .gte('started_at', cutoffISO)
          .order('started_at', { ascending: false })
          .limit(50),
        supabase
          .from('action_queue')
          .select('id, action_type, status, created_at, applied_at, payload, error, before_state, rule_id')
          .eq('profile_id', profileId)
          .gte('created_at', cutoffISO)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (runsRes.data) setRuns(runsRes.data as unknown as RuleRun[]);
      if (actionsRes.data) setActions(actionsRes.data as unknown as ActionRecord[]);
    } catch (err) {
      console.error('Error fetching audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profileId, dateRange]);

  const toggleExpanded = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button variant={view === 'runs' ? 'default' : 'outline'} size="sm" onClick={() => setView('runs')}>
            Rule Runs ({runs.length})
          </Button>
          <Button variant={view === 'actions' ? 'default' : 'outline'} size="sm" onClick={() => setView('actions')}>
            Actions ({actions.length})
          </Button>
        </div>
        <div className="flex gap-1 items-center">
          {([7, 30, 90] as const).map(d => (
            <Button key={d} variant={dateRange === d ? 'default' : 'ghost'} size="sm" className="text-xs px-2" onClick={() => setDateRange(d)}>
              {d}d
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {view === 'runs' ? (
            runs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No rule runs yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {runs.map(run => {
                  const isExpanded = expandedId === run.id;
                  return (
                    <div key={run.id}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleExpanded(run.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                        <span className="font-medium truncate flex-1">
                          {(run.automation_rules as any)?.name || 'Unknown Rule'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {(run.automation_rules as any)?.rule_type || '—'}
                        </Badge>
                        <Badge className={cn('text-xs', STATUS_STYLES[run.status || 'pending'])}>
                          {run.status || 'pending'}
                        </Badge>
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {run.alerts_created ?? 0}a / {run.actions_enqueued ?? 0}q
                        </span>
                        <span className="text-xs text-muted-foreground w-28 text-right">
                          {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-muted/10 border-t border-dashed text-xs space-y-1">
                          <div><span className="text-muted-foreground">Started:</span> {format(new Date(run.started_at), 'PPpp')}</div>
                          {run.finished_at && <div><span className="text-muted-foreground">Finished:</span> {format(new Date(run.finished_at), 'PPpp')}</div>}
                          <div><span className="text-muted-foreground">Evaluated:</span> {run.evaluated ?? '—'}</div>
                          {run.error && <div className="text-destructive">Error: {run.error}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No actions recorded</p>
              </div>
            ) : (
              <div className="divide-y">
                {actions.map(action => {
                  const isExpanded = expandedId === action.id;
                  const payload = action.payload as any;
                  return (
                    <div key={action.id}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleExpanded(action.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                        <span className="font-medium truncate flex-1">
                          {payload?.entity_name || action.action_type}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {action.action_type}
                        </Badge>
                        <Badge className={cn('text-xs', STATUS_STYLES[action.status])}>
                          {action.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground w-28 text-right">
                          {action.created_at ? formatDistanceToNow(new Date(action.created_at), { addSuffix: true }) : '—'}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-muted/10 border-t border-dashed text-xs space-y-1">
                          {payload?.reason && <div><span className="text-muted-foreground">Reason:</span> {payload.reason}</div>}
                          {payload?.estimated_impact && <div><span className="text-muted-foreground">Impact:</span> {payload.estimated_impact}</div>}
                          {action.applied_at && <div><span className="text-muted-foreground">Applied:</span> {format(new Date(action.applied_at), 'PPpp')}</div>}
                          {action.error && <div className="text-destructive">Error: {action.error}</div>}
                          {payload?.trigger_metrics && (
                            <div className="mt-1">
                              <span className="text-muted-foreground">Metrics:</span>
                              <pre className="mt-1 bg-muted/50 p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(payload.trigger_metrics, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};
