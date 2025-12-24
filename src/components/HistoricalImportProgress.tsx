import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, AlertCircle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ImportStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

interface HistoricalImportProgressProps {
  connectionId: string;
  onComplete?: () => void;
}

export function HistoricalImportProgress({ connectionId, onComplete }: HistoricalImportProgressProps) {
  const [status, setStatus] = useState<ImportStatus>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: reports } = await supabase
        .from('pending_amazon_reports')
        .select('status')
        .eq('connection_id', connectionId);

      if (!reports || reports.length === 0) return;

      const counts = {
        pending: reports.filter(r => r.status === 'pending').length,
        processing: reports.filter(r => r.status === 'processing').length,
        completed: reports.filter(r => r.status === 'completed').length,
        failed: reports.filter(r => r.status === 'failed').length,
        total: reports.length,
      };

      setStatus(counts);

      // Check if all reports are done
      if (counts.pending === 0 && counts.processing === 0 && counts.total > 0) {
        setIsComplete(true);
        onComplete?.();
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [connectionId, onComplete]);

  const progressPercent = status.total > 0 
    ? ((status.completed + status.failed) / status.total) * 100 
    : 0;

  const isImporting = status.pending > 0 || status.processing > 0;

  if (status.total === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Initializing data sync...</span>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Historical data import complete!</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>{status.completed} reports processed successfully</span>
          {status.failed > 0 && (
            <Badge variant="destructive" className="ml-2">
              {status.failed} failed
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          <span className="font-medium">Importing historical data...</span>
        </div>
        <span className="text-muted-foreground">
          {status.completed + status.failed} / {status.total}
        </span>
      </div>
      
      <Progress value={progressPercent} className="h-2" />
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {status.pending > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
            {status.pending} pending
          </span>
        )}
        {status.processing > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            {status.processing} processing
          </span>
        )}
        {status.completed > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" />
            {status.completed} completed
          </span>
        )}
        {status.failed > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-3 w-3" />
            {status.failed} failed
          </span>
        )}
      </div>
    </div>
  );
}
