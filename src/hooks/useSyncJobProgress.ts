import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SyncJob {
  id: string;
  connection_id: string;
  user_id: string;
  status: string;
  progress_percent: number;
  phase?: string;
  started_at: string;
  finished_at?: string;
  error_details?: any;
}

interface UseSyncJobProgressOptions {
  onComplete?: () => void;
  onError?: (error: any) => void;
}

export const useSyncJobProgress = (connectionId?: string, options?: UseSyncJobProgressOptions) => {
  const { user } = useAuth();
  const [activeSyncJob, setActiveSyncJob] = useState<SyncJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    
    // Stop polling if too many errors
    if (errorCount > 5) {
      console.error('Too many errors fetching sync job, stopping polling');
      setActiveSyncJob(null);
      return;
    }

    // Fetch current running sync job
    const fetchActiveSyncJob = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('sync_jobs')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'running')
          .order('started_at', { ascending: false })
          .limit(1);

        if (connectionId) {
          query = query.eq('connection_id', connectionId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('Error fetching sync job:', error, error.message);
          setErrorCount(prev => prev + 1);
          return;
        }

        // Reset error count on success
        setErrorCount(0);

        if (data) {
          setActiveSyncJob(data);
        } else {
          // No running jobs found, clear active sync
          setActiveSyncJob(null);
        }
      } catch (error) {
        console.error('Error fetching active sync job:', error);
        setErrorCount(prev => prev + 1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveSyncJob();

    // Subscribe to sync_jobs changes
    const channel = supabase
      .channel('sync-jobs-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_jobs',
          filter: connectionId ? `connection_id=eq.${connectionId}` : `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Sync job update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newJob = payload.new as SyncJob;
            
            // Only show running jobs
            if (newJob.status === 'running') {
              setActiveSyncJob(newJob);
            } else if (newJob.status === 'success') {
              // Clear active job and call onComplete
              if (activeSyncJob?.id === newJob.id) {
                setActiveSyncJob(null);
                options?.onComplete?.();
              }
            } else if (newJob.status === 'error') {
              // Clear active job and call onError
              if (activeSyncJob?.id === newJob.id) {
                setActiveSyncJob(null);
                options?.onError?.(newJob.error_details);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            if (activeSyncJob?.id === payload.old.id) {
              setActiveSyncJob(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, connectionId, activeSyncJob?.id, options?.onComplete, options?.onError]);

  return {
    activeSyncJob,
    isLoading,
    isSyncing: !!activeSyncJob,
    progress: activeSyncJob?.progress_percent || 0,
    phase: activeSyncJob?.phase
  };
};
