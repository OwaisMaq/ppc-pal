
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export class AmazonConnectionOperations {
  private toast: ReturnType<typeof useToast>['toast'];

  constructor(toast: ReturnType<typeof useToast>['toast']) {
    this.toast = toast;
  }

  async getAuthHeaders() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session error:', error);
      throw new Error('Authentication failed. Please sign in again.');
    }
    
    if (!session?.access_token) {
      throw new Error('No valid session found. Please sign in again.');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  async initiateConnection(redirectUri: string) {
    try {
      console.log('=== Initiating Amazon Connection ===');
      console.log('Redirect URI:', redirectUri);
      
      const headers = await this.getAuthHeaders();
      
      const { data, error } = await supabase.functions.invoke('amazon-oauth-init', {
        body: { redirectUri },
        headers
      });

      if (error) {
        console.error('OAuth init error:', error);
        throw new Error(error.message || 'Failed to initialize Amazon connection');
      }

      if (!data?.authUrl) {
        console.error('No auth URL returned:', data);
        throw new Error('Invalid response from Amazon OAuth service');
      }

      console.log('Auth URL generated, redirecting...');
      window.location.href = data.authUrl;
    } catch (err) {
      console.error('Connection initiation error:', err);
      throw err;
    }
  }

  async updateConnectionStatus(
    connectionId: string, 
    status: 'active' | 'expired' | 'error' | 'pending' | 'warning' | 'setup_required',
    setupRequiredReason?: string | null
  ) {
    console.log('=== Updating Connection Status ===');
    console.log('Connection ID:', connectionId);
    console.log('New Status:', status);
    console.log('Setup Required Reason:', setupRequiredReason);

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Handle setup_required_reason field
      if (setupRequiredReason !== undefined) {
        updateData.setup_required_reason = setupRequiredReason;
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
      throw err;
    }
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      console.log('=== Deleting Connection ===');
      console.log('Connection ID:', connectionId);

      // First delete related campaigns
      const { error: campaignsError } = await supabase
        .from('campaigns')
        .delete()
        .eq('connection_id', connectionId);

      if (campaignsError) {
        console.error('Failed to delete campaigns:', campaignsError);
      }

      // Then delete the connection
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
        description: "Amazon connection has been removed successfully",
      });

      console.log('Connection deleted successfully');
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

  async updateCampaignCount(connectionId: string, campaignCount: number) {
    console.log('=== Updating Campaign Count ===');
    console.log('Connection ID:', connectionId);
    console.log('Campaign Count:', campaignCount);

    try {
      const { error } = await supabase
        .from('amazon_connections')
        .update({
          campaign_count: campaignCount,
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) {
        console.error('Failed to update campaign count:', error);
        throw error;
      }

      console.log('Campaign count updated successfully');
    } catch (err) {
      console.error('Error updating campaign count:', err);
      throw err;
    }
  }
}
