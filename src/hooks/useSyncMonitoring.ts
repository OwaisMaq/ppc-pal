import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncPerformanceLog {
  id: string;
  connection_id: string;
  operation_type: string;
  start_time: string;
  end_time?: string;
  total_duration_ms?: number;
  phases?: any;
  campaigns_processed: number;
  success: boolean;
  error_message?: string;
  performance_metrics?: any;
  created_at: string;
}

interface ConnectionHealth {
  id: string;
  profile_name?: string;
  health_status: 'healthy' | 'degraded' | 'unknown';
  health_issues?: string[];
  last_health_check?: string;
  last_sync_at?: string;
  campaign_count: number;
}

export const useSyncMonitoring = () => {
  const { user } = useAuth();
  const [performanceLogs, setPerformanceLogs] = useState<SyncPerformanceLog[]>([]);
  const [connectionHealths, setConnectionHealths] = useState<ConnectionHealth[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPerformanceLogs();
      fetchConnectionHealths();
    }
  }, [user]);

  const fetchPerformanceLogs = async (limit = 50) => {
    try {
      setLoading(true);
      
      // Get performance logs for user's connections
      const { data, error } = await supabase
        .from('sync_performance_logs')
        .select(`
          *,
          amazon_connections!sync_performance_logs_connection_id_fkey(
            profile_name,
            user_id
          )
        `)
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Filter logs for current user's connections
      const userLogs = data?.filter(log => 
        log.amazon_connections?.user_id === user?.id
      ) || [];

      setPerformanceLogs(userLogs);
      console.log('Fetched performance logs:', userLogs.length);
    } catch (error) {
      console.error('Error fetching performance logs:', error);
      toast.error('Failed to load sync performance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionHealths = async () => {
    try {
      const { data, error } = await supabase
        .from('amazon_connections')
        .select(`
          id,
          profile_name,
          health_status,
          health_issues,
          last_health_check,
          last_sync_at,
          campaign_count
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      setConnectionHealths((data || []).map(item => ({
        ...item,
        health_status: (item.health_status as 'healthy' | 'degraded' | 'unknown') || 'unknown'
      })));
      console.log('Fetched connection healths:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching connection health:', error);
      toast.error('Failed to load connection health data');
    }
  };

  const getPerformanceStats = () => {
    const recentLogs = performanceLogs.slice(0, 10); // Last 10 syncs
    
    const successRate = recentLogs.length > 0 
      ? (recentLogs.filter(log => log.success).length / recentLogs.length) * 100 
      : 0;

    const avgDuration = recentLogs
      .filter(log => log.total_duration_ms)
      .reduce((sum, log, _, arr) => sum + (log.total_duration_ms! / arr.length), 0);

    const totalCampaignsProcessed = recentLogs
      .reduce((sum, log) => sum + log.campaigns_processed, 0);

    const commonErrors = performanceLogs
      .filter(log => !log.success && log.error_message)
      .reduce((acc, log) => {
        const error = log.error_message!;
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      successRate,
      avgDuration,
      totalCampaignsProcessed,
      totalSyncs: recentLogs.length,
      commonErrors: Object.entries(commonErrors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
  };

  const getHealthSummary = () => {
    const healthCounts = connectionHealths.reduce((acc, conn) => {
      acc[conn.health_status] = (acc[conn.health_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const degradedConnections = connectionHealths.filter(
      conn => conn.health_status === 'degraded'
    );

    const staleConnections = connectionHealths.filter(conn => {
      if (!conn.last_sync_at) return true;
      const lastSync = new Date(conn.last_sync_at);
      const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSync > 7; // Consider stale if not synced in 7 days
    });

    return {
      totalConnections: connectionHealths.length,
      healthyConnections: healthCounts.healthy || 0,
      degradedConnections: healthCounts.degraded || 0,
      unknownConnections: healthCounts.unknown || 0,
      staleConnections: staleConnections.length,
      degradedConnectionsList: degradedConnections,
      staleConnectionsList: staleConnections
    };
  };

  const runHealthCheck = async (connectionId: string) => {
    try {
      toast.info('Running connection health check...');
      
      // Trigger a lightweight sync to check connection health
      const { data, error } = await supabase.functions.invoke('sync-amazon-data', {
        body: { 
          connectionId,
          healthCheckOnly: true // Special flag for health check
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        toast.error('Health check failed');
        return false;
      }

      toast.success('Health check completed');
      
      // Refresh connection health data
      await fetchConnectionHealths();
      
      return true;
    } catch (error) {
      console.error('Health check error:', error);
      toast.error('Health check failed');
      return false;
    }
  };

  const exportPerformanceData = () => {
    const csvData = performanceLogs.map(log => ({
      Date: new Date(log.start_time).toLocaleDateString(),
      Time: new Date(log.start_time).toLocaleTimeString(),
      Duration: log.total_duration_ms ? `${log.total_duration_ms}ms` : 'N/A',
      'Campaigns Processed': log.campaigns_processed,
      Success: log.success ? 'Yes' : 'No',
      Error: log.error_message || 'None'
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync_performance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    performanceLogs,
    connectionHealths,
    loading,
    fetchPerformanceLogs,
    fetchConnectionHealths,
    performanceStats: getPerformanceStats(),
    healthSummary: getHealthSummary(),
    runHealthCheck,
    exportPerformanceData,
    refreshData: () => {
      fetchPerformanceLogs();
      fetchConnectionHealths();
    }
  };
};