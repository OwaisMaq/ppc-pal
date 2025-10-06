import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { useSyncJobProgress } from '@/hooks/useSyncJobProgress';
import { useAmazonData } from '@/hooks/useAmazonData';
import { useCleanupStuckSyncs } from '@/hooks/useCleanupStuckSyncs';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface SyncProgressBarProps {
  connectionId?: string;
  className?: string;
}

export const SyncProgressBar = ({ connectionId, className }: SyncProgressBarProps) => {
  const { fetchAllData } = useAmazonData();
  const { cleanupStuckSyncs } = useCleanupStuckSyncs();
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  
  const { isSyncing, progress, phase, activeSyncJob } = useSyncJobProgress(connectionId, {
    onComplete: () => {
      toast.success('Sync completed successfully!');
      fetchAllData();
      setSyncStartTime(null);
      setIsStuck(false);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error?.error || 'Unknown error'}`);
      setSyncStartTime(null);
      setIsStuck(false);
    }
  });

  // Track when sync starts
  useEffect(() => {
    if (isSyncing && !syncStartTime) {
      setSyncStartTime(Date.now());
    }
  }, [isSyncing, syncStartTime]);

  // Check if sync is stuck (running for more than 5 minutes)
  useEffect(() => {
    if (!isSyncing || !syncStartTime) {
      setIsStuck(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - syncStartTime;
      if (elapsed > 5 * 60 * 1000) { // 5 minutes
        setIsStuck(true);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [isSyncing, syncStartTime]);

  const handleCancelSync = async () => {
    const success = await cleanupStuckSyncs();
    if (success) {
      setSyncStartTime(null);
      setIsStuck(false);
      fetchAllData(); // Refresh data to show what was synced
    }
  };

  if (!isSyncing) return null;

  return (
    <Card className={`p-4 ${className} ${isStuck ? 'border-warning' : ''}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Syncing data...</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{progress}%</span>
            {isStuck && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelSync}
                className="h-6 px-2"
              >
                <X className="h-3 w-3" />
                <span className="ml-1 text-xs">Cancel Stuck Sync</span>
              </Button>
            )}
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        {phase && (
          <p className="text-xs text-muted-foreground">{phase}</p>
        )}
        
        {isStuck && (
          <p className="text-xs text-warning">
            Sync appears to be stuck. Amazon's report API may be taking too long. You can cancel and try again later.
          </p>
        )}
      </div>
    </Card>
  );
};
