import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingDown, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SavingsKPIProps {
  totalSavings: number;
  negativeKeywordsSavings: number;
  pausedTargetsSavings: number;
  bidOptimizationSavings: number;
  acosImprovementSavings: number;
  actionCount: number;
  loading?: boolean;
}

export const SavingsKPI = ({
  totalSavings,
  negativeKeywordsSavings,
  pausedTargetsSavings,
  bidOptimizationSavings,
  acosImprovementSavings,
  actionCount,
  loading,
}: SavingsKPIProps) => {
  if (loading) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <TooltipProvider>
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  AI Estimated Savings
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-4xl font-bold text-primary cursor-help">
                    {formatCurrency(totalSavings)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  <div className="space-y-2 p-2">
                    <p className="font-semibold">Savings Breakdown:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span>Negative Keywords:</span>
                        <span className="font-medium">{formatCurrency(negativeKeywordsSavings)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Paused Targets:</span>
                        <span className="font-medium">{formatCurrency(pausedTargetsSavings)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Bid Optimization:</span>
                        <span className="font-medium">{formatCurrency(bidOptimizationSavings)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>ACOS Improvements:</span>
                        <span className="font-medium">{formatCurrency(acosImprovementSavings)}</span>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="h-4 w-4 text-success" />
            <span className="text-muted-foreground">
              From <span className="font-semibold text-foreground">{actionCount}</span> AI actions in this period
            </span>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            * Estimated based on prevented wasted spend and efficiency improvements
          </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
