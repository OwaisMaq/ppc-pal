
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Settings, Zap, TrendingDown, TrendingUp, Pause } from 'lucide-react';

const AutomationPreferences = () => {
  const [autoBidding, setAutoBidding] = useState(true);
  const [autoKeywords, setAutoKeywords] = useState(false);
  const [autoPausing, setAutoPausing] = useState(true);
  const [budgetAdjustment, setBudgetAdjustment] = useState(false);
  
  const [bidAdjustmentRange, setBidAdjustmentRange] = useState([20]);
  const [performanceThreshold, setPerformanceThreshold] = useState([7]);
  const [pauseThreshold, setPauseThreshold] = useState('50');
  const [budgetIncrease, setBudgetIncrease] = useState([15]);

  const handleSave = () => {
    console.log('Saving automation preferences:', {
      autoBidding,
      autoKeywords,
      autoPausing,
      budgetAdjustment,
      bidAdjustmentRange: bidAdjustmentRange[0],
      performanceThreshold: performanceThreshold[0],
      pauseThreshold,
      budgetIncrease: budgetIncrease[0]
    });
  };

  return (
    <div className="space-y-6">
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
        <Button onClick={handleSave} className="px-8">
          Save Automation Preferences
        </Button>
      </div>
    </div>
  );
};

export default AutomationPreferences;
