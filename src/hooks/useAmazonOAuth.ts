
import { useToast } from '@/hooks/use-toast';
import { amazonConnectionService } from '@/services/amazonConnectionService';

export const useAmazonOAuth = () => {
  const { toast } = useToast();

  const initiateConnection = async (redirectUri: string) => {
    try {
      const authUrl = await amazonConnectionService.initiateOAuth(redirectUri);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating connection:', error);
      toast({
        title: "Error",
        description: "Failed to initiate Amazon connection. Please check your API credentials.",
        variant: "destructive",
      });
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const redirectUri = `${window.location.origin}/auth/amazon/callback`;
      const data = await amazonConnectionService.handleOAuthCallback(code, state, redirectUri);
      
      toast({
        title: "Success",
        description: data.warning || `Amazon account connected successfully! Found ${data.profileCount} advertising profiles.`,
      });
      
      return data;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      toast({
        title: "Error",
        description: "Failed to complete Amazon connection",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    initiateConnection,
    handleOAuthCallback
  };
};
