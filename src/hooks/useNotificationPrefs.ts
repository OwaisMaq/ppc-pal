import { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  slack_webhook?: string;
  email?: string;
  digest_frequency: 'instant' | 'hourly' | 'daily';
}

export const useNotificationPrefs = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    digest_frequency: 'hourly',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_prefs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no preferences exist yet, that's okay
        if (fetchError.code !== 'PGRST116') {
          throw new Error(fetchError.message);
        }
      } else if (data) {
        setPreferences({
          slack_webhook: data.slack_webhook || undefined,
          email: data.email || undefined,
          digest_frequency: (data.digest_frequency || 'hourly') as 'instant' | 'hourly' | 'daily',
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch notification preferences';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const updatedPrefs = { ...preferences, ...newPrefs };
      
      const { error: updateError } = await supabase
        .from('user_prefs')
        .upsert({
          user_id: user.id,
          slack_webhook: updatedPrefs.slack_webhook || null,
          email: updatedPrefs.email || null,
          digest_frequency: updatedPrefs.digest_frequency,
        });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setPreferences(updatedPrefs);
      
      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update notification preferences';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, preferences, toast]);

  const testSlackWebhook = useCallback(async (webhookUrl: string) => {
    try {
      const testMessage = {
        text: "PPC Pal Test Notification",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🧪 Test Notification",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "This is a test notification from PPC Pal. If you receive this, your Slack integration is working correctly!",
            },
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook test failed: ${response.status} ${response.statusText}`);
      }

      toast({
        title: "Success",
        description: "Test notification sent to Slack successfully!",
      });

      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send test notification';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Load preferences on user change
  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user, fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    testSlackWebhook,
    refetch: fetchPreferences,
  };
};