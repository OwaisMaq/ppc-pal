import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  TrendingUp, 
  Tag,
  Check 
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LifecycleStage = 'launch' | 'scale' | 'liquidate';

interface LifecycleSelectorProps {
  selectedStage: LifecycleStage | null;
  onStageChange: (stage: LifecycleStage) => void;
  className?: string;
}

const stages: {
  id: LifecycleStage;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  focus: string;
  targetAcos: string;
  color: string;
}[] = [
  {
    id: 'launch',
    title: 'Launch',
    description: 'New product or campaign launch',
    icon: Rocket,
    focus: 'Impressions & visibility',
    targetAcos: '40-60%',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  },
  {
    id: 'scale',
    title: 'Scale',
    description: 'Profitable growth mode',
    icon: TrendingUp,
    focus: 'Target ACoS & ROAS',
    targetAcos: '15-25%',
    color: 'text-green-500 bg-green-500/10 border-green-500/20'
  },
  {
    id: 'liquidate',
    title: 'Liquidate',
    description: 'Clearance or end-of-life',
    icon: Tag,
    focus: 'Maximum orders',
    targetAcos: '50-100%',
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20'
  }
];

export function LifecycleSelector({ 
  selectedStage, 
  onStageChange,
  className 
}: LifecycleSelectorProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Product Lifecycle Stage</CardTitle>
        <CardDescription>
          Select a stage to apply optimized bid strategies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stages.map((stage) => {
            const isSelected = selectedStage === stage.id;
            const Icon = stage.icon;
            
            return (
              <button
                key={stage.id}
                onClick={() => onStageChange(stage.id)}
                className={cn(
                  "relative p-4 rounded-lg border-2 text-left transition-all",
                  "hover:shadow-sm",
                  isSelected 
                    ? `${stage.color} border-current` 
                    : "border-border bg-card hover:border-muted-foreground/50"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("h-5 w-5", isSelected ? "" : "text-muted-foreground")} />
                  <span className="font-medium">{stage.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {stage.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {stage.focus}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    ACoS: {stage.targetAcos}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default LifecycleSelector;
