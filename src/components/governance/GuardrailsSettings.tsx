import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Shield, DollarSign, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { GovernanceSettings } from '@/hooks/useGovernance';
import { toast } from 'sonner';

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
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kill Switch */}
      <Card className={settings.automation_paused ? 'border-destructive bg-destructive/5' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${settings.automation_paused ? 'bg-destructive/10' : 'bg-success/10'}`}>
                <Shield className={`h-5 w-5 ${settings.automation_paused ? 'text-destructive' : 'text-success'}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Global Automation</CardTitle>
                <CardDescription>
                  {settings.automation_paused
                    ? `Paused since ${new Date(settings.automation_paused_at || '').toLocaleDateString()}`
                    : 'Automation is active and running'}
                </CardDescription>
              </div>
            </div>
            <Button
              variant={settings.automation_paused ? 'default' : 'destructive'}
              onClick={handleKillSwitch}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {settings.automation_paused ? 'Resume' : 'Kill Switch'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Bid Guardrails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-brand-primary" />
            Bid Guardrails
          </CardTitle>
          <CardDescription>
            Set safe boundaries for automated bid changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Bid Change Percent */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Maximum bid change per action</Label>
              <span className="text-sm font-medium">{localSettings.max_bid_change_percent || 20}%</span>
            </div>
            <Slider
              value={[localSettings.max_bid_change_percent || 20]}
              onValueChange={([value]) => handleChange('max_bid_change_percent', value)}
              min={5}
              max={50}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Automation will never change a bid by more than this percentage in a single action
            </p>
          </div>

          <Separator />

          {/* Bid Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-bid">Minimum Bid</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="min-bid"
                  type="number"
                  step="0.01"
                  min="0.02"
                  className="pl-7"
                  value={formatMicros(localSettings.min_bid_micros || 100000)}
                  onChange={(e) => handleChange('min_bid_micros', parseMicros(e.target.value))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Floor for bid reductions</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-bid">Maximum Bid</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="max-bid"
                  type="number"
                  step="0.10"
                  min="0.10"
                  className="pl-7"
                  value={formatMicros(localSettings.max_bid_micros || 10000000)}
                  onChange={(e) => handleChange('max_bid_micros', parseMicros(e.target.value))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Ceiling for bid increases</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-primary" />
            Automation Limits
          </CardTitle>
          <CardDescription>
            Control how much automation can do each day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Actions Per Day */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Maximum actions per day</Label>
              <span className="text-sm font-medium">{localSettings.max_actions_per_day || 100}</span>
            </div>
            <Slider
              value={[localSettings.max_actions_per_day || 100]}
              onValueChange={([value]) => handleChange('max_actions_per_day', value)}
              min={10}
              max={500}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Daily limit on automated changes across all campaigns
            </p>
          </div>

          <Separator />

          {/* Approval Threshold */}
          <div className="space-y-2">
            <Label htmlFor="approval-threshold">Require approval for changes above</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="approval-threshold"
                type="number"
                step="0.50"
                min="0"
                className="pl-7"
                value={formatMicros(localSettings.require_approval_above_micros || 1000000)}
                onChange={(e) => handleChange('require_approval_above_micros', parseMicros(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Bid changes larger than this amount will require manual approval
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Guardrails
          </Button>
        </div>
      )}
    </div>
  );
}
