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
    if (!user?.id) {
      setActiveSyncJob(null);
      return;
    }

    let isSubscribed = true;
    let fetchTimeout: NodeJS.Timeout;

    // Debounced fetch with abort controller
    const fetchActiveSyncJob = async () => {
      if (!isSubscribed) return;
      
      // Clear any pending fetch
      clearTimeout(fetchTimeout);
      
      // Debounce the fetch to prevent rapid retries
      fetchTimeout = setTimeout(async () => {
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
            // Only log error once, don't spam console
            if (isSubscribed) {
              console.warn('Sync job fetch failed:', error.message);
            }
            return;
          }

          if (isSubscribed) {
            setActiveSyncJob(data);
          }
        } catch (error) {
          // Silently fail to prevent console spam
          if (isSubscribed) {
            console.warn('Sync job fetch exception');
          }
        } finally {
          if (isSubscribed) {
            setIsLoading(false);
          }
        }
      }, 500); // 500ms debounce
    };

    fetchActiveSyncJob();

    // Subscribe to sync_jobs changes with unique channel per instance
    const channelId = `sync-jobs-${user.id}${connectionId ? `-${connectionId}` : ''}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
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
      clearTimeout(fetchTimeout);
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
