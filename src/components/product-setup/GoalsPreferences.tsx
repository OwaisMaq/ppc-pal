
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Target, DollarSign, TrendingUp, Zap } from 'lucide-react';

const GoalsPreferences = () => {
  const [targetAcos, setTargetAcos] = useState([25]);
  const [dailyBudget, setDailyBudget] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [biddingStrategy, setBiddingStrategy] = useState('');

  const handleSave = () => {
    // Save functionality would be implemented here
    console.log('Saving goals and preferences:', {
      targetAcos: targetAcos[0],
      dailyBudget,
      monthlyBudget,
      campaignGoal,
      biddingStrategy
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Target ACOS
          </CardTitle>
          <CardDescription>
            Set your target Advertising Cost of Sales percentage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="target-acos">Target ACOS: {targetAcos[0]}%</Label>
            <Slider
              id="target-acos"
              min={10}
              max={50}
              step={1}
              value={targetAcos}
              onValueChange={setTargetAcos}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>10% (Aggressive)</span>
              <span>50% (Conservative)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Budget Limits
          </CardTitle>
          <CardDescription>
            Set your daily and monthly budget constraints
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="daily-budget">Daily Budget Limit ($)</Label>
            <Input
              id="daily-budget"
              type="number"
              placeholder="100.00"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly-budget">Monthly Budget Limit ($)</Label>
            <Input
              id="monthly-budget"
              type="number"
              placeholder="3000.00"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Campaign Goals
          </CardTitle>
          <CardDescription>
            Choose your primary campaign objective
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="campaign-goal">Primary Goal</Label>
            <Select value={campaignGoal} onValueChange={setCampaignGoal}>
              <SelectTrigger id="campaign-goal">
                <SelectValue placeholder="Select your campaign goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scale">Scale - Increase sales volume</SelectItem>
                <SelectItem value="efficiency">Efficiency - Optimize ACOS</SelectItem>
                <SelectItem value="product-launch">Product Launch - New product visibility</SelectItem>
                <SelectItem value="brand-awareness">Brand Awareness - Increase impressions</SelectItem>
                <SelectItem value="competitive-defense">Competitive Defense - Protect market share</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Bidding Strategy
          </CardTitle>
          <CardDescription>
            Choose how aggressively to bid on keywords
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="bidding-strategy">Strategy</Label>
            <Select value={biddingStrategy} onValueChange={setBiddingStrategy}>
              <SelectTrigger id="bidding-strategy">
                <SelectValue placeholder="Select your bidding strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative - Lower bids, focus on profitable keywords</SelectItem>
                <SelectItem value="balanced">Balanced - Moderate bids across all keywords</SelectItem>
                <SelectItem value="aggressive">Aggressive - Higher bids for maximum visibility</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="px-8">
          Save Goals & Preferences
        </Button>
      </div>
    </div>
  );
};

export default GoalsPreferences;
