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
      
      console.log('Valid session found, token length:', session.access_token.length);
      
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
      if (!redirectUri || typeof redirectUri !== 'string') {
        throw new Error('Invalid redirect URI provided');
      }

      try {
        new URL(redirectUri);
      } catch {
        throw new Error('Redirect URI must be a valid URL');
      }

      // Get auth headers
      const headers = await this.getAuthHeaders();
      console.log('Auth headers prepared successfully');

      // Prepare request body - ensure it's properly formatted JSON
      const requestBody = {
        redirectUri: redirectUri.trim()
      };

      console.log('=== Making Request to Amazon OAuth Init ===');
      console.log('Request body:', JSON.stringify(requestBody));
      console.log('Headers (auth redacted):', { 
        ...headers, 
        Authorization: `Bearer ${headers.Authorization.substring(7, 27)}...` 
      });

      // Use supabase.functions.invoke with proper error handling
      console.log('Calling edge function...');
      const response = await supabase.functions.invoke('amazon-oauth-init', {
        body: requestBody,
        headers: headers
      });

      console.log('=== Edge Function Response ===');
      console.log('Response object:', {
        hasData: !!response.data,
        hasError: !!response.error,
        dataType: typeof response.data,
        errorType: typeof response.error
      });

      // Check for Supabase client errors first
      if (response.error) {
        console.error('=== Supabase Client Error ===');
        console.error('Client error:', response.error);
        
        // Handle different types of client errors
        let errorMessage = 'Failed to initialize Amazon connection';
        
        if (typeof response.error === 'object') {
          if (response.error.message) {
            errorMessage = response.error.message;
          } else if (response.error.details) {
            errorMessage = response.error.details;
          } else {
            errorMessage = JSON.stringify(response.error);
          }
        } else if (typeof response.error === 'string') {
          errorMessage = response.error;
        }
        
        this.toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        throw new Error(errorMessage);
      }

      // Check if we have response data
      if (!response.data) {
        console.error('=== No Response Data ===');
        throw new Error('No response received from server');
      }

      console.log('=== Response Data Received ===');
      console.log('Response data:', response.data);

      // Check for application-level errors in the response
      if (response.data.error) {
        console.error('=== Application Error ===');
        console.error('Application error:', response.data.error);
        console.error('Error details:', response.data.details);
        
        const errorMessage = response.data.details || response.data.error;
        
        this.toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        throw new Error(errorMessage);
      }

      // Validate auth URL
      if (!response.data.authUrl || typeof response.data.authUrl !== 'string') {
        console.error('=== Invalid Auth URL ===');
        console.error('Auth URL:', response.data.authUrl);
        throw new Error('No valid authorization URL received');
      }

      // Final URL validation
      try {
        const authUrl = new URL(response.data.authUrl);
        if (!authUrl.hostname.includes('amazon.com')) {
          throw new Error('Invalid Amazon authorization URL');
        }
        console.log('Auth URL validation passed');
      } catch (urlError) {
        console.error('Auth URL validation failed:', urlError);
        throw new Error('Invalid authorization URL format');
      }

      console.log('=== Success! Redirecting to Amazon ===');
      
      // Perform the redirect
      window.location.href = response.data.authUrl;
      
    } catch (err) {
      console.error('=== Connection Initiation Failed ===');
      console.error('Error:', err);
      
      let userMessage = 'Failed to connect to Amazon';
      
      if (err instanceof Error) {
        userMessage = err.message;
        
        // Provide specific guidance
        if (err.message.includes('Authentication') || err.message.includes('sign in')) {
          userMessage = 'Please refresh the page and sign in again.';
        } else if (err.message.includes('Server configuration')) {
          userMessage = 'Server configuration issue. Please contact support.';
        }
      }
      
      // Only show toast if we haven't already shown one
      if (!err.message || !err.message.includes('Failed to initialize Amazon connection')) {
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
