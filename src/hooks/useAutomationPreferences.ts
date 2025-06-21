
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AutomationPreferences {
  id?: string;
  user_id?: string;
  connection_id: string;
  auto_optimization_enabled: boolean;
  optimization_frequency_hours: number;
  auto_bidding_enabled: boolean;
  max_bid_adjustment_percent: number;
  performance_review_days: number;
  auto_keywords_enabled: boolean;
  auto_pausing_enabled: boolean;
  acos_pause_threshold: number;
  budget_optimization_enabled: boolean;
  max_budget_increase_percent: number;
  last_optimization_run?: string;
  created_at?: string;
  updated_at?: string;
}

export const useAutomationPreferences = (connectionId?: string) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AutomationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPreferences = async () => {
    if (!user || !connectionId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('automation_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('connection_id', connectionId)
        .maybeSingle();

      if (error) throw error;
      setPreferences(data);
    } catch (error) {
      console.error('Error fetching automation preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load automation preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (prefs: Partial<AutomationPreferences>) => {
    if (!user || !connectionId) {
      toast({
        title: "Error",
        description: "Please select an Amazon connection first",
        variant: "destructive",
      });
      return false;
    }

    try {
      setLoading(true);
      
      const prefsData = {
        ...prefs,
        user_id: user.id,
        connection_id: connectionId,
        updated_at: new Date().toISOString(),
      };

      if (preferences?.id) {
        // Update existing preferences
        const { error } = await supabase
          .from('automation_preferences')
          .update(prefsData)
          .eq('id', preferences.id);

        if (error) throw error;
      } else {
        // Create new preferences
        const { data, error } = await supabase
          .from('automation_preferences')
          .insert(prefsData)
          .select()
          .single();

        if (error) throw error;
        setPreferences(data);
      }

      toast({
        title: "Success",
        description: "Automation preferences saved successfully",
      });

      await fetchPreferences();
      return true;
    } catch (error) {
      console.error('Error saving automation preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save automation preferences",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connectionId) {
      fetchPreferences();
    }
  }, [user, connectionId]);

  return {
    preferences,
    loading,
    savePreferences,
    refreshPreferences: fetchPreferences,
  };
};
