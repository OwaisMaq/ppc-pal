import { format } from 'date-fns';
import { AlertCircle, Database, Loader2, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface DataAvailabilityIndicatorProps {
  minDate: string | null;
  maxDate: string | null;
  hasData: boolean;
  loading: boolean;
  selectedFrom?: Date;
  selectedTo?: Date;
  profileId?: string;
  importProgress?: {
    pending: number;
    processing: number;
    completed: number;
    isImporting: boolean;
  };
}

export function DataAvailabilityIndicator({
  minDate,
  maxDate,
  hasData,
  loading,
  selectedFrom,
  selectedTo,
  profileId,
  importProgress,
}: DataAvailabilityIndicatorProps) {
  const [importing, setImporting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking data availability...</span>
      </div>
    );
  }

  const handleImportRange = async () => {
    if (!profileId || !selectedFrom || !selectedTo) return;
    
    setImporting(true);
    try {
      const startDate = selectedFrom.toISOString().split('T')[0];
      const endDate = selectedTo.toISOString().split('T')[0];
      
      const { data, error } = await supabase.functions.invoke('historical-import', {
        body: { profileId, startDate, endDate }
      });

      if (error) throw error;

      toast.success(`Historical import started for ${startDate} to ${endDate}`, {
        description: `${data?.reportsCreated || 0} report requests queued. Data will be available within a few minutes.`
      });
    } catch (error) {
      console.error('Historical import error:', error);
      toast.error('Failed to start historical import');
    } finally {
      setImporting(false);
    }
  };

  // Check if selected range is outside available data
  const isOutsideRange = selectedFrom && selectedTo && minDate && maxDate && 
    (selectedFrom < new Date(minDate) || selectedTo > new Date(maxDate));

  const isBeforeAvailable = selectedFrom && minDate && selectedFrom < new Date(minDate);

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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>
            Data available: {format(new Date(minDate!), 'MMM d, yyyy')} – {format(new Date(maxDate!), 'MMM d, yyyy')}
          </span>
        </div>
        
        {importProgress?.isImporting && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Importing historical data ({importProgress.pending + importProgress.processing} pending)
          </Badge>
        )}
      </div>

      {isBeforeAvailable && (
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between text-amber-800">
            <span>
              Selected date range includes dates before available data ({format(new Date(minDate!), 'MMM d, yyyy')}).
              Historical data for earlier periods hasn't been imported yet.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleImportRange}
              disabled={importing}
              className="ml-4 shrink-0"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Import this range
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
