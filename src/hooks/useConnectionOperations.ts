
import { useToast } from '@/hooks/use-toast';
import { amazonConnectionService } from '@/services/amazonConnectionService';

export const useConnectionOperations = () => {
  const { toast } = useToast();

  const syncConnection = async (connectionId: string, onSuccess?: () => void) => {
    try {
      await amazonConnectionService.syncConnection(connectionId);
      
      toast({
        title: "Success",
        description: "Campaign data sync started! This may take a few minutes.",
      });
      
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error('Error syncing connection:', error);
      toast({
        title: "Error",
        description: "Failed to sync Amazon data",
        variant: "destructive",
      });
    }
  };

  const deleteConnection = async (connectionId: string, onSuccess?: () => void) => {
    try {
      await amazonConnectionService.deleteConnection(connectionId);
      
      toast({
        title: "Success",
        description: "Amazon connection deleted successfully!",
      });
      
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Error",
        description: "Failed to delete Amazon connection",
        variant: "destructive",
      });
    }
  };

  return {
    syncConnection,
    deleteConnection
  };
};
