import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ProfileSettings {
  display_name: string | null;
  timezone: string;
  preferred_currency: string;
  date_format: string;
  theme: string;
}

const DEFAULT_SETTINGS: ProfileSettings = {
  display_name: null,
  timezone: 'UTC',
  preferred_currency: 'USD',
  date_format: 'MM/DD/YYYY',
  theme: 'system',
};

export const useProfileSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    }
  }, [user?.id]);

  const fetchSettings = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, timezone, preferred_currency, date_format, theme')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          display_name: data.display_name || null,
          timezone: data.timezone || 'UTC',
          preferred_currency: data.preferred_currency || 'USD',
          date_format: data.date_format || 'MM/DD/YYYY',
          theme: data.theme || 'system',
        });
      }
    } catch (error) {
      console.error('Error fetching profile settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<ProfileSettings>) => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...updates }));
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated.',
      });
    } catch (error) {
      console.error('Error updating profile settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
};
