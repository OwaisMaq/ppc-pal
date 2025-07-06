
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConnectionStatus {
  id: string;
  status: 'healthy' | 'warning' | 'error';
  lastSync: string | null;
  campaignCount: number;
  profileStatus: 'active' | 'missing' | 'expired';
  tokenExpiry: string;
  issues: string[];
}

export const useConnectionStatus = () => {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const checkConnectionStatuses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: connections, error } = await supabase
        .from('amazon_connections')
        .select(`
          *,
          campaigns(count)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const connectionStatuses: ConnectionStatus[] = connections.map(conn => {
        const issues: string[] = [];
        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        
        // Check token expiry
        const tokenExpiry = new Date(conn.token_expires_at);
        const now = new Date();
        const hoursUntilExpiry = (tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        let profileStatus: 'active' | 'missing' | 'expired' = 'active';
        
        if (tokenExpiry <= now) {
          issues.push('Access token has expired');
          status = 'error';
          profileStatus = 'expired';
        } else if (hoursUntilExpiry < 24) {
          issues.push('Access token expires soon');
          status = 'warning';
        }

        // Check profile status
        if (!conn.profile_id || conn.profile_id === 'setup_required_no_profiles_found') {
          issues.push('No advertising profile configured');
          status = 'error';
          profileStatus = 'missing';
        }

        // Check sync status
        const campaignCount = Array.isArray(conn.campaigns) ? conn.campaigns.length : 0;
        if (!conn.last_sync_at) {
          issues.push('Never synced with Amazon');
          if (status !== 'error') status = 'warning';
        } else {
          const lastSync = new Date(conn.last_sync_at);
          const daysSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceSync > 7) {
            issues.push('Last sync was over a week ago');
            if (status !== 'error') status = 'warning';
          }
        }

        // Check campaign data
        if (campaignCount === 0) {
          issues.push('No campaigns found');
          if (status !== 'error') status = 'warning';
        }

        return {
          id: conn.id,
          status,
          lastSync: conn.last_sync_at,
          campaignCount,
          profileStatus,
          tokenExpiry: conn.token_expires_at,
          issues
        };
      });

      setStatuses(connectionStatuses);
    } catch (error) {
      console.error('Error checking connection statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatuses();
    
    // Check statuses every 5 minutes
    const interval = setInterval(checkConnectionStatuses, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  return {
    statuses,
    loading,
    refresh: checkConnectionStatuses
  };
};
