import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    if (!profileId) {
      setAvailability({ minDate: null, maxDate: null, loading: false, hasData: false });
      return;
    }

    const fetchAvailability = async () => {
      try {
        // Get min/max dates from v_campaign_daily
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
    };

    fetchAvailability();
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;

    const fetchImportProgress = async () => {
      try {
        // Get connection_id for this profile
        const { data: connection } = await supabase
          .from('amazon_connections')
          .select('id')
          .eq('profile_id', profileId)
          .single();

        if (!connection) return;

        // Get pending report counts
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
      } catch (err) {
        console.error('Error fetching import progress:', err);
      }
    };

    fetchImportProgress();

    // Poll for updates while importing
    const interval = setInterval(fetchImportProgress, 10000);
    return () => clearInterval(interval);
  }, [profileId]);

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
    
    // Check if range is completely within available data
    if (from >= minAvailable && to <= maxAvailable) return 'full';
    
    // Check if there's any overlap
    if (from <= maxAvailable && to >= minAvailable) return 'partial';
    
    return 'none';
  };

  return {
    ...availability,
    importProgress,
    isDateInRange,
    hasDataForRange,
  };
}
