import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SyncStatus {
  isProcessing: boolean;
  pendingCount: number;
  lastUpdated: Date | null;
}

export interface ReportRequestStatus {
  lastRequestedAt: Date | null;
  nextScheduledAt: Date | null;
}

export const useSyncStatus = (autoRefresh = true) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>({
    isProcessing: false,
    pendingCount: 0,
    lastUpdated: null,
  });
  const [reportStatus, setReportStatus] = useState<ReportRequestStatus>({
    lastRequestedAt: null,
    nextScheduledAt: null,
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
        setReportStatus({
          lastRequestedAt: null,
          nextScheduledAt: null,
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

      // Get the most recent report request time
      const { data: allReports } = await supabase
        .from('amazon_report_requests')
        .select('created_at')
        .in('connection_id', connectionIds)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastRequestedAt = allReports?.[0]?.created_at 
        ? new Date(allReports[0].created_at) 
        : null;

      // Calculate next scheduled sync (every 2 hours)
      const nextScheduledAt = lastRequestedAt 
        ? new Date(lastRequestedAt.getTime() + 2 * 60 * 60 * 1000)
        : null;

      setReportStatus({
        lastRequestedAt,
        nextScheduledAt,
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

  return { status, reportStatus, loading, refresh: checkStatus };
};
