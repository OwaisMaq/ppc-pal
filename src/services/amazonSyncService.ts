
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateProfileConfiguration } from '@/utils/amazonConnectionValidation';
import { AmazonConnectionOperations } from './amazonConnectionOperations';

interface SyncResponse {
  success: boolean;
  message: string;
  campaignsSynced?: number;
  campaignCount?: number;
  syncStatus?: string;
  error?: string;
  errorType?: string;
  requiresReconnection?: boolean;
  requiresSetup?: boolean;
  details?: string;
}

export class AmazonSyncService {
  private toast: ReturnType<typeof useToast>['toast'];
  private operations: AmazonConnectionOperations;

  constructor(toast: ReturnType<typeof useToast>['toast'], operations: AmazonConnectionOperations) {
    this.toast = toast;
    this.operations = operations;
  }

  async syncConnection(connectionId: string, refreshConnections: () => Promise<void>) {
    try {
      console.log('=== Sync Connection Started ===');
      console.log('Connection ID:', connectionId);
      
      // Step 1: Get auth headers with session validation
      console.log('=== Getting Auth Headers ===');
      let headers;
      try {
        headers = await this.operations.getAuthHeaders();
        console.log('Auth headers prepared successfully');
      } catch (authError) {
        console.error('=== Auth Header Error ===');
        console.error('Auth error:', authError);
        
        this.toast({
          title: "Authentication Required",
          description: authError.message || "Please sign in again to sync your Amazon connection.",
          variant: "destructive",
        });
        return;
      }
      
      // Step 2: Validate the connection exists and get its current state
      console.log('=== Validating Connection ===');
      const { data: connectionData, error: connectionError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connectionData) {
        console.error('Connection validation failed:', connectionError);
        throw new Error('Connection not found or access denied');
      }

      console.log('Connection data before sync:', {
        id: connectionData.id,
        status: connectionData.status,
        profile_id: connectionData.profile_id,
        profile_name: connectionData.profile_name
      });

      // Step 3: Show sync started message
      this.toast({
        title: "Sync Started",
        description: "Fetching your campaign data from Amazon. Please wait...",
      });
      
      // Step 4: Call Amazon Sync Function with proper headers and connectionId
      console.log('=== Calling Amazon Sync Function ===');
      console.log('Headers being sent:', {
        hasAuth: !!headers.Authorization,
        authLength: headers.Authorization?.length || 0
      });
      
      const { data, error } = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId }, // Always send the specific connectionId
        headers
      });

      console.log('=== Sync Response Received ===');
      console.log('Data present:', !!data);
      console.log('Error present:', !!error);
      console.log('Response data:', data);
      console.log('Response error:', error);

      // Handle response
      await this.handleSyncResponse(data, error, connectionId, refreshConnections);
      
    } catch (err) {
      console.error('=== Sync Connection Error ===');
      console.error('Error type:', typeof err);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Full error object:', err);
      
      let userMessage = 'Failed to sync campaign data';
      let statusUpdate: 'error' | 'warning' = 'error';
      
      if (err instanceof Error) {
        userMessage = err.message;
        
        if (err.message.includes('Authentication') || err.message.includes('auth') || err.message.includes('sign in')) {
          userMessage = 'Please reconnect your Amazon account and try again.';
          statusUpdate = 'error';
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          userMessage = 'Network error. Please check your connection and try again.';
          statusUpdate = 'warning';
        } else if (err.message.includes('Profile') || err.message.includes('setup')) {
          statusUpdate = 'warning';
        }
      }
      
      await this.operations.updateConnectionStatus(connectionId, statusUpdate, userMessage);
      
      this.toast({
        title: "Sync Failed",
        description: userMessage,
        variant: "destructive",
      });
    }
  }

  private async handleSyncResponse(data: SyncResponse, error: any, connectionId: string, refreshConnections: () => Promise<void>) {
    // Step 5: Handle edge function errors
    if (error) {
      console.error('=== Sync Edge Function Error ===');
      console.error('Error type:', typeof error);
      console.error('Error details:', error);
      
      let userMessage = 'Failed to sync campaign data';
      let errorType = 'unknown_error';
      
      if (typeof error === 'object' && error.message) {
        userMessage = error.message;
        errorType = 'server_error';
      } else if (typeof error === 'string') {
        userMessage = error;
        if (error.includes('401') || error.includes('Unauthorized')) {
          errorType = 'auth_error';
          userMessage = 'Authentication failed. Please reconnect your Amazon account.';
        } else if (error.includes('403') || error.includes('Forbidden')) {
          errorType = 'permission_error';
          userMessage = 'Access denied. Please check your Amazon Advertising permissions.';
        }
      }
      
      await this.operations.updateConnectionStatus(connectionId, errorType === 'auth_error' ? 'error' : 'warning', userMessage);
      throw new Error(userMessage);
    }

    // Step 6: Handle server response - check for success first
    if (!data.success && data.error) {
      console.error('=== Sync Server Response Error ===');
      console.error('Server error:', data.error);
      console.error('Error type:', data.errorType);
      console.error('Requires reconnection:', data.requiresReconnection);
      console.error('Requires setup:', data.requiresSetup);
      
      if (data.requiresSetup) {
        this.toast({
          title: "Amazon Advertising Setup Required",
          description: data.details || "Please set up your Amazon Advertising account at advertising.amazon.com first, then try 'Enhanced Sync' to import your campaigns.",
          variant: "destructive",
        });
        await this.operations.updateConnectionStatus(connectionId, 'setup_required', 'Amazon Advertising setup required');
      } else if (data.requiresReconnection) {
        this.toast({
          title: "Reconnection Required",
          description: data.details || "Please reconnect your Amazon account to continue syncing",
          variant: "destructive",
        });
        await this.operations.updateConnectionStatus(connectionId, 'error', 'Token expired or invalid');
      } else {
        this.toast({
          title: "Sync Failed",
          description: data.details || data.error,
          variant: "destructive",
        });
        await this.operations.updateConnectionStatus(connectionId, 'error', data.error);
      }
      
      await refreshConnections();
      return;
    }

    // Step 7: Handle successful sync responses
    console.log('=== Sync Successful ===');
    const campaignCount = data.campaignsSynced || data.campaignCount || 0;
    const syncStatus = data.syncStatus || 'success';
    
    if (syncStatus === 'success_no_campaigns' || campaignCount === 0) {
      // Successful sync but no campaigns found - this is normal and should be active
      await this.operations.updateConnectionStatus(connectionId, 'active', 'Sync successful');
      this.toast({
        title: "Sync Complete",
        description: data.message || "Sync completed successfully. No campaigns found in your Amazon account - this is normal for new advertising accounts.",
      });
    } else {
      // Successful sync with campaigns
      await this.operations.updateConnectionStatus(connectionId, 'active', 'Sync successful');
      this.toast({
        title: "Sync Complete",
        description: data.message || `Successfully synced ${campaignCount} campaigns from Amazon.`,
      });
    }

    console.log('=== Refreshing Connections After Successful Sync ===');
    await refreshConnections();
  }
}
