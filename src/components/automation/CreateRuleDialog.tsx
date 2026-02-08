import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutomationRule } from "@/hooks/useAutomation";

interface CreateRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  editRule?: AutomationRule | null;
  onSubmit: (data: CreateRuleData) => Promise<void>;
  allowedTypes?: string[];
}

export interface CreateRuleData {
  name: string;
  rule_type: string;
  mode: 'dry_run' | 'suggestion' | 'auto';
  severity: 'info' | 'warn' | 'critical';
  params: Record<string, any>;
  action: Record<string, any>;
  throttle: { cooldownHours: number; maxActionsPerDay: number };
}

const RULE_TYPES = [
  { value: 'budget_depletion', label: 'Budget Depletion' },
  { value: 'spend_spike', label: 'Spend Spike' },
  { value: 'st_harvest', label: 'Search Term Harvest' },
  { value: 'st_prune', label: 'Search Term Prune' },
  { value: 'bid_down', label: 'Bid Down' },
  { value: 'bid_up', label: 'Bid Up' },
];

const DEFAULT_PARAMS: Record<string, Record<string, number | string>> = {
  budget_depletion: { percentThreshold: 80, beforeHourLocal: 16 },
  spend_spike: { lookbackDays: 7, stdevMultiplier: 2.0, minSpend: 5.0 },
  st_harvest: { windowDays: 14, minConvs: 2, maxAcos: 35, exactTo: 'same_ad_group' },
  st_prune: { windowDays: 14, minClicks: 20, minSpend: 10, maxConvs: 0, negateScope: 'ad_group' },
  bid_down: { maxAcos: 40, minClicks: 10, lookbackDays: 14, decreasePercent: 15 },
  bid_up: { minConversions: 2, maxAcos: 25, maxImpressionShare: 50, increasePercent: 10 },
};

const DEFAULT_ACTIONS: Record<string, Record<string, any>> = {
  budget_depletion: { type: 'alert_only' },
  spend_spike: { type: 'alert_only' },
  st_harvest: { type: 'create_keyword', negateSource: true },
  st_prune: { type: 'negative_keyword' },
  bid_down: { type: 'adjust_bid', direction: 'down' },
  bid_up: { type: 'adjust_bid', direction: 'up' },
};

const PARAM_LABELS: Record<string, string> = {
  percentThreshold: 'Budget Threshold (%)',
  beforeHourLocal: 'Before Hour (local)',
  lookbackDays: 'Lookback Days',
  stdevMultiplier: 'Std Dev Multiplier',
  minSpend: 'Min Spend ($)',
  windowDays: 'Window Days',
  minConvs: 'Min Conversions',
  maxAcos: 'Max ACoS (%)',
  exactTo: 'Add Exact To',
  minClicks: 'Min Clicks',
  maxConvs: 'Max Conversions',
  negateScope: 'Negate Scope',
  decreasePercent: 'Decrease %',
  minConversions: 'Min Conversions',
  maxImpressionShare: 'Max Impression Share (%)',
  increasePercent: 'Increase %',
};

export const CreateRuleDialog: React.FC<CreateRuleDialogProps> = ({
  open,
  onOpenChange,
  profileId,
  editRule,
  onSubmit,
  allowedTypes,
}) => {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState('budget_depletion');
  const [mode, setMode] = useState<'dry_run' | 'suggestion' | 'auto'>('dry_run');
  const [severity, setSeverity] = useState<'info' | 'warn' | 'critical'>('warn');
  const [params, setParams] = useState<Record<string, any>>({});
  const [cooldownHours, setCooldownHours] = useState(24);
  const [maxActionsPerDay, setMaxActionsPerDay] = useState(50);

  const isEdit = !!editRule;

  useEffect(() => {
    if (editRule) {
      setName(editRule.name);
      setRuleType(editRule.rule_type);
      setMode(editRule.mode);
      setSeverity(editRule.severity);
      setParams(editRule.params || {});
      setCooldownHours(editRule.throttle?.cooldownHours || 24);
      setMaxActionsPerDay(editRule.throttle?.maxActionsPerDay || 50);
    } else {
      setName('');
      setRuleType('budget_depletion');
      setMode('dry_run');
      setSeverity('warn');
      setParams(DEFAULT_PARAMS['budget_depletion']);
      setCooldownHours(24);
      setMaxActionsPerDay(50);
    }
  }, [editRule, open]);

  const handleTypeChange = (type: string) => {
    setRuleType(type);
    if (!isEdit) {
      setParams(DEFAULT_PARAMS[type] || {});
    }
  };

  const handleParamChange = (key: string, value: string) => {
    const numVal = Number(value);
    setParams(prev => ({ ...prev, [key]: isNaN(numVal) ? value : numVal }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        name: name || RULE_TYPES.find(t => t.value === ruleType)?.label || 'Custom Rule',
        rule_type: ruleType,
        mode,
        severity,
        params,
        action: DEFAULT_ACTIONS[ruleType] || { type: 'alert_only' },
        throttle: { cooldownHours, maxActionsPerDay },
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const availableTypes = allowedTypes
    ? RULE_TYPES.filter(t => allowedTypes.includes(t.value))
    : RULE_TYPES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Rule' : 'Create Automation Rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. High ACoS Bid Reducer" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select value={ruleType} onValueChange={handleTypeChange} disabled={isEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={v => setSeverity(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={v => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dry_run">Dry Run</SelectItem>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Parameters</Label>
            {Object.entries(params).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-xs text-muted-foreground">{PARAM_LABELS[key] || key}</Label>
                {typeof value === 'string' && ['exactTo', 'negateScope'].includes(key) ? (
                  <Select value={String(value)} onValueChange={v => handleParamChange(key, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {key === 'exactTo' && <>
                        <SelectItem value="same_ad_group">Same Ad Group</SelectItem>
                        <SelectItem value="new_campaign">New Campaign</SelectItem>
                      </>}
                      {key === 'negateScope' && <>
                        <SelectItem value="ad_group">Ad Group</SelectItem>
                        <SelectItem value="campaign">Campaign</SelectItem>
                      </>}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={value as number}
                    onChange={e => handleParamChange(key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cooldown (hours)</Label>
              <Input type="number" className="h-8" value={cooldownHours} onChange={e => setCooldownHours(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Max Actions/Day</Label>
              <Input type="number" className="h-8" value={maxActionsPerDay} onChange={e => setMaxActionsPerDay(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
