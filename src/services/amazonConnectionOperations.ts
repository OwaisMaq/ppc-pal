
import { supabase } from '@/integrations/supabase/client';
import { toast as ToastFunction } from '@/hooks/use-toast';

export class AmazonConnectionOperations {
  private toast: ToastFunction['toast'];

  constructor(toast: ToastFunction['toast']) {
    this.toast = toast;
  }

  async initiateConnection(redirectUri: string): Promise<void> {
    console.log('=== Initiating Amazon Connection ===');
    console.log('Redirect URI:', redirectUri);

    try {
      // Ensure we have a valid redirect URI
      if (!redirectUri || !redirectUri.startsWith('https://')) {
        throw new Error('Invalid redirect URI provided');
      }

      // Make sure we have proper request body
      const requestBody = {
        redirectUri: redirectUri
      };

      console.log('=== Calling OAuth Init Function ===');
      console.log('Request body:', requestBody);

      const { data, error } = await supabase.functions.invoke('amazon-oauth-init', {
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('=== OAuth Init Response ===');
      console.log('Data present:', !!data);
      console.log('Error present:', !!error);

      if (error) {
        console.error('OAuth init error:', error);
        throw new Error(error.message || 'Failed to initialize OAuth flow');
      }

      if (!data || !data.authUrl) {
        console.error('No auth URL received from server');
        throw new Error('No authorization URL received from server');
      }

      console.log('=== Redirecting to Amazon OAuth ===');
      console.log('Auth URL received, redirecting...');
      
      // Redirect to Amazon OAuth page
      window.location.href = data.authUrl;
      
    } catch (err) {
      console.error('Connection initiation error:', err);
      
      let userMessage = 'Failed to initiate Amazon connection';
      if (err instanceof Error) {
        if (err.message.includes('Edge Function returned a non-2xx status code')) {
          userMessage = 'Server configuration error. Please contact support.';
        } else if (err.message.includes('Network')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else {
          userMessage = err.message;
        }
      }
      
      throw new Error(userMessage);
    }
  }

  async updateConnectionStatus(
    connectionId: string, 
    status: 'active' | 'expired' | 'error' | 'pending' | 'warning' | 'setup_required', 
    reason?: string
  ): Promise<void> {
    console.log('=== Updating Connection Status ===');
    console.log('Connection ID:', connectionId);
    console.log('New status:', status);
    console.log('Reason:', reason);

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (reason) {
        updateData.setup_required_reason = reason;
      }

      const { data, error } = await supabase
        .from('amazon_connections')
        .update(updateData)
        .eq('id', connectionId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update connection status:', error);
        throw error;
      }

      console.log('Connection status updated successfully:', data);
    } catch (err) {
      console.error('Error updating connection status:', err);
      // Don't throw here to avoid breaking the sync flow
    }
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    console.log('=== Deleting Amazon Connection ===');
    console.log('Connection ID:', connectionId);

    try {
      // Delete campaigns first (due to foreign key constraints)
      const { error: campaignsError } = await supabase
        .from('campaigns')
        .delete()
        .eq('connection_id', connectionId);

      if (campaignsError) {
        console.error('Failed to delete campaigns:', campaignsError);
        this.toast({
          title: "Delete Failed",
          description: "Failed to delete associated campaigns",
          variant: "destructive",
        });
        return false;
      }

      // Delete the connection
      const { error: connectionError } = await supabase
        .from('amazon_connections')
        .delete()
        .eq('id', connectionId);

      if (connectionError) {
        console.error('Failed to delete connection:', connectionError);
        this.toast({
          title: "Delete Failed",
          description: "Failed to delete Amazon connection",
          variant: "destructive",
        });
        return false;
      }

      this.toast({
        title: "Connection Deleted",
        description: "Amazon connection and associated data have been removed",
      });

      return true;
    } catch (err) {
      console.error('Delete connection error:', err);
      this.toast({
        title: "Delete Failed",
        description: "An error occurred while deleting the connection",
        variant: "destructive",
      });
      return false;
    }
  }
}
