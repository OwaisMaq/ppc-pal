import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: number; // 0-100
  observations?: number;
  confidenceInterval?: { lower: number; upper: number };
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function ConfidenceBadge({ 
  confidence, 
  observations, 
  confidenceInterval,
  showIcon = true,
  size = 'sm'
}: ConfidenceBadgeProps) {
  const getVariant = () => {
    if (confidence >= 80) return 'default';
    if (confidence >= 50) return 'secondary';
    return 'outline';
  };

  const getColorClasses = () => {
    if (confidence >= 80) return 'bg-success/10 text-success border-success/20 hover:bg-success/20';
    if (confidence >= 50) return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20';
    return 'bg-muted text-muted-foreground';
  };

  const getIcon = () => {
    if (confidence >= 80) return <Brain className="h-3 w-3" />;
    if (confidence >= 50) return <TrendingUp className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  };

  const getLabel = () => {
    if (confidence >= 80) return 'High';
    if (confidence >= 50) return 'Medium';
    return 'Low';
  };

  const formatBid = (micros: number) => {
    return `$${(micros / 1_000_000).toFixed(2)}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getVariant()} 
            className={`gap-1 cursor-help ${getColorClasses()} ${size === 'sm' ? 'text-xs py-0' : 'text-sm'}`}
          >
            {showIcon && getIcon()}
            {confidence}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {getLabel()} Confidence ({confidence}%)
            </p>
            {observations !== undefined && (
              <p className="text-muted-foreground">
                Based on {observations} observations
              </p>
            )}
            {confidenceInterval && (
              <p className="text-muted-foreground">
                95% CI: {formatBid(confidenceInterval.lower)} - {formatBid(confidenceInterval.upper)}
              </p>
            )}
            <p className="text-xs text-muted-foreground pt-1 border-t">
              {confidence >= 80 
                ? 'Thompson Sampling has high certainty about optimal bid'
                : confidence >= 50 
                  ? 'Model is still learning, exploring bid variations'
                  : 'More data needed for reliable optimization'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
