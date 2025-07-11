
import { supabase } from '@/integrations/supabase/client';
import { validateOAuthResponse, type OAuthResponse } from '@/lib/validation/amazonApiSchemas';
import { errorTracker } from './errorTracker';

interface ToastFunction {
  (props: { title: string; description: string; variant?: 'default' | 'destructive' }): void;
}

export class AmazonConnectionOperations {
  private toast: ToastFunction;

  constructor(toastFn: ToastFunction) {
    this.toast = toastFn;
  }

  async getAuthHeaders(): Promise<{ [key: string]: string }> {
    console.log('=== Getting Auth Headers ===');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
    
    if (!session?.access_token) {
      console.error('No valid session found');
      throw new Error('No valid session found. Please log in again.');
    }
    
    console.log('Valid session found, token length:', session.access_token.length);
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  async initiateConnection(redirectUri: string): Promise<string> {
    console.log('=== Initiating Amazon Connection ===');
    console.log('Redirect URI:', redirectUri);

    try {
      const headers = await this.getAuthHeaders();
      console.log('Auth headers prepared successfully');
      
      console.log('=== Making Request to Amazon OAuth Init ===');
      console.log('Request body:', JSON.stringify({ redirectUri }, null, 2));
      console.log('Headers (auth redacted):', {
        ...headers,
        'Authorization': headers.Authorization ? `Bearer ${headers.Authorization.substring(7, 27)}...` : 'Missing'
      });
      
      console.log('Calling edge function...');
      const response = await supabase.functions.invoke('amazon-oauth-init', {
        body: { redirectUri },
        headers
      });

      console.log('=== Edge Function Response ===');
      console.log('Response object:', {
        hasData: !!response.data,
        hasError: !!response.error,
        dataType: typeof response.data,
        errorType: typeof response.error
      });

      if (response.error) {
        console.error('=== Supabase Client Error ===');
        console.error('Client error:', response.error);
        
        errorTracker.captureAmazonError(response.error, {
          operation: 'initiate_connection',
          endpoint: 'amazon-oauth-init'
        });
        
        // Handle specific error types
        if (response.error.message?.includes('non-2xx status code')) {
          throw new Error('Server configuration error. Please check that Amazon credentials are properly configured.');
        }
        
        throw new Error(response.error.message || 'Failed to initiate Amazon connection');
      }

      // Validate response format
      const validationResult = validateOAuthResponse(response.data);
      if (!validationResult.success) {
        console.error('=== Invalid OAuth Response Format ===');
        console.error('Validation errors:', validationResult.error.issues);
        
        errorTracker.captureAmazonError('Invalid OAuth response format', {
          operation: 'initiate_connection'
        });
        
        throw new Error('Received invalid response format from server');
      }

      const data = validationResult.data;
      
      if (!data.authUrl) {
        console.error('=== Missing Auth URL ===');
        console.error('Response data:', data);
        
        errorTracker.captureAmazonError('Missing auth URL in response', {
          operation: 'initiate_connection'
        });
        
        throw new Error('Server did not provide authorization URL');
      }

      console.log('=== Redirecting to Amazon ===');
      console.log('Auth URL length:', data.authUrl.length);
      
      // Redirect to Amazon OAuth
      window.location.href = data.authUrl;
      
      return data.authUrl;
      
    } catch (error) {
      console.error('=== Connection Initiation Failed ===');
      console.error('Error:', error);
      
      errorTracker.captureAmazonError(error as Error, {
        operation: 'initiate_connection'
      });
      
      // Re-throw with user-friendly message
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('An unexpected error occurred while connecting to Amazon');
    }
  }

  async handleOAuthCallback(code: string, state: string): Promise<{ profileCount: number }> {
    console.log('=== Handling OAuth Callback ===');
    
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await supabase.functions.invoke('amazon-oauth-callback', {
        body: { code, state },
        headers
      });

      if (response.error) {
        console.error('OAuth callback error:', response.error);
        
        errorTracker.captureAmazonError(response.error, {
          operation: 'oauth_callback'
        });
        
        throw new Error(response.error.message || 'OAuth callback failed');
      }

      const validationResult = validateOAuthResponse(response.data);
      if (!validationResult.success) {
        console.error('Invalid OAuth callback response:', validationResult.error.issues);
        
        errorTracker.captureAmazonError('Invalid OAuth callback response format', {
          operation: 'oauth_callback'
        });
        
        throw new Error('Received invalid response format');
      }

      const data = validationResult.data;
      
      if (!data.success) {
        throw new Error(data.error || 'OAuth callback failed');
      }

      return {
        profileCount: data.profile_count || 0
      };
      
    } catch (error) {
      console.error('OAuth callback processing error:', error);
      
      errorTracker.captureAmazonError(error as Error, {
        operation: 'oauth_callback'
      });
      
      throw error;
    }
  }

  async updateConnectionStatus(
    connectionId: string, 
    status: 'active' | 'setup_required' | 'error' | 'expired' | 'warning',
    reason?: string
  ): Promise<void> {
    console.log('=== Updating Connection Status ===');
    console.log('Connection ID:', connectionId);
    console.log('New Status:', status);
    console.log('Reason:', reason);
    
    try {
      const { error } = await supabase
        .from('amazon_connections')
        .update({
          status,
          setup_required_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) {
        console.error('Failed to update connection status:', error);
        
        errorTracker.captureAmazonError(error, {
          connectionId,
          operation: 'update_connection_status'
        });
        
        throw new Error(`Failed to update connection status: ${error.message}`);
      }
      
      console.log('Connection status updated successfully');
      
    } catch (error) {
      console.error('Error updating connection status:', error);
      
      errorTracker.captureAmazonError(error as Error, {
        connectionId,
        operation: 'update_connection_status'
      });
      
      throw error;
    }
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    console.log('=== Deleting Amazon Connection ===');
    console.log('Connection ID:', connectionId);

    try {
      const { error } = await supabase
        .from('amazon_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        console.error('Failed to delete connection:', error);
        
        errorTracker.captureAmazonError(error, {
          connectionId,
          operation: 'delete_connection'
        });
        
        this.toast({
          title: "Delete Failed",
          description: `Failed to delete connection: ${error.message}`,
          variant: "destructive",
        });
        
        return false;
      }
      
      console.log('Connection deleted successfully');
      
      this.toast({
        title: "Connection Deleted",
        description: "Amazon connection has been successfully removed.",
      });
      
      return true;
      
    } catch (error) {
      console.error('Error deleting connection:', error);
      
      errorTracker.captureAmazonError(error as Error, {
        connectionId,
        operation: 'delete_connection'
      });
      
      this.toast({
        title: "Delete Failed",
        description: "An unexpected error occurred while deleting the connection.",
        variant: "destructive",
      });
      
      return false;
    }
  }
}
