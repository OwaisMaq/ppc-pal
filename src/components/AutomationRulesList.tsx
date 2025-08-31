import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Settings, Clock, AlertTriangle, Activity } from "lucide-react";
import { AutomationRule } from "@/hooks/useAutomation";
import { useSubscription } from "@/hooks/useSubscription";
import { formatDistanceToNow } from "date-fns";

interface AutomationRulesListProps {
  rules: AutomationRule[];
  loading: boolean;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onChangeMode: (ruleId: string, mode: 'dry_run' | 'suggestion' | 'auto') => void;
  onRunRule: (ruleId: string) => Promise<any>;
}

const RULE_TYPE_LABELS = {
  budget_depletion: 'Budget Depletion',
  spend_spike: 'Spend Spike',
  st_harvest: 'Search Term Harvest',
  st_prune: 'Search Term Prune',
  placement_opt: 'Placement Optimization',
  bid_down: 'Bid Decrease',
  bid_up: 'Bid Increase'
};

const SEVERITY_COLORS = {
  info: 'bg-blue-100 text-blue-800',
  warn: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800'
};

const MODE_COLORS = {
  dry_run: 'bg-gray-100 text-gray-800',
  suggestion: 'bg-blue-100 text-blue-800',
  auto: 'bg-green-100 text-green-800'
};

export const AutomationRulesList: React.FC<AutomationRulesListProps> = ({
  rules,
  loading,
  onToggleRule,
  onChangeMode,
  onRunRule
}) => {
  const [runningRules, setRunningRules] = useState<Set<string>>(new Set());
  const { subscription } = useSubscription();
  const plan = subscription?.plan_type || 'free';

  const canAutoApply = (ruleType: string) => {
    switch (plan) {
      case 'free':
        return false;
      case 'pro':
        return true;
      default:
        return ['st_harvest', 'st_prune'].includes(ruleType); // starter plan
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
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <Card className="text-center p-8">
        <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No automation rules configured</h3>
        <p className="text-muted-foreground mb-4">
          Create rules to automatically monitor and optimize your campaigns.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => {
        const lastRun = rule.automation_rule_runs?.[0];
        const canUseAuto = canAutoApply(rule.rule_type);
        
        return (
          <Card key={rule.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <Badge variant="outline" className={SEVERITY_COLORS[rule.severity as keyof typeof SEVERITY_COLORS]}>
                    {rule.severity}
                  </Badge>
                  <Badge variant="outline" className={MODE_COLORS[rule.mode]}>
                    {rule.mode.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => onToggleRule(rule.id, enabled)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunRule(rule.id)}
                    disabled={runningRules.has(rule.id)}
                  >
                    {runningRules.has(rule.id) ? (
                      <Clock className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Run Now
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {RULE_TYPE_LABELS[rule.rule_type as keyof typeof RULE_TYPE_LABELS] || rule.rule_type}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Mode</label>
                  <Select
                    value={rule.mode}
                    onValueChange={(mode) => onChangeMode(rule.id, mode as any)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dry_run">
                        Dry Run (Alerts Only)
                      </SelectItem>
                      <SelectItem value="suggestion">
                        Suggestion (Manual Apply)
                      </SelectItem>
                      <SelectItem 
                        value="auto" 
                        disabled={!canUseAuto}
                      >
                        Auto Apply {!canUseAuto && '(Pro)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rule Parameters Preview */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Parameters</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  {Object.entries(rule.params).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last Run Info */}
              {lastRun && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>
                      Last run: {formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{lastRun.alerts_created} alerts</span>
                    <span>{lastRun.actions_enqueued} actions</span>
                    {lastRun.error && (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        Error
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Throttle Info */}
              {rule.throttle && (
                <div className="text-xs text-muted-foreground border-t pt-3">
                  <div className="flex justify-between">
                    <span>Cooldown: {rule.throttle.cooldownHours}h</span>
                    <span>Max/day: {rule.throttle.maxActionsPerDay}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};