
import { useToast } from '@/hooks/use-toast';
import { amazonConnectionService } from '@/services/amazonConnectionService';

export const useConnectionOperations = () => {
  const { toast } = useToast();

  const syncConnection = async (connectionId: string, onSuccess?: () => void) => {
    try {
      console.log('Starting manual sync for connection:', connectionId);
      const result = await amazonConnectionService.syncConnection(connectionId);
      
      toast({
        title: "Success",
        description: result?.message || "Campaign data sync completed successfully!",
      });
      
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error('Error syncing connection:', error);
      
      let errorMessage = "Failed to sync Amazon data";
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          errorMessage = "Your Amazon token has expired. Please reconnect your account.";
        } else if (error.message.includes('regions')) {
          errorMessage = "Unable to connect to Amazon's API. Please try again later.";
        }
      }
      
      toast({
        title: "Sync Error",
        description: errorMessage,
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
