import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
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

  const formatMicros = (micros: number) => (micros / 1000000).toFixed(2);
  const parseMicros = (dollars: string) => Math.round(parseFloat(dollars || '0') * 1000000);

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
        {/* Max Change % */}
        <div className="space-y-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Label className="text-xs text-muted-foreground cursor-help">Max Change %</Label>
            </TooltipTrigger>
            <TooltipContent>Max bid change per action</TooltipContent>
          </Tooltip>
          <Select
            value={String(localSettings.max_bid_change_percent || 20)}
            onValueChange={(value) => handleChange('max_bid_change_percent', parseInt(value))}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5%</SelectItem>
              <SelectItem value="10">10%</SelectItem>
              <SelectItem value="15">15%</SelectItem>
              <SelectItem value="20">20%</SelectItem>
              <SelectItem value="25">25%</SelectItem>
              <SelectItem value="30">30%</SelectItem>
              <SelectItem value="40">40%</SelectItem>
              <SelectItem value="50">50%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Min Bid */}
        <div className="space-y-1.5">
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
        <div className="space-y-1.5">
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
        <div className="space-y-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Label className="text-xs text-muted-foreground cursor-help">Daily Limit</Label>
            </TooltipTrigger>
            <TooltipContent>Max actions per day</TooltipContent>
          </Tooltip>
          <Select
            value={String(localSettings.max_actions_per_day || 100)}
            onValueChange={(value) => handleChange('max_actions_per_day', parseInt(value))}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="300">300</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Approval Threshold */}
        <div className="space-y-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Label className="text-xs text-muted-foreground cursor-help">Approval Above</Label>
            </TooltipTrigger>
            <TooltipContent>Require approval for changes above this</TooltipContent>
          </Tooltip>
          <div className="relative">
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
      </div>

      {hasChanges && (
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </TooltipProvider>
  );
}
