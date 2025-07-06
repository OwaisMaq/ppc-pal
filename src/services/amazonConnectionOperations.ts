
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export class AmazonConnectionOperations {
  private toast: ReturnType<typeof toast>['toast'];

  constructor(toastFn: ReturnType<typeof toast>['toast']) {
    this.toast = toastFn;
  }

  async getAuthHeaders() {
    console.log('=== Getting Auth Headers ===');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session error:', error);
      throw new Error('Failed to get session');
    }
    
    if (!session?.access_token) {
      console.error('No session or access token found');
      throw new Error('Please sign in to continue');
    }
    
    console.log('Valid session found, token length:', session.access_token.length);
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  async initiateConnection(redirectUri: string) {
    console.log('=== Initiating Amazon Connection ===');
    console.log('Redirect URI:', redirectUri);
    
    try {
      // Get auth headers
      const headers = await this.getAuthHeaders();
      console.log('Auth headers prepared successfully');
      
      // Prepare request body
      const requestBody = { redirectUri };
      console.log('=== Making Request to Amazon OAuth Init ===');
      console.log('Request body:', requestBody);
      console.log('Headers (auth redacted):', {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...',
        'Content-Type': 'application/json'
      });
      
      console.log('Calling edge function...');
      
      // Make the request to the edge function
      const response = await supabase.functions.invoke('amazon-oauth-init', {
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': headers.Authorization
        }
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
        throw new Error(typeof response.error === 'string' ? response.error : 'Edge Function returned a non-2xx status code');
      }
      
      if (!response.data) {
        console.error('=== No Response Data ===');
        throw new Error('No data received from OAuth initialization');
      }
      
      if (!response.data.authUrl) {
        console.error('=== Missing Auth URL ===');
        console.error('Response data:', response.data);
        throw new Error('No authorization URL received');
      }
      
      console.log('=== Redirecting to Amazon OAuth ===');
      console.log('Auth URL length:', response.data.authUrl.length);
      
      // Redirect to Amazon OAuth
      window.location.href = response.data.authUrl;
      
    } catch (err) {
      console.error('=== Connection Initiation Failed ===');
      console.error('Error:', err);
      
      let userMessage = 'Failed to initiate Amazon connection';
      
      if (err instanceof Error) {
        if (err.message.includes('sign in')) {
          userMessage = 'Please sign in and try again';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else {
          userMessage = err.message;
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
    reason?: string | null
  ) {
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
      } else if (status === 'active') {
        updateData.setup_required_reason = null;
      }
      
      const { error } = await supabase
        .from('amazon_connections')
        .update(updateData)
        .eq('id', connectionId);
      
      if (error) {
        console.error('Failed to update connection status:', error);
        throw error;
      }
      
      console.log('Connection status updated successfully');
    } catch (err) {
      console.error('Error updating connection status:', err);
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
        this.toast({
          title: "Delete Failed",
          description: "Failed to delete the Amazon connection",
          variant: "destructive",
        });
        return false;
      }
      
      this.toast({
        title: "Connection Deleted",
        description: "Amazon connection has been removed successfully",
      });
      
      console.log('Connection deleted successfully');
      return true;
      
    } catch (err) {
      console.error('Error deleting connection:', err);
      this.toast({
        title: "Delete Failed",
        description: "An error occurred while deleting the connection",
        variant: "destructive",
      });
      return false;
    }
  }
}
