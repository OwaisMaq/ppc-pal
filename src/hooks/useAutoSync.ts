
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { amazonConnectionService } from '@/services/amazonConnectionService';

export const useAutoSync = (connections: any[]) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !connections.length) return;

    const performAutoSync = async () => {
      // Check if any connection needs syncing (hasn't been synced or last sync was > 1 hour ago)
      const connectionsNeedingSync = connections.filter(connection => {
        if (!connection.last_sync_at) return true;
        
        const lastSync = new Date(connection.last_sync_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return lastSync < oneHourAgo;
      });

      if (connectionsNeedingSync.length === 0) {
        console.log('All connections are up to date');
        return;
      }

      console.log(`Auto-syncing ${connectionsNeedingSync.length} connections...`);
      setIsSyncing(true);

      try {
        for (const connection of connectionsNeedingSync) {
          console.log('Auto-syncing connection:', connection.id);
          await amazonConnectionService.syncConnection(connection.id);
        }

        toast({
          title: "Success",
          description: `Automatically synced ${connectionsNeedingSync.length} Amazon account(s)`,
        });
      } catch (error) {
        console.error('Auto-sync failed:', error);
        toast({
          title: "Auto-sync Notice",
          description: "Some accounts may need manual syncing. Check the Settings page.",
          variant: "destructive",
        });
      } finally {
        setIsSyncing(false);
      }
    };

    // Run auto sync after a short delay to let the dashboard load first
    const timer = setTimeout(performAutoSync, 2000);

    return () => clearTimeout(timer);
  }, [user, connections, toast]);

  return { isSyncing };
};
