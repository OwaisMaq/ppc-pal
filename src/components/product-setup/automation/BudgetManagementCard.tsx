
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { TrendingDown } from 'lucide-react';

interface BudgetManagementCardProps {
  budgetAdjustment: boolean;
  budgetIncrease: number[];
  onBudgetAdjustmentChange: (enabled: boolean) => void;
  onBudgetIncreaseChange: (increase: number[]) => void;
}

const BudgetManagementCard: React.FC<BudgetManagementCardProps> = ({
  budgetAdjustment,
  budgetIncrease,
  onBudgetAdjustmentChange,
  onBudgetIncreaseChange,
}) => {
  return (
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
            onCheckedChange={onBudgetAdjustmentChange}
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
                onValueChange={onBudgetIncreaseChange}
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
  );
};

export default BudgetManagementCard;
