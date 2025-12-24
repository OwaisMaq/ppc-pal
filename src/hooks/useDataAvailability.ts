import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { subDays, format } from 'date-fns';

interface DataAvailability {
  minDate: string | null;
  maxDate: string | null;
  loading: boolean;
  hasData: boolean;
}

interface ImportProgress {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  isImporting: boolean;
}

export function useDataAvailability(profileId: string | undefined) {
  const [availability, setAvailability] = useState<DataAvailability>({
    minDate: null,
    maxDate: null,
    loading: true,
    hasData: false,
  });

  const [importProgress, setImportProgress] = useState<ImportProgress>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
    isImporting: false,
  });

  const [isImportingFullHistory, setIsImportingFullHistory] = useState(false);

  const fetchAvailability = useCallback(async () => {
    if (!profileId) {
      setAvailability({ minDate: null, maxDate: null, loading: false, hasData: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('v_campaign_daily')
        .select('date')
        .eq('profile_id', profileId)
        .order('date', { ascending: true })
        .limit(1);

      const { data: maxData, error: maxError } = await supabase
        .from('v_campaign_daily')
        .select('date')
        .eq('profile_id', profileId)
        .order('date', { ascending: false })
        .limit(1);

      if (error || maxError) {
        console.error('Error fetching data availability:', error || maxError);
        setAvailability({ minDate: null, maxDate: null, loading: false, hasData: false });
        return;
      }

      const minDate = data?.[0]?.date || null;
      const maxDate = maxData?.[0]?.date || null;

      setAvailability({
        minDate,
        maxDate,
        loading: false,
        hasData: !!minDate && !!maxDate,
      });
    } catch (err) {
      console.error('Error in fetchAvailability:', err);
      setAvailability({ minDate: null, maxDate: null, loading: false, hasData: false });
    }
  }, [profileId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  useEffect(() => {
    if (!profileId) return;

    const fetchImportProgress = async () => {
      try {
        const { data: connection } = await supabase
          .from('amazon_connections')
          .select('id')
          .eq('profile_id', profileId)
          .single();

        if (!connection) return;

        const { data: reports } = await supabase
          .from('pending_amazon_reports')
          .select('status')
          .eq('connection_id', connection.id);

        if (!reports) return;

        const counts = {
          pending: reports.filter(r => r.status === 'pending').length,
          processing: reports.filter(r => r.status === 'processing').length,
          completed: reports.filter(r => r.status === 'completed').length,
          failed: reports.filter(r => r.status === 'failed').length,
          total: reports.length,
          isImporting: reports.some(r => r.status === 'pending' || r.status === 'processing'),
        };

        setImportProgress(counts);

        // Refresh availability when imports complete
        if (!counts.isImporting && importProgress.isImporting) {
          fetchAvailability();
        }
      } catch (err) {
        console.error('Error fetching import progress:', err);
      }
    };

    fetchImportProgress();
    const interval = setInterval(fetchImportProgress, 5000);
    return () => clearInterval(interval);
  }, [profileId, importProgress.isImporting, fetchAvailability]);

  const importFullHistory = useCallback(async () => {
    if (!profileId || isImportingFullHistory) return;

    setIsImportingFullHistory(true);

    try {
      const today = new Date();
      const chunks: Array<{ startDate: string; endDate: string }> = [];

      // Create 4 chunks of 90 days each (covers ~1 year)
      for (let i = 0; i < 4; i++) {
        const endDate = subDays(today, i * 90);
        const startDate = subDays(endDate, 89);
        chunks.push({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        });
      }

      let totalReports = 0;

      for (const chunk of chunks) {
        const { data, error } = await supabase.functions.invoke('historical-import', {
          body: {
            profileId,
            startDate: chunk.startDate,
            endDate: chunk.endDate,
          },
        });

        if (error) {
          console.error('Historical import error for chunk:', chunk, error);
          continue;
        }

        totalReports += data?.reportsCreated || 0;
      }

      toast.success(`Historical import started`, {
        description: `${totalReports} report requests queued covering the last year. Data will appear within a few minutes.`,
      });
    } catch (error) {
      console.error('Error importing full history:', error);
      toast.error('Failed to start historical import');
    } finally {
      setIsImportingFullHistory(false);
    }
  }, [profileId, isImportingFullHistory]);

  const isDateInRange = (from: Date | undefined, to: Date | undefined): boolean => {
    if (!from || !to || !availability.minDate || !availability.maxDate) return false;
    const minAvailable = new Date(availability.minDate);
    const maxAvailable = new Date(availability.maxDate);
    return from >= minAvailable && to <= maxAvailable;
  };

  const hasDataForRange = (from: Date | undefined, to: Date | undefined): 'full' | 'partial' | 'none' => {
    if (!from || !to || !availability.minDate || !availability.maxDate) return 'none';
    const minAvailable = new Date(availability.minDate);
    const maxAvailable = new Date(availability.maxDate);
    if (from >= minAvailable && to <= maxAvailable) return 'full';
    if (from <= maxAvailable && to >= minAvailable) return 'partial';
    return 'none';
  };

  return {
    ...availability,
    importProgress,
    isDateInRange,
    hasDataForRange,
    importFullHistory,
    isImportingFullHistory,
  };
}
