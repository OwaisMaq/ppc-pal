import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProfileLimitInfo {
  currentCount: number;
  maxAllowed: number;
  canAdd: boolean;
  loading: boolean;
}

export const useProfileLimits = (): ProfileLimitInfo => {
  const { user } = useAuth();
  const [limitInfo, setLimitInfo] = useState<ProfileLimitInfo>({
    currentCount: 0,
    maxAllowed: 1,
    canAdd: true,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setLimitInfo({ currentCount: 0, maxAllowed: 1, canAdd: true, loading: false });
      return;
    }

    const fetchLimitInfo = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_profile_limit_info', { user_uuid: user.id });

        if (error) {
          console.error('Error fetching profile limits:', error);
          // Default to allowing if there's an error
          setLimitInfo({ currentCount: 0, maxAllowed: 1, canAdd: true, loading: false });
          return;
        }

        if (data && data.length > 0) {
          const info = data[0];
          setLimitInfo({
            currentCount: info.current_count || 0,
            maxAllowed: info.max_allowed || 1,
            canAdd: info.can_add ?? true,
            loading: false,
          });
        } else {
          setLimitInfo({ currentCount: 0, maxAllowed: 1, canAdd: true, loading: false });
        }
      } catch (err) {
        console.error('Error in useProfileLimits:', err);
        setLimitInfo({ currentCount: 0, maxAllowed: 1, canAdd: true, loading: false });
      }
    };

    fetchLimitInfo();
  }, [user]);

  return limitInfo;
};
