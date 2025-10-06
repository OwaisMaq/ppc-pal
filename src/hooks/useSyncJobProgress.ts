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

  useEffect(() => {
    if (!user?.id) return;

    let isSubscribed = true;

    // Fetch current running sync job once on mount
    const fetchActiveSyncJob = async () => {
      if (!isSubscribed) return;
      
      setIsLoading(true);
      try {
        let query = supabase
          .from('sync_jobs')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'running')
          .order('started_at', { ascending: false });

        if (connectionId) {
          query = query.eq('connection_id', connectionId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('Error fetching sync job:', error.message);
          return;
        }

        if (isSubscribed) {
          setActiveSyncJob(data);
        }
      } catch (error) {
        console.error('Error fetching active sync job:', error);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    fetchActiveSyncJob();

    // Subscribe to sync_jobs changes
    const channel = supabase
      .channel(`sync-jobs-progress-${user.id}${connectionId ? `-${connectionId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_jobs',
          filter: connectionId ? `connection_id=eq.${connectionId}` : `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isSubscribed) return;
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newJob = payload.new as SyncJob;
            
            // Only show running jobs
            if (newJob.status === 'running') {
              setActiveSyncJob(newJob);
            } else if (newJob.status === 'success') {
              setActiveSyncJob(null);
              options?.onComplete?.();
            } else if (newJob.status === 'error') {
              setActiveSyncJob(null);
              options?.onError?.(newJob.error_details);
            }
          } else if (payload.eventType === 'DELETE') {
            setActiveSyncJob(null);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, connectionId]);

  return {
    activeSyncJob,
    isLoading,
    isSyncing: !!activeSyncJob,
    progress: activeSyncJob?.progress_percent || 0,
    phase: activeSyncJob?.phase
  };
};
