import { Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

interface DataFreshnessIndicatorProps {
  lastUpdated: Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DataFreshnessIndicator = ({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: DataFreshnessIndicatorProps) => {
  if (!lastUpdated) {
    return null;
  }

  const timeAgo = formatDistanceToNow(lastUpdated, { addSuffix: true });

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Updated {timeAgo}</span>
              <span className="md:hidden">{timeAgo}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Last data sync: {lastUpdated.toLocaleString()}
            </p>
          </TooltipContent>
        </Tooltip>

        {onRefresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-7 w-7 p-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Refresh data</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
