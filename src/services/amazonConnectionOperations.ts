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

      // Prepare request body - ensure it matches what the edge function expects
      const requestBody = {
        redirectUri: redirectUri
      };

      console.log('=== Making request to amazon-oauth-init ===');
      console.log('Request body:', requestBody);
      console.log('Headers (auth redacted):', { 
        ...headers, 
        Authorization: `Bearer ${headers.Authorization.substring(0, 20)}...` 
      });

      // Use supabase.functions.invoke with enhanced error handling
      const response = await supabase.functions.invoke('amazon-oauth-init', {
        body: requestBody,
        headers: headers
      });

      console.log('=== Raw Response from Edge Function ===');
      console.log('Response structure:', {
        hasData: !!response.data,
        hasError: !!response.error,
        dataType: typeof response.data,
        errorType: typeof response.error
      });
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);

      // Handle edge function errors with detailed logging
      if (response.error) {
        console.error('=== Edge Function Error Details ===');
        console.error('Error object:', response.error);
        console.error('Error message:', response.error.message);
        console.error('Error context:', response.error.context);
        
        let errorMessage = 'Failed to initialize Amazon connection';
        let debugInfo = '';
        
        // Extract detailed error information
        if (response.error.message) {
          errorMessage = response.error.message;
        } else if (typeof response.error === 'string') {
          errorMessage = response.error;
        }

        // Check if we have debug information from the edge function
        if (response.data && response.data.debug) {
          debugInfo = JSON.stringify(response.data.debug, null, 2);
          console.error('Debug info from edge function:', debugInfo);
        }
        
        // Show detailed error message to user
        this.toast({
          title: "Connection Failed",
          description: `${errorMessage}${debugInfo ? `\n\nDebug: ${debugInfo}` : ''}`,
          variant: "destructive",
        });
        
        throw new Error(errorMessage);
      }

      // Check if we have valid response data
      if (!response.data) {
        console.error('No response data received from edge function');
        throw new Error('No response received from server');
      }

      // Check for error in response data (edge function might return error in data)
      if (response.data.error) {
        console.error('=== Server Returned Error in Data ===');
        console.error('Error details:', response.data.error);
        console.error('Error message:', response.data.details);
        console.error('Debug info:', response.data.debug);
        
        let errorMessage = response.data.details || response.data.error;
        
        // Include debug information if available
        if (response.data.debug) {
          const debugInfo = JSON.stringify(response.data.debug, null, 2);
          console.error('Debug details:', debugInfo);
          errorMessage += `\n\nDebug: ${debugInfo}`;
        }
        
        this.toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        throw new Error(response.data.details || response.data.error);
      }

      // Check for auth URL in response
      if (!response.data.authUrl) {
        console.error('=== Missing Auth URL in Response ===');
        console.error('Response data:', response.data);
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
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      
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
      
      // Only show toast if we haven't already shown one
      if (!err.message || !err.message.includes('Debug:')) {
        this.toast({
          title: "Connection Failed",
          description: userMessage,
          variant: "destructive",
        });
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
