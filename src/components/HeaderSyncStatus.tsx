import { RefreshCw, Check } from "lucide-react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export const HeaderSyncStatus = () => {
  const { status, reportStatus, loading, refresh } = useSyncStatus();
  const [lastAutoSync, setLastAutoSync] = useState<Date | null>(null);

  useEffect(() => {
    const lastSync = localStorage.getItem('ppcpal_last_login_sync');
    if (lastSync) {
      setLastAutoSync(new Date(lastSync));
    }
  }, []);

  const formatTimeUntilNext = (nextTime: Date | null) => {
    if (!nextTime) return null;
    const now = new Date();
    const diff = nextTime.getTime() - now.getTime();
    if (diff <= 0) return 'Due now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  };

  if (loading) {
    return null;
  }

  if (!status.isProcessing && status.pendingCount === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">Data synced</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>All performance data is up to date</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reports requested automatically every 2 hours
            </p>
            {reportStatus.lastRequestedAt && (
              <p className="text-xs text-muted-foreground">
                Last request: {reportStatus.lastRequestedAt.toLocaleString()}
              </p>
            )}
            {reportStatus.nextScheduledAt && (
              <p className="text-xs text-muted-foreground">
                Next request: {formatTimeUntilNext(reportStatus.nextScheduledAt)}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            className="gap-2 h-8 px-2"
          >
            <div className="flex items-center gap-2">
              <RefreshCw
                className={cn(
                  "h-4 w-4 text-blue-600",
                  status.isProcessing && "animate-spin"
                )}
              />
              <span className="hidden sm:inline text-xs">
                Processing {status.pendingCount} report{status.pendingCount !== 1 ? 's' : ''}
              </span>
              <span className="sm:hidden text-xs">
                {status.pendingCount}
              </span>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Performance reports are being processed</p>
          <p className="text-xs text-muted-foreground mt-1">
            {status.pendingCount} report{status.pendingCount !== 1 ? 's' : ''} pending
          </p>
          <p className="text-xs text-muted-foreground">
            Data will update automatically when complete (typically 3-5 min)
          </p>
          {reportStatus.nextScheduledAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Next scheduled request: {formatTimeUntilNext(reportStatus.nextScheduledAt)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
