import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';
import { useAISettings } from '@/hooks/useAISettings';

const ACTION_TYPES = [
  { key: 'bid_adjustments', label: 'Bid Adjustments' },
  { key: 'keyword_additions', label: 'Keyword Additions' },
  { key: 'negative_keywords', label: 'Negative Keywords' },
  { key: 'budget_changes', label: 'Budget Changes' },
  { key: 'pause_enable', label: 'Pause/Enable Campaigns' },
];

export const AIAutoApplyCard = () => {
  const { settings, loading, updateSettings } = useAISettings();

  const toggleActionType = (actionType: string) => {
    const currentTypes = settings.auto_apply_action_types || [];
    const newTypes = currentTypes.includes(actionType)
      ? currentTypes.filter(t => t !== actionType)
      : [...currentTypes, actionType];
    updateSettings({ auto_apply_action_types: newTypes });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${settings.auto_apply_enabled ? 'bg-success/10' : 'bg-muted'}`}>
              <Bot className={`h-5 w-5 ${settings.auto_apply_enabled ? 'text-success' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">AI Auto-Apply</CardTitle>
              <CardDescription>
                Let PPC Pal automatically apply recommendations
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={settings.auto_apply_enabled}
            onCheckedChange={(checked) => updateSettings({ auto_apply_enabled: checked })}
            disabled={loading}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Confidence Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Minimum Confidence</Label>
            <Badge variant="secondary">{Math.round(settings.auto_apply_min_confidence * 100)}%</Badge>
          </div>
          <Slider
            value={[settings.auto_apply_min_confidence]}
            onValueChange={([value]) => updateSettings({ auto_apply_min_confidence: value })}
            min={0.5}
            max={1}
            step={0.05}
            disabled={loading || !settings.auto_apply_enabled}
          />
          <p className="text-xs text-muted-foreground">
            Only apply recommendations with confidence above this threshold
          </p>
        </div>

        {/* Max Impact Level */}
        <div className="space-y-2">
          <Label>Maximum Impact Level</Label>
          <Select
            value={settings.auto_apply_max_impact}
            onValueChange={(value) => updateSettings({ auto_apply_max_impact: value })}
            disabled={loading || !settings.auto_apply_enabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (safest)</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High (most aggressive)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Allowed Actions */}
        <div className="space-y-3">
          <Label>Allowed Actions</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACTION_TYPES.map(action => (
              <div key={action.key} className="flex items-center gap-2">
                <Switch
                  checked={settings.auto_apply_action_types?.includes(action.key) ?? false}
                  onCheckedChange={() => toggleActionType(action.key)}
                  disabled={loading || !settings.auto_apply_enabled}
                />
                <Label className="text-sm">{action.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
