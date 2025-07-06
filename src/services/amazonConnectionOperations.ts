
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ToastFunction = ReturnType<typeof useToast>['toast'];

export class AmazonConnectionOperations {
  private toast: ToastFunction;

  constructor(toast: ToastFunction) {
    this.toast = toast;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    console.log('=== Getting Auth Headers ===');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        throw new Error('Authentication failed - please sign in again');
      }
      
      if (!session?.access_token) {
        console.error('No valid session found');
        throw new Error('No valid session - please sign in again');
      }
      
      console.log('Valid session found, preparing headers');
      
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
      
    } catch (err) {
      console.error('Auth header preparation failed:', err);
      throw new Error(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  async initiateConnection(redirectUri: string): Promise<void> {
    console.log('=== Initiating Amazon Connection ===');
    console.log('Redirect URI:', redirectUri);

    try {
      // Ensure we have a valid redirect URI
      if (!redirectUri || !redirectUri.startsWith('https://')) {
        throw new Error('Invalid redirect URI provided');
      }

      // Get auth headers first
      const headers = await this.getAuthHeaders();
      console.log('=== Auth Headers Prepared ===');

      // Make sure we have proper request body - the edge function expects 'redirectUri' not 'redirect_uri'
      const requestBody = {
        redirectUri: redirectUri
      };

      console.log('=== Calling OAuth Init Function ===');
      console.log('Request body:', requestBody);
      console.log('Headers:', { ...headers, Authorization: 'Bearer [REDACTED]' });

      const { data, error } = await supabase.functions.invoke('amazon-oauth-init', {
        body: requestBody,
        headers: headers
      });

      console.log('=== OAuth Init Response ===');
      console.log('Data present:', !!data);
      console.log('Error present:', !!error);

      if (error) {
        console.error('OAuth init error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Enhanced error handling for different error types
        if (error.message?.includes('Edge Function returned a non-2xx status code')) {
          throw new Error('Server configuration error. Please contact support.');
        } else if (error.message?.includes('Network')) {
          throw new Error('Network error. Please check your connection and try again.');
        } else {
          throw new Error(error.message || 'Failed to initialize OAuth flow');
        }
      }

      if (!data || !data.authUrl) {
        console.error('No auth URL received from server');
        console.error('Response data:', data);
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
