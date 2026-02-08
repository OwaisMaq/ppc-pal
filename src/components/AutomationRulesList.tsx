import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Play, Settings, Clock, AlertTriangle, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { AutomationRule } from "@/hooks/useAutomation";
import { useEntitlements } from "@/hooks/useEntitlements";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ReportIssueButton } from "@/components/ui/ReportIssueButton";

interface AutomationRulesListProps {
  rules: AutomationRule[];
  loading: boolean;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onChangeMode: (ruleId: string, mode: 'dry_run' | 'suggestion' | 'auto') => void;
  onRunRule: (ruleId: string) => Promise<any>;
  onEditRule?: (rule: AutomationRule) => void;
  onDeleteRule?: (ruleId: string) => void;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  budget_depletion: 'Budget',
  spend_spike: 'Spend Spike',
  st_harvest: 'Harvest',
  st_prune: 'Prune',
  placement_opt: 'Placement',
  bid_down: 'Bid ↓',
  bid_up: 'Bid ↑'
};

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-info/10 text-info border-info/20',
  warn: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20'
};

export const AutomationRulesList: React.FC<AutomationRulesListProps> = ({
  rules,
  loading,
  onToggleRule,
  onChangeMode,
  onRunRule,
  onEditRule,
  onDeleteRule,
}) => {
  const [runningRules, setRunningRules] = useState<Set<string>>(new Set());
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const { plan } = useEntitlements();

  const canAutoApply = (ruleType: string) => {
    switch (plan) {
      case 'free':
        return false;
      case 'starter':
        return ['budget_depletion', 'spend_spike', 'st_harvest', 'st_prune'].includes(ruleType);
      case 'pro':
      case 'agency':
        return true;
      default:
        return false;
    }
  };

  const handleRunRule = async (ruleId: string) => {
    setRunningRules(prev => new Set(prev).add(ruleId));
    try {
      await onRunRule(ruleId);
    } finally {
      setRunningRules(prev => {
        const next = new Set(prev);
        next.delete(ruleId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rules.length === 0) {
    return (
      <Card className="text-center p-6">
        <Settings className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold mb-1">No automation rules</h3>
        <p className="text-sm text-muted-foreground">
          Create rules to monitor and optimize your campaigns.
        </p>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Automation Rules</span>
          </div>
          <ReportIssueButton 
            featureId="automation_rules" 
            featureLabel="Automation Rules"
            variant="minimal"
          />
        </CardHeader>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            <div className="col-span-1">On</div>
            <div className="col-span-3">Rule</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Mode</div>
            <div className="col-span-1">Last Run</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {/* Rules rows */}
          <div className="divide-y">
            {rules.map((rule) => {
              const lastRun = rule.automation_rule_runs?.[0];
              const canUseAuto = canAutoApply(rule.rule_type);
              const isExpanded = expandedRule === rule.id;
              
              return (
                <div key={rule.id} className="group">
                  <div 
                    className={cn(
                      "grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm transition-colors",
                      "hover:bg-muted/30 cursor-pointer",
                      isExpanded && "bg-muted/20"
                    )}
                    onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                  >
                    <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(enabled) => onToggleRule(rule.id, enabled)}
                        className="scale-90"
                      />
                    </div>

                    <div className="col-span-3 flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={cn("font-medium truncate", !rule.enabled && "text-muted-foreground")}>
                        {rule.name}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center gap-1.5">
                      <Badge variant="outline" className={cn("text-xs px-1.5 py-0", SEVERITY_STYLES[rule.severity])}>
                        {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}
                      </Badge>
                    </div>

                    <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={rule.mode}
                        onValueChange={(mode) => onChangeMode(rule.id, mode as any)}
                      >
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dry_run" className="text-xs">Dry Run</SelectItem>
                          <SelectItem value="suggestion" className="text-xs">Suggest</SelectItem>
                          <SelectItem value="auto" disabled={!canUseAuto} className="text-xs">
                            Auto {!canUseAuto && '(Pro)'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-1 text-xs text-muted-foreground">
                      {lastRun ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1">
                              {lastRun.error && <AlertTriangle className="h-3 w-3 text-destructive" />}
                              {formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>{lastRun.alerts_created} alerts, {lastRun.actions_enqueued} actions</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground/50">Never</span>
                      )}
                    </div>

                    <div className="col-span-3 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {onEditRule && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEditRule(rule)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDeleteRule && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete "{rule.name}"? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteRule(rule.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleRunRule(rule.id)}
                        disabled={runningRules.has(rule.id)}
                      >
                        {runningRules.has(rule.id) ? (
                          <Clock className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1" />
                            Run
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 bg-muted/10 border-t border-dashed">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="col-span-2">
                          <p className="font-medium text-muted-foreground mb-1">Parameters</p>
                          <div className="space-y-0.5">
                            {Object.entries(rule.params).slice(0, 4).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-foreground">
                                <span className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>
                                <span className="font-mono">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {rule.throttle && (
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">Throttle</p>
                            <div className="space-y-0.5 text-foreground">
                              <div>Cooldown: {rule.throttle.cooldownHours}h</div>
                              <div>Max/day: {rule.throttle.maxActionsPerDay}</div>
                            </div>
                          </div>
                        )}

                        {lastRun && (
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">Last Run Stats</p>
                            <div className="space-y-0.5 text-foreground">
                              <div>{lastRun.alerts_created} alerts / {lastRun.actions_enqueued} actions</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
