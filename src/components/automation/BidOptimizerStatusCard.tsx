import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, TrendingUp } from "lucide-react";
import { useBidOptimizerStatus } from "@/hooks/useBidOptimizerStatus";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BidOptimizerStatusCardProps {
  profileId?: string;
}

export function BidOptimizerStatusCard({ profileId }: BidOptimizerStatusCardProps) {
  const { data, isLoading, error } = useBidOptimizerStatus(profileId);

  if (!profileId) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) return null;

  const isLearning = data.learningProgress < 50;
  const confidenceLabel = data.averageConfidence >= 70 ? 'High' : 
                          data.averageConfidence >= 40 ? 'Medium' : 'Low';
  const confidenceColor = data.averageConfidence >= 70 ? 'text-success' : 
                          data.averageConfidence >= 40 ? 'text-warning' : 'text-muted-foreground';

  return (
    <TooltipProvider>
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="p-2 rounded-full bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-medium text-sm">Smart Bid Optimizer</span>
                <Badge 
                  variant="outline" 
                  className={isLearning 
                    ? "text-muted-foreground bg-muted/50 text-xs px-1.5 py-0" 
                    : "text-success bg-success/10 border-success/30 text-xs px-1.5 py-0"
                  }
                >
                  {isLearning ? 'Learning' : 'Active'}
                </Badge>
              </div>
              
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <Progress value={data.learningProgress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {data.learningProgress}%
                </span>
              </div>
            </div>
            
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <p className="font-semibold">{data.totalEntities}</p>
                    <p className="text-muted-foreground">Targets</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Keywords and targets being optimized</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <p className={`font-semibold ${confidenceColor}`}>{confidenceLabel}</p>
                    <p className="text-muted-foreground">Confidence</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Model confidence: {data.averageConfidence}%</p>
                  <p className="text-xs text-muted-foreground">
                    High: {data.highConfidenceEntities} · 
                    Med: {data.mediumConfidenceEntities} · 
                    Low: {data.lowConfidenceEntities}
                  </p>
                </TooltipContent>
              </Tooltip>
              
              {data.bidsOptimizedToday > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-help">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-success" />
                        <p className="font-semibold text-success">{data.bidsOptimizedToday}</p>
                      </div>
                      <p className="text-muted-foreground">Today</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bids optimized today</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}