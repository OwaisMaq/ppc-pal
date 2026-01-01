import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Shield, Loader2 } from 'lucide-react';
import { GovernanceSettings } from '@/hooks/useGovernance';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GuardrailsSettingsProps {
  settings: GovernanceSettings | null;
  saving: boolean;
  onUpdate: (updates: Partial<GovernanceSettings>) => Promise<void>;
  onToggleAutomation: (paused: boolean, reason?: string) => Promise<void>;
}

export function GuardrailsSettings({
  settings,
  saving,
  onUpdate,
  onToggleAutomation,
}: GuardrailsSettingsProps) {
  const [localSettings, setLocalSettings] = React.useState<Partial<GovernanceSettings>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    if (settings) {
      setLocalSettings({
        max_bid_change_percent: settings.max_bid_change_percent,
        min_bid_micros: settings.min_bid_micros,
        max_bid_micros: settings.max_bid_micros,
        max_actions_per_day: settings.max_actions_per_day,
        require_approval_above_micros: settings.require_approval_above_micros,
      });
      setHasChanges(false);
    }
  }, [settings]);

  const handleChange = (key: keyof GovernanceSettings, value: number) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await onUpdate(localSettings);
      setHasChanges(false);
      toast.success('Guardrails saved');
    } catch {
      toast.error('Failed to save guardrails');
    }
  };

  const handleKillSwitch = async () => {
    const newState = !settings?.automation_paused;
    try {
      await onToggleAutomation(newState, newState ? 'Kill switch activated' : undefined);
      toast[newState ? 'warning' : 'success'](
        newState ? 'Automation paused' : 'Automation resumed'
      );
    } catch {
      toast.error('Failed to toggle automation');
    }
  };

  const formatMicros = (micros: number) => (micros / 1000000).toFixed(2);
  const parseMicros = (dollars: string) => Math.round(parseFloat(dollars || '0') * 1000000);

  if (!settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={settings.automation_paused ? 'border-destructive/50' : ''}>
        <CardContent className="py-4 space-y-4">
          {/* Kill Switch Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`h-4 w-4 ${settings.automation_paused ? 'text-destructive' : 'text-success'}`} />
              <span className="text-sm font-medium">
                {settings.automation_paused ? 'Automation Paused' : 'Automation Active'}
              </span>
            </div>
            <Button
              size="sm"
              variant={settings.automation_paused ? 'default' : 'destructive'}
              onClick={handleKillSwitch}
              disabled={saving}
            >
              {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {settings.automation_paused ? 'Resume' : 'Kill Switch'}
            </Button>
          </div>

          {/* Compact Controls Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Max Change % */}
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="text-xs text-muted-foreground cursor-help">Max Change</Label>
                </TooltipTrigger>
                <TooltipContent>Max bid change per action</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2">
                <Slider
                  value={[localSettings.max_bid_change_percent || 20]}
                  onValueChange={([value]) => handleChange('max_bid_change_percent', value)}
                  min={5}
                  max={50}
                  step={5}
                  className="flex-1"
                />
                <span className="text-xs font-medium w-8">{localSettings.max_bid_change_percent || 20}%</span>
              </div>
            </div>

            {/* Min Bid */}
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="text-xs text-muted-foreground cursor-help">Min Bid</Label>
                </TooltipTrigger>
                <TooltipContent>Floor for bid reductions</TooltipContent>
              </Tooltip>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.02"
                  className="h-8 pl-5 text-sm"
                  value={formatMicros(localSettings.min_bid_micros || 100000)}
                  onChange={(e) => handleChange('min_bid_micros', parseMicros(e.target.value))}
                />
              </div>
            </div>

            {/* Max Bid */}
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="text-xs text-muted-foreground cursor-help">Max Bid</Label>
                </TooltipTrigger>
                <TooltipContent>Ceiling for bid increases</TooltipContent>
              </Tooltip>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.10"
                  min="0.10"
                  className="h-8 pl-5 text-sm"
                  value={formatMicros(localSettings.max_bid_micros || 10000000)}
                  onChange={(e) => handleChange('max_bid_micros', parseMicros(e.target.value))}
                />
              </div>
            </div>

            {/* Daily Limit */}
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="text-xs text-muted-foreground cursor-help">Daily Limit</Label>
                </TooltipTrigger>
                <TooltipContent>Max actions per day</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2">
                <Slider
                  value={[localSettings.max_actions_per_day || 100]}
                  onValueChange={([value]) => handleChange('max_actions_per_day', value)}
                  min={10}
                  max={500}
                  step={10}
                  className="flex-1"
                />
                <span className="text-xs font-medium w-8">{localSettings.max_actions_per_day || 100}</span>
              </div>
            </div>
          </div>

          {/* Approval Threshold + Save */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="text-xs text-muted-foreground cursor-help whitespace-nowrap">Approval above</Label>
                </TooltipTrigger>
                <TooltipContent>Require manual approval for changes above this amount</TooltipContent>
              </Tooltip>
              <div className="relative w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  className="h-8 pl-5 text-sm"
                  value={formatMicros(localSettings.require_approval_above_micros || 1000000)}
                  onChange={(e) => handleChange('require_approval_above_micros', parseMicros(e.target.value))}
                />
              </div>
            </div>
            
            {hasChanges && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
