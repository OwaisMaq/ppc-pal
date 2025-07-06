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
      // Validate redirect URI first
      if (!redirectUri || !redirectUri.startsWith('https://')) {
        throw new Error('Invalid redirect URI provided');
      }

      // Get auth headers
      const headers = await this.getAuthHeaders();
      console.log('Auth headers prepared successfully');

      // Prepare request body - make sure it's exactly what the edge function expects
      const requestBody = {
        redirectUri: redirectUri
      };

      console.log('=== Making request to amazon-oauth-init ===');
      console.log('Request body:', requestBody);
      console.log('Headers (auth redacted):', { 
        ...headers, 
        Authorization: `Bearer ${headers.Authorization.substring(0, 20)}...` 
      });

      // Use supabase.functions.invoke with proper error handling
      const response = await supabase.functions.invoke('amazon-oauth-init', {
        body: requestBody,
        headers: headers
      });

      console.log('=== Raw Response from Edge Function ===');
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);

      // Handle edge function errors
      if (response.error) {
        console.error('=== Edge Function Error ===');
        console.error('Error details:', response.error);
        
        let errorMessage = 'Failed to initialize Amazon connection';
        
        // Parse error message if possible
        if (response.error.message) {
          errorMessage = response.error.message;
        } else if (typeof response.error === 'string') {
          errorMessage = response.error;
        }
        
        throw new Error(errorMessage);
      }

      // Check if we have valid response data
      if (!response.data) {
        console.error('No response data received');
        throw new Error('No response received from server');
      }

      // Check for error in response data
      if (response.data.error) {
        console.error('Server returned error:', response.data.error);
        throw new Error(response.data.details || response.data.error);
      }

      // Check for auth URL in response
      if (!response.data.authUrl) {
        console.error('No auth URL in response:', response.data);
        throw new Error('No authorization URL received from server');
      }

      console.log('=== Success! Redirecting to Amazon OAuth ===');
      console.log('Auth URL length:', response.data.authUrl.length);
      
      // Redirect to Amazon OAuth
      window.location.href = response.data.authUrl;
      
    } catch (err) {
      console.error('=== Connection Initiation Error ===');
      console.error('Error type:', typeof err);
      console.error('Error details:', err);
      
      let userMessage = 'Failed to connect to Amazon';
      
      if (err instanceof Error) {
        userMessage = err.message;
        
        // Provide more specific error messages for common issues
        if (err.message.includes('Authentication') || err.message.includes('sign in')) {
          userMessage = 'Please sign in again and try connecting to Amazon';
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          userMessage = 'Network error. Please check your internet connection and try again';
        } else if (err.message.includes('Invalid JSON') || err.message.includes('parse')) {
          userMessage = 'Server communication error. Please try again';
        }
      }
      
      this.toast({
        title: "Connection Failed",
        description: userMessage,
        variant: "destructive",
      });
      
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
