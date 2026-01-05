import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useApprovalStatus() {
  const { user } = useAuth();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsApproved(null);
      setLoading(false);
      return;
    }

    const checkApproval = async () => {
      try {
        const { data, error } = await supabase
          .rpc('is_user_approved', { user_uuid: user.id });

        if (error) {
          console.error('Error checking approval status:', error);
          setIsApproved(false);
        } else {
          setIsApproved(data ?? false);
        }
      } catch (err) {
        console.error('Error checking approval:', err);
        setIsApproved(false);
      } finally {
        setLoading(false);
      }
    };

    checkApproval();
  }, [user]);

  return { isApproved, loading };
}
