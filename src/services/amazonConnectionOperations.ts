
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AmazonConnection } from '@/hooks/useAmazonConnections';

export class AmazonConnectionOperations {
  private toast: ReturnType<typeof useToast>['toast'];

  constructor(toast: ReturnType<typeof useToast>['toast']) {
    this.toast = toast;
  }

  async getAuthHeaders() {
    console.log('=== Getting Auth Headers for Amazon Operations ===');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Session validation:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      sessionError: sessionError?.message,
      tokenLength: session?.access_token?.length || 0
    });
    
    if (sessionError) {
      console.error('Session error in Amazon connections:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      console.error('No access token available for Amazon operations');
      throw new Error('Authentication required. Please sign in again.');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  async updateConnectionStatus(connectionId: string, status: 'active' | 'expired' | 'error' | 'pending' | 'warning' | 'setup_required', reason?: string) {
    try {
      console.log(`=== Updating Connection Status ===`);
      console.log('Connection ID:', connectionId);
      console.log('New status:', status);
      console.log('Reason:', reason);

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('amazon_connections')
        .update(updateData)
        .eq('id', connectionId);

      if (updateError) {
        console.error('Failed to update connection status:', updateError);
      } else {
        console.log('Connection status updated successfully');
      }
    } catch (err) {
      console.error('Error updating connection status:', err);
    }
  }

  async initiateConnection(redirectUri: string) {
    try {
      console.log('=== Initiating Amazon Connection ===');
      
      this.toast({
        title: "Connecting to Amazon",
        description: "Initializing connection to Amazon Advertising...",
      });
      
      const { data, error } = await supabase.functions.invoke('amazon-oauth-init', {
        body: { redirectUri }
      });

      console.log('=== OAuth Init Response ===');
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        console.error('=== OAuth Init Error ===');
        console.error('Error details:', error);
        
        let userMessage = 'Failed to initialize Amazon connection';
        if (typeof error === 'object' && error.message) {
          userMessage = error.message;
        } else if (typeof error === 'string') {
          userMessage = error;
        }
        
        throw new Error(userMessage);
      }

      if (data?.error) {
        console.error('=== OAuth Init Returned Error ===');
        console.error('Server error:', data.error);
        throw new Error(data.details || data.error);
      }

      if (data?.authUrl) {
        console.log('=== Redirecting to Amazon ===');
        setTimeout(() => {
          window.location.href = data.authUrl;
        }, 100);
      } else {
        throw new Error('No authorization URL received from server');
      }
    } catch (err) {
      console.error('=== Connection Initiation Error ===');
      console.error('Error:', err);
      
      let userMessage = 'Failed to initiate Amazon connection';
      if (err instanceof Error) {
        userMessage = err.message;
      }
      
      this.toast({
        title: "Connection Failed",
        description: userMessage,
        variant: "destructive",
      });
    }
  }

  async deleteConnection(connectionId: string) {
    try {
      console.log('=== Deleting Connection ===');
      console.log('Connection ID:', connectionId);
      
      const { error } = await (supabase as any)
        .from('amazon_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        console.error('=== Delete Error ===');
        console.error('Error details:', error);
        throw error;
      }

      this.toast({
        title: "Connection Removed",
        description: "Amazon connection has been removed successfully.",
      });

      return true;
    } catch (err) {
      console.error('=== Delete Connection Error ===');
      console.error('Error:', err);
      
      let userMessage = 'Failed to remove connection';
      if (err instanceof Error) {
        userMessage = err.message;
      }
      
      this.toast({
        title: "Delete Failed",
        description: userMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }
}
