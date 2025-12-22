import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useRevertAction = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const revertAction = async (actionId: string, reason?: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('revert-action', {
        body: { action_id: actionId, reason },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to revert action');
      }

      toast({
        title: 'Action Reverted',
        description: 'The action has been successfully undone.',
      });

      return true;
    } catch (error) {
      console.error('Error reverting action:', error);
      
      toast({
        title: 'Revert Failed',
        description: error instanceof Error ? error.message : 'Could not revert the action',
        variant: 'destructive',
      });

      return false;
    } finally {
      setLoading(false);
    }
  };

  return { revertAction, loading };
};
