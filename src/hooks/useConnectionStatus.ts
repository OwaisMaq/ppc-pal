
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConnectionStatus {
  id: string;
  status: 'healthy' | 'warning' | 'error';
  lastSync: string | null;
  campaignCount: number;
  profileStatus: 'active' | 'missing' | 'expired' | 'invalid';
  tokenExpiry: string;
  issues: string[];
  setupRequired?: boolean;
  setupReason?: string;
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
      console.log('=== Connection Status Check Started ===');
      
      const { data: connections, error } = await supabase
        .from('amazon_connections')
        .select(`
          *,
          campaigns(count)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching connections:', error);
        throw error;
      }

      console.log('Raw connections data:', connections);

      const connectionStatuses: ConnectionStatus[] = connections.map(conn => {
        const issues: string[] = [];
        let statusLevel: 'healthy' | 'warning' | 'error' = 'healthy';
        let setupRequired = false;
        let setupReason = '';
        
        console.log(`=== Analyzing Connection ${conn.id} ===`);
        console.log('Connection details:', {
          profile_id: conn.profile_id,
          status: conn.status,
          token_expires_at: conn.token_expires_at,
          last_sync_at: conn.last_sync_at
        });
        
        // Check token expiry
        const tokenExpiry = new Date(conn.token_expires_at);
        const now = new Date();
        const hoursUntilExpiry = (tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        let profileStatus: 'active' | 'missing' | 'expired' | 'invalid' = 'active';
        
        // Determine status based on various conditions
        if (tokenExpiry <= now) {
          issues.push('Access token has expired');
          statusLevel = 'error';
          profileStatus = 'expired';
          setupRequired = true;
          setupReason = 'token_expired';
          console.log('Token expired for connection:', conn.id);
        } else if (hoursUntilExpiry < 24) {
          issues.push('Access token expires soon');
          statusLevel = 'warning';
          console.log('Token expires soon for connection:', conn.id);
        }

        // Enhanced profile validation
        if (!conn.profile_id) {
          issues.push('No profile ID configured');
          statusLevel = 'error';
          profileStatus = 'missing';
          setupRequired = true;
          setupReason = 'no_profile';
          console.log('No profile ID for connection:', conn.id);
        } else if (conn.profile_id === 'setup_required_no_profiles_found') {
          issues.push('No advertising profiles found - Amazon Advertising setup required');
          statusLevel = 'error';
          profileStatus = 'missing';
          setupRequired = true;
          setupReason = 'no_advertising_profiles';
          console.log('No advertising profiles found for connection:', conn.id);
        } else if (conn.profile_id === 'invalid' || conn.profile_id.includes('error')) {
          issues.push('Invalid profile configuration detected');
          statusLevel = 'error';
          profileStatus = 'invalid';
          setupRequired = true;
          setupReason = 'invalid_profile';
          console.log('Invalid profile for connection:', conn.id);
        }

        // Check connection status from database
        if (conn.status === 'setup_required') {
          setupRequired = true;
          if (!setupReason) setupReason = 'needs_sync';
          if (statusLevel === 'healthy') statusLevel = 'warning';
          console.log('Connection requires setup:', conn.id);
        } else if (conn.status === 'error') {
          statusLevel = 'error';
          issues.push('Connection is in error state');
          setupRequired = true;
          if (!setupReason) setupReason = 'connection_error';
          console.log('Connection in error state:', conn.id);
        } else if (conn.status === 'expired') {
          statusLevel = 'error';
          profileStatus = 'expired';
          setupRequired = true;
          setupReason = 'token_expired';
          issues.push('Connection has expired');
          console.log('Connection expired:', conn.id);
        } else if (conn.status !== 'active') {
          issues.push(`Connection status is ${conn.status}`);
          statusLevel = 'error';
          console.log('Connection not active:', conn.id, conn.status);
        }

        // Check sync status
        const campaignCount = Array.isArray(conn.campaigns) ? conn.campaigns.length : 0;
        if (!conn.last_sync_at) {
          issues.push('Never synced with Amazon');
          if (statusLevel === 'healthy') statusLevel = 'warning';
          if (!setupRequired && conn.status === 'active') {
            setupRequired = true;
            setupReason = 'needs_sync';
          }
          console.log('Never synced:', conn.id);
        } else {
          const lastSync = new Date(conn.last_sync_at);
          const daysSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceSync > 7) {
            issues.push('Last sync was over a week ago');
            if (statusLevel === 'healthy') statusLevel = 'warning';
            console.log('Sync overdue for connection:', conn.id);
          }
        }

        // Check campaign data
        if (campaignCount === 0 && conn.last_sync_at) {
          issues.push('No campaigns found after sync - may indicate API or setup issues');
          if (statusLevel === 'healthy') statusLevel = 'warning';
          console.log('No campaigns after sync for connection:', conn.id);
        }

        const connectionStatus = {
          id: conn.id,
          status: statusLevel,
          lastSync: conn.last_sync_at,
          campaignCount,
          profileStatus,
          tokenExpiry: conn.token_expires_at,
          issues,
          setupRequired,
          setupReason
        };

        console.log('Final connection status:', connectionStatus);
        return connectionStatus;
      });

      console.log('=== Connection Status Analysis Complete ===');
      console.log('Total connections analyzed:', connectionStatuses.length);
      console.log('Status summary:', connectionStatuses.map(c => ({ id: c.id, status: c.status, issues: c.issues.length })));

      setStatuses(connectionStatuses);
    } catch (error) {
      console.error('=== Connection Status Check Error ===');
      console.error('Error details:', error);
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
