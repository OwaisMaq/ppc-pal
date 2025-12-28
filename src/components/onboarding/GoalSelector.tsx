import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  TrendingUp, 
  Rocket,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OptimizationGoal = 'maximize_profit' | 'grow_share' | 'launch_products';

interface GoalOption {
  value: OptimizationGoal;
  icon: React.ElementType;
  title: string;
  description: string;
  targetAcos: string;
  automationLevel: string;
}

const goalOptions: GoalOption[] = [
  {
    value: 'maximize_profit',
    icon: Target,
    title: 'Maximize Profit',
    description: 'Aggressive cost control, focus on high-converting keywords',
    targetAcos: '15-20%',
    automationLevel: 'Conservative bids, strict negatives'
  },
  {
    value: 'grow_share',
    icon: TrendingUp,
    title: 'Grow Market Share',
    description: 'Balanced approach between visibility and profitability',
    targetAcos: '25-35%',
    automationLevel: 'Moderate bids, balanced scaling'
  },
  {
    value: 'launch_products',
    icon: Rocket,
    title: 'Launch New Products',
    description: 'Prioritize visibility and data collection over immediate ROAS',
    targetAcos: '40-60%',
    automationLevel: 'Aggressive bids, focus on impressions'
  }
];

interface GoalSelectorProps {
  selectedGoal: OptimizationGoal | null;
  onGoalSelect: (goal: OptimizationGoal) => void;
  onContinue?: () => void;
  showContinue?: boolean;
}

export const GoalSelector = ({ 
  selectedGoal, 
  onGoalSelect, 
  onContinue,
  showContinue = true 
}: GoalSelectorProps) => {
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">What's your primary goal?</CardTitle>
        <CardDescription className="text-base">
          We'll configure your automation rules based on your objective
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={selectedGoal || undefined}
          onValueChange={(value) => onGoalSelect(value as OptimizationGoal)}
          className="space-y-3"
        >
          {goalOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedGoal === option.value;
            
            return (
              <div key={option.value}>
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={option.value}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{option.title}</p>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        Target ACoS: {option.targetAcos}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        {option.automationLevel}
                      </span>
                    </div>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {showContinue && (
          <Button 
            className="w-full gap-2" 
            onClick={onContinue}
            disabled={!selectedGoal}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalSelector;
