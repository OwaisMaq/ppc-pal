import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SyncStatus {
  isProcessing: boolean;
  pendingCount: number;
  lastUpdated: Date | null;
}

export const useSyncStatus = (autoRefresh = true) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>({
    isProcessing: false,
    pendingCount: 0,
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get user's connections
      const { data: connections } = await supabase
        .from('amazon_connections')
        .select('id, last_sync_at')
        .eq('user_id', user.id);

      if (!connections || connections.length === 0) {
        setStatus({
          isProcessing: false,
          pendingCount: 0,
          lastUpdated: null,
        });
        setLoading(false);
        return;
      }

      const connectionIds = connections.map(c => c.id);

      // Check for pending reports
      const { data: pendingReports, count } = await supabase
        .from('pending_amazon_reports')
        .select('*', { count: 'exact', head: false })
        .in('connection_id', connectionIds)
        .in('status', ['pending', 'processing']);

      // Get the most recent sync time
      const lastSyncTimes = connections
        .map(c => c.last_sync_at)
        .filter(t => t !== null)
        .map(t => new Date(t!));

      const mostRecentSync = lastSyncTimes.length > 0
        ? new Date(Math.max(...lastSyncTimes.map(d => d.getTime())))
        : null;

      setStatus({
        isProcessing: (count ?? 0) > 0,
        pendingCount: count ?? 0,
        lastUpdated: mostRecentSync,
      });
    } catch (error) {
      console.error('Error checking sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();

    if (autoRefresh) {
      // Refresh every 30 seconds when reports are processing
      const interval = setInterval(() => {
        if (status.isProcessing) {
          checkStatus();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, autoRefresh, status.isProcessing]);

  return { status, loading, refresh: checkStatus };
};
