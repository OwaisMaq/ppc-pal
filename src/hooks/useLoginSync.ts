import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useLoginSync = () => {
  const { user, session } = useAuth();
  const lastSyncRef = useRef<string | null>(null);
  const syncInProgressRef = useRef(false);

  useEffect(() => {
    if (!user || !session) return;

    const triggerLoginSync = async () => {
      if (syncInProgressRef.current) {
        console.log('🔄 Login sync already in progress, skipping');
        return;
      }

      const lastLoginSync = localStorage.getItem('ppcpal_last_login_sync');
      const sessionKey = `${user.id}_${session.access_token.substring(0, 20)}`;

      if (lastSyncRef.current === sessionKey) {
        console.log('🔄 Already synced for this session, skipping');
        return;
      }

      if (lastLoginSync) {
        const lastSyncTime = new Date(lastLoginSync).getTime();
        const now = Date.now();
        const fourHours = 4 * 60 * 60 * 1000;

        if (now - lastSyncTime < fourHours) {
          console.log('🔄 Synced recently (within 4 hours), skipping login sync');
          lastSyncRef.current = sessionKey;
          return;
        }
      }

      try {
        syncInProgressRef.current = true;
        console.log('🔄 Triggering login sync for user:', user.id);

        const { data: connections } = await supabase
          .from('amazon_connections_safe')
          .select('id, profile_id, status, token_expires_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('token_expires_at', new Date().toISOString());

        if (!connections || connections.length === 0) {
          console.log('⚠️ No active connections found for user');
          return;
        }

        console.log(`📊 Found ${connections.length} active connections, triggering entity and performance syncs`);

        const [entityResult, performanceResult] = await Promise.allSettled([
          supabase.functions.invoke('entity-auto-sync-scheduler', {
            body: { 
              trigger: 'login',
              userId: user.id 
            }
          }),
          supabase.functions.invoke('performance-sync-scheduler', {
            body: { 
              trigger: 'login',
              userId: user.id 
            }
          })
        ]);

        const now = new Date().toISOString();
        localStorage.setItem('ppcpal_last_login_sync', now);
        lastSyncRef.current = sessionKey;

        console.log('✅ Entity sync triggered:', entityResult.status);
        console.log('✅ Performance sync triggered:', performanceResult.status);
      } catch (error) {
        console.error('❌ Login sync failed:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    const timer = setTimeout(triggerLoginSync, 2000);
    return () => clearTimeout(timer);
  }, [user, session]);
};
