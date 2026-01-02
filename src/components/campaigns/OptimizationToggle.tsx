import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { useEntityOptimization } from "@/hooks/useEntityOptimization";

interface OptimizationToggleProps {
  entityId: string;
  entityType: 'campaign' | 'adgroup' | 'keyword' | 'target';
  profileId?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const OptimizationToggle = ({ 
  entityId, 
  entityType, 
  profileId,
  size = 'sm',
  showLabel = false
}: OptimizationToggleProps) => {
  const { optimizationMap, toggleOptimization, loading } = useEntityOptimization(profileId);
  const isEnabled = optimizationMap.get(entityId) ?? true; // Default to enabled

  if (!profileId) {
    return null;
  }

  const handleToggle = (checked: boolean) => {
    toggleOptimization(entityId, entityType, checked);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {showLabel && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className={`h-3 w-3 ${isEnabled ? 'text-brand-primary' : ''}`} />
                <span className="hidden sm:inline">Auto-Opt</span>
              </div>
            )}
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                className={size === 'sm' ? 'scale-75' : ''}
              />
            )}
            {isEnabled && !loading && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 hidden md:inline-flex">
                AI
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">
              {isEnabled ? 'Auto-optimization enabled' : 'Auto-optimization disabled'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isEnabled 
                ? 'Bayesian Thompson Sampling will automatically adjust bids to optimize for conversions.'
                : 'Click to enable automatic bid optimization for this entity.'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
