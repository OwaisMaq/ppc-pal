import { format } from 'date-fns';
import { AlertCircle, Database, Loader2, Download, History } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DataAvailabilityIndicatorProps {
  minDate: string | null;
  maxDate: string | null;
  hasData: boolean;
  loading: boolean;
  selectedFrom?: Date;
  selectedTo?: Date;
  importProgress?: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
    isImporting: boolean;
  };
  onImportFullHistory?: () => void;
  isImportingFullHistory?: boolean;
}

export function DataAvailabilityIndicator({
  minDate,
  maxDate,
  hasData,
  loading,
  selectedFrom,
  selectedTo,
  importProgress,
  onImportFullHistory,
  isImportingFullHistory,
}: DataAvailabilityIndicatorProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking data availability...</span>
      </div>
    );
  }

  const isBeforeAvailable = selectedFrom && minDate && selectedFrom < new Date(minDate);
  const progressPercent = importProgress?.total 
    ? Math.round(((importProgress.completed + importProgress.failed) / importProgress.total) * 100) 
    : 0;

  if (!hasData) {
    return (
      <Alert variant="default" className="bg-muted/50">
        <Database className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>No campaign data available yet. Data will appear after the initial sync completes.</span>
          {importProgress?.isImporting && (
            <Badge variant="secondary" className="ml-2">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Importing...
            </Badge>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>
            Data available: <span className="font-medium text-foreground">{format(new Date(minDate!), 'MMM d, yyyy')}</span> – <span className="font-medium text-foreground">{format(new Date(maxDate!), 'MMM d, yyyy')}</span>
          </span>
        </div>
        
        {onImportFullHistory && !importProgress?.isImporting && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onImportFullHistory}
            disabled={isImportingFullHistory}
            className="gap-2"
          >
            {isImportingFullHistory ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting import...
              </>
            ) : (
              <>
                <History className="h-4 w-4" />
                Re-import Last 90 Days
              </>
            )}
          </Button>
        )}
      </div>

      {importProgress?.isImporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Importing historical data...</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Pending: {importProgress.pending}</span>
            <span>Processing: {importProgress.processing}</span>
            <span className="text-green-600">Completed: {importProgress.completed}</span>
            {importProgress.failed > 0 && (
              <span className="text-red-600">Failed: {importProgress.failed}</span>
            )}
          </div>
        </div>
      )}

      {isBeforeAvailable && !importProgress?.isImporting && (
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Selected date range includes dates before available data. Amazon retains approximately 60-90 days of historical data.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
