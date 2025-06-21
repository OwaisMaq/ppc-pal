
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Zap, TrendingDown, TrendingUp, Pause, Clock } from 'lucide-react';
import { useAutomationPreferences } from '@/hooks/useAutomationPreferences';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';

const AutomationPreferences = () => {
  const { connections } = useAmazonConnections();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const { preferences, loading, savePreferences } = useAutomationPreferences(selectedConnectionId);

  // Local state for form values
  const [autoOptimization, setAutoOptimization] = useState(false);
  const [optimizationFrequency, setOptimizationFrequency] = useState([24]);
  const [autoBidding, setAutoBidding] = useState(false);
  const [autoKeywords, setAutoKeywords] = useState(false);
  const [autoPausing, setAutoPausing] = useState(false);
  const [budgetAdjustment, setBudgetAdjustment] = useState(false);
  
  const [bidAdjustmentRange, setBidAdjustmentRange] = useState([20]);
  const [performanceThreshold, setPerformanceThreshold] = useState([7]);
  const [pauseThreshold, setPauseThreshold] = useState('50');
  const [budgetIncrease, setBudgetIncrease] = useState([15]);

  // Get active connections
  const activeConnections = connections.filter(c => c.status === 'active');

  // Set default connection
  useEffect(() => {
    if (activeConnections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(activeConnections[0].id);
    }
  }, [activeConnections, selectedConnectionId]);

  // Update form values when preferences change
  useEffect(() => {
    if (preferences) {
      setAutoOptimization(preferences.auto_optimization_enabled);
      setOptimizationFrequency([preferences.optimization_frequency_hours]);
      setAutoBidding(preferences.auto_bidding_enabled);
      setAutoKeywords(preferences.auto_keywords_enabled);
      setAutoPausing(preferences.auto_pausing_enabled);
      setBudgetAdjustment(preferences.budget_optimization_enabled);
      setBidAdjustmentRange([preferences.max_bid_adjustment_percent]);
      setPerformanceThreshold([preferences.performance_review_days]);
      setPauseThreshold(preferences.acos_pause_threshold.toString());
      setBudgetIncrease([preferences.max_budget_increase_percent]);
    }
  }, [preferences]);

  const handleSave = async () => {
    const success = await savePreferences({
      auto_optimization_enabled: autoOptimization,
      optimization_frequency_hours: optimizationFrequency[0],
      auto_bidding_enabled: autoBidding,
      max_bid_adjustment_percent: bidAdjustmentRange[0],
      performance_review_days: performanceThreshold[0],
      auto_keywords_enabled: autoKeywords,
      auto_pausing_enabled: autoPausing,
      acos_pause_threshold: parseFloat(pauseThreshold),
      budget_optimization_enabled: budgetAdjustment,
      max_budget_increase_percent: budgetIncrease[0],
    });

    if (success) {
      console.log('Automation preferences saved successfully');
    }
  };

  if (activeConnections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Automation Preferences
          </CardTitle>
          <CardDescription>
            Connect an Amazon account first to configure automation settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Please connect your Amazon Advertising account in the Settings page to enable automation features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Selection */}
      {activeConnections.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Amazon Account</CardTitle>
            <CardDescription>
              Choose which Amazon account to configure automation for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {activeConnections.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.profile_name || `Profile ${connection.profile_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Auto Optimization Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Automatic Optimization Schedule
          </CardTitle>
          <CardDescription>
            Enable automatic optimization to run at regular intervals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-optimization">Enable Automatic Optimization</Label>
              <p className="text-sm text-gray-500">
                Run AI optimization automatically at scheduled intervals
              </p>
            </div>
            <Switch
              id="auto-optimization"
              checked={autoOptimization}
              onCheckedChange={setAutoOptimization}
            />
          </div>

          {autoOptimization && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-200">
              <div className="space-y-3">
                <Label>Optimization Frequency: Every {optimizationFrequency[0]} hours</Label>
                <Slider
                  min={6}
                  max={168}
                  step={6}
                  value={optimizationFrequency}
                  onValueChange={setOptimizationFrequency}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>6 hours (Frequent)</span>
                  <span>168 hours / 1 week (Conservative)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automated Bid Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Automated Bid Management
          </CardTitle>
          <CardDescription>
            Let AI automatically adjust bids based on performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-bidding">Enable Automated Bidding</Label>
              <p className="text-sm text-gray-500">
                Automatically increase/decrease bids based on keyword performance
              </p>
            </div>
            <Switch
              id="auto-bidding"
              checked={autoBidding}
              onCheckedChange={setAutoBidding}
            />
          </div>

          {autoBidding && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-200">
              <div className="space-y-3">
                <Label>Maximum Bid Adjustment: ±{bidAdjustmentRange[0]}%</Label>
                <Slider
                  min={5}
                  max={50}
                  step={5}
                  value={bidAdjustmentRange}
                  onValueChange={setBidAdjustmentRange}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>5% (Conservative)</span>
                  <span>50% (Aggressive)</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Performance Review Period: {performanceThreshold[0]} days</Label>
                <Slider
                  min={3}
                  max={30}
                  step={1}
                  value={performanceThreshold}
                  onValueChange={setPerformanceThreshold}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>3 days (Reactive)</span>
                  <span>30 days (Conservative)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyword Discovery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Keyword Discovery
          </CardTitle>
          <CardDescription>
            Automatically discover and add new profitable keywords
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-keywords">Enable Auto Keyword Discovery</Label>
              <p className="text-sm text-gray-500">
                Add high-performing search terms as new keywords automatically
              </p>
            </div>
            <Switch
              id="auto-keywords"
              checked={autoKeywords}
              onCheckedChange={setAutoKeywords}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto-Pausing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-blue-600" />
            Auto-Pausing
          </CardTitle>
          <CardDescription>
            Automatically pause underperforming keywords
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-pausing">Enable Auto-Pausing</Label>
              <p className="text-sm text-gray-500">
                Pause keywords that exceed ACOS threshold without conversions
              </p>
            </div>
            <Switch
              id="auto-pausing"
              checked={autoPausing}
              onCheckedChange={setAutoPausing}
            />
          </div>

          {autoPausing && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-200">
              <div className="space-y-2">
                <Label htmlFor="pause-threshold">ACOS Threshold for Pausing (%)</Label>
                <Input
                  id="pause-threshold"
                  type="number"
                  placeholder="50"
                  value={pauseThreshold}
                  onChange={(e) => setPauseThreshold(e.target.value)}
                  className="w-32"
                />
                <p className="text-xs text-gray-500">
                  Keywords with ACOS above this threshold will be paused
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            Budget Management
          </CardTitle>
          <CardDescription>
            Automatically adjust campaign budgets based on performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="budget-adjustment">Enable Budget Optimization</Label>
              <p className="text-sm text-gray-500">
                Increase budgets for high-performing campaigns
              </p>
            </div>
            <Switch
              id="budget-adjustment"
              checked={budgetAdjustment}
              onCheckedChange={setBudgetAdjustment}
            />
          </div>

          {budgetAdjustment && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-200">
              <div className="space-y-3">
                <Label>Maximum Budget Increase: {budgetIncrease[0]}%</Label>
                <Slider
                  min={5}
                  max={100}
                  step={5}
                  value={budgetIncrease}
                  onValueChange={setBudgetIncrease}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>5% (Conservative)</span>
                  <span>100% (Aggressive)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={loading || !selectedConnectionId}
          className="px-8"
        >
          {loading ? 'Saving...' : 'Save Automation Preferences'}
        </Button>
      </div>

      {preferences?.last_optimization_run && (
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">
              Last automatic optimization: {new Date(preferences.last_optimization_run).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutomationPreferences;
