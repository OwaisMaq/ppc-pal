import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useSyncJobProgress } from '@/hooks/useSyncJobProgress';
import { useAmazonData } from '@/hooks/useAmazonData';
import { toast } from 'sonner';

interface SyncProgressBarProps {
  connectionId?: string;
  className?: string;
}

export const SyncProgressBar = ({ connectionId, className }: SyncProgressBarProps) => {
  const { fetchAllData } = useAmazonData();
  
  const { isSyncing, progress, phase } = useSyncJobProgress(connectionId, {
    onComplete: () => {
      toast.success('Sync completed successfully!');
      fetchAllData();
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error?.error || 'Unknown error'}`);
    }
  });

  if (!isSyncing) return null;

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Syncing data...</span>
          </div>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        {phase && (
          <p className="text-xs text-muted-foreground">{phase}</p>
        )}
      </div>
    </Card>
  );
};
