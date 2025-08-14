import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBudgetUsageSync = () => {
  const [isLoading, setIsLoading] = useState(false);

  const syncBudgetUsage = async (connectionId: string, dateRangeDays: number = 30) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('budget-usage-sync', {
        body: { 
          connectionId, 
          dateRangeDays 
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.message || 'Budget usage sync failed');
      }

      toast.success(`Budget usage synced: ${data.processed} records processed`);
      return data;
    } catch (error: any) {
      console.error('Budget usage sync error:', error);
      toast.error(`Budget sync failed: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncBudgetUsage,
    isLoading
  };
};