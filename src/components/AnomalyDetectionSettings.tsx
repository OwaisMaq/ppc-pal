import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Activity, Bell, ChevronDown, RefreshCw, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { useAnomalySettings, MetricThreshold } from "@/hooks/useAnomalySettings";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";

const METRICS = [
  { key: 'spend', label: 'Spend', description: 'Alert on spend spikes' },
  { key: 'sales', label: 'Sales', description: 'Alert on sales drops' },
  { key: 'acos', label: 'ACOS', description: 'Alert on ACOS spikes' },
  { key: 'cvr', label: 'CVR', description: 'Alert on conversion rate drops' },
  { key: 'ctr', label: 'CTR', description: 'Alert on click-through rate drops' },
  { key: 'cpc', label: 'CPC', description: 'Alert on cost per click spikes' },
  { key: 'impressions', label: 'Impressions', description: 'Alert on impression drops' },
];

export const AnomalyDetectionSettings = () => {
  const { connections } = useAmazonConnections();
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [showMetricOverrides, setShowMetricOverrides] = useState(false);
  
  const { 
    settings, 
    loading, 
    updateSettings, 
    resetDefaults, 
    getEffectiveSettings 
  } = useAnomalySettings(selectedProfileId);

  const effectiveSettings = getEffectiveSettings();

  // Set first profile as default
  useEffect(() => {
    if (connections.length > 0 && !selectedProfileId) {
      setSelectedProfileId(connections[0].profile_id);
    }
  }, [connections, selectedProfileId]);

  const handleToggle = (field: string, value: boolean) => {
    updateSettings({ [field]: value });
  };

  const handleThresholdChange = (field: 'warn_threshold' | 'critical_threshold', value: number) => {
    updateSettings({ [field]: value });
  };

  const handleCooldownChange = (field: 'intraday_cooldown_hours' | 'daily_cooldown_hours', value: number) => {
    updateSettings({ [field]: value });
  };

  const handleMetricThresholdChange = (
    metric: string, 
    type: 'warn' | 'critical', 
    value: number
  ) => {
    const currentThresholds = effectiveSettings.metric_thresholds || {};
    const metricThreshold = currentThresholds[metric] || { warn: effectiveSettings.warn_threshold, critical: effectiveSettings.critical_threshold };
    
    updateSettings({
      metric_thresholds: {
        ...currentThresholds,
        [metric]: {
          ...metricThreshold,
          [type]: value,
        },
      },
    });
  };

  const removeMetricOverride = (metric: string) => {
    const currentThresholds = { ...effectiveSettings.metric_thresholds };
    delete currentThresholds[metric];
    updateSettings({ metric_thresholds: currentThresholds });
  };

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>No Amazon connections found. Connect an account to configure anomaly detection.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Selector */}
      {connections.length > 1 && (
        <div className="flex items-center gap-4">
          <Label>Profile</Label>
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              {connections.map(conn => (
                <SelectItem key={conn.id} value={conn.profile_id}>
                  {conn.profile_name || conn.profile_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Anomaly Detection
              </CardTitle>
              <CardDescription>
                Configure automated anomaly detection for your campaigns
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="enabled"
                  checked={effectiveSettings.enabled}
                  onCheckedChange={(checked) => handleToggle('enabled', checked)}
                  disabled={loading}
                />
                <Label htmlFor="enabled" className="font-medium">
                  {effectiveSettings.enabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Detection Schedule */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Intraday Detection</p>
                  <p className="text-sm text-muted-foreground">Runs every hour</p>
                </div>
              </div>
              <Switch
                checked={effectiveSettings.intraday_enabled}
                onCheckedChange={(checked) => handleToggle('intraday_enabled', checked)}
                disabled={loading || !effectiveSettings.enabled}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Daily Detection</p>
                  <p className="text-sm text-muted-foreground">Runs at 7 AM UTC</p>
                </div>
              </div>
              <Switch
                checked={effectiveSettings.daily_enabled}
                onCheckedChange={(checked) => handleToggle('daily_enabled', checked)}
                disabled={loading || !effectiveSettings.enabled}
              />
            </div>
          </div>

          {/* Global Thresholds */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Z-Score Thresholds
            </h4>
            <p className="text-sm text-muted-foreground">
              Higher thresholds mean fewer alerts. Default: warn at 3σ, critical at 5σ.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Warning Threshold</Label>
                  <Badge variant="secondary">{effectiveSettings.warn_threshold}σ</Badge>
                </div>
                <Slider
                  value={[effectiveSettings.warn_threshold]}
                  onValueChange={([value]) => handleThresholdChange('warn_threshold', value)}
                  min={1.5}
                  max={5}
                  step={0.5}
                  disabled={loading || !effectiveSettings.enabled}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Critical Threshold</Label>
                  <Badge variant="destructive">{effectiveSettings.critical_threshold}σ</Badge>
                </div>
                <Slider
                  value={[effectiveSettings.critical_threshold]}
                  onValueChange={([value]) => handleThresholdChange('critical_threshold', value)}
                  min={3}
                  max={8}
                  step={0.5}
                  disabled={loading || !effectiveSettings.enabled}
                />
              </div>
            </div>
          </div>

          {/* Cooldown Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Cooldown Periods</h4>
            <p className="text-sm text-muted-foreground">
              Minimum time between alerts for the same anomaly pattern.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Intraday Cooldown</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={effectiveSettings.intraday_cooldown_hours}
                    onChange={(e) => handleCooldownChange('intraday_cooldown_hours', parseInt(e.target.value) || 6)}
                    min={1}
                    max={24}
                    className="w-20"
                    disabled={loading || !effectiveSettings.enabled}
                  />
                  <span className="text-muted-foreground">hours</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Daily Cooldown</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={effectiveSettings.daily_cooldown_hours}
                    onChange={(e) => handleCooldownChange('daily_cooldown_hours', parseInt(e.target.value) || 48)}
                    min={12}
                    max={168}
                    className="w-20"
                    disabled={loading || !effectiveSettings.enabled}
                  />
                  <span className="text-muted-foreground">hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="notify_warn"
                  checked={effectiveSettings.notify_on_warn}
                  onCheckedChange={(checked) => handleToggle('notify_on_warn', checked)}
                  disabled={loading || !effectiveSettings.enabled}
                />
                <Label htmlFor="notify_warn">Notify on warnings</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="notify_critical"
                  checked={effectiveSettings.notify_on_critical}
                  onCheckedChange={(checked) => handleToggle('notify_on_critical', checked)}
                  disabled={loading || !effectiveSettings.enabled}
                />
                <Label htmlFor="notify_critical">Notify on critical</Label>
              </div>
            </div>
          </div>

          {/* Metric-Specific Overrides */}
          <Collapsible open={showMetricOverrides} onOpenChange={setShowMetricOverrides}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Per-Metric Threshold Overrides</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showMetricOverrides ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Override thresholds for specific metrics. Leave empty to use global thresholds.
              </p>
              <div className="space-y-3">
                {METRICS.map(metric => {
                  const override = effectiveSettings.metric_thresholds?.[metric.key];
                  return (
                    <div key={metric.key} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{metric.label}</p>
                        <p className="text-xs text-muted-foreground">{metric.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Warn"
                          value={override?.warn ?? ''}
                          onChange={(e) => handleMetricThresholdChange(metric.key, 'warn', parseFloat(e.target.value) || effectiveSettings.warn_threshold)}
                          className="w-16"
                          step="0.5"
                          min="1"
                          disabled={loading || !effectiveSettings.enabled}
                        />
                        <Input
                          type="number"
                          placeholder="Critical"
                          value={override?.critical ?? ''}
                          onChange={(e) => handleMetricThresholdChange(metric.key, 'critical', parseFloat(e.target.value) || effectiveSettings.critical_threshold)}
                          className="w-16"
                          step="0.5"
                          min="1"
                          disabled={loading || !effectiveSettings.enabled}
                        />
                        {override && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMetricOverride(metric.key)}
                            disabled={loading}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={resetDefaults} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
