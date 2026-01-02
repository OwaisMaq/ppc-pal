import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AISettings {
  auto_apply_enabled: boolean;
  auto_apply_min_confidence: number;
  auto_apply_max_impact: string;
  auto_apply_action_types: string[];
}

const DEFAULT_SETTINGS: AISettings = {
  auto_apply_enabled: false,
  auto_apply_min_confidence: 0.8,
  auto_apply_max_impact: 'medium',
  auto_apply_action_types: ['bid_adjustments', 'keyword_additions', 'negative_keywords'],
};

export const useAISettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
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
        .from('user_ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          auto_apply_enabled: data.auto_apply_enabled ?? false,
          auto_apply_min_confidence: data.auto_apply_min_confidence ?? 0.8,
          auto_apply_max_impact: data.auto_apply_max_impact ?? 'medium',
          auto_apply_action_types: data.auto_apply_action_types ?? DEFAULT_SETTINGS.auto_apply_action_types,
        });
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AISettings>) => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const newSettings = { ...settings, ...updates };
      
      const { error } = await supabase
        .from('user_ai_settings')
        .upsert({
          user_id: user.id,
          auto_apply_enabled: newSettings.auto_apply_enabled,
          auto_apply_min_confidence: newSettings.auto_apply_min_confidence,
          auto_apply_max_impact: newSettings.auto_apply_max_impact,
          auto_apply_action_types: newSettings.auto_apply_action_types,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setSettings(newSettings);
      toast({
        title: 'AI settings saved',
        description: 'Your automation preferences have been updated.',
      });
    } catch (error) {
      console.error('Error updating AI settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI settings.',
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
    hasConnection: true, // Simplified - this doesn't require a connection
  };
};
