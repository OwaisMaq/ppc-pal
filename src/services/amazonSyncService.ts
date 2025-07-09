import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { errorTracker } from '@/services/errorTracker';
import { AmazonConnectionOperations } from './amazonConnectionOperations';
import { validateSyncResponse } from '@/lib/validation/amazonApiSchemas';

export class AmazonSyncService {
  private toast: typeof toast;
  private operations: AmazonConnectionOperations;

  constructor(toastFn: typeof toast, operations: AmazonConnectionOperations) {
    this.toast = toastFn;
    this.operations = operations;
  }

  async syncConnection(
    connectionId: string,
    refreshConnections: () => Promise<void>
  ): Promise<void> {
    console.log('=== Amazon Sync Service - Starting Sync ===');
    console.log('Connection ID:', connectionId);

    try {
      // Show loading state
      this.toast.info("Sync Starting", {
        description: "Connecting to Amazon and syncing your campaigns..."
      });

      // Get auth headers
      const headers = await this.operations.getAuthHeaders();
      console.log('Auth headers prepared successfully');

      // Call sync function
      console.log('Calling amazon-sync edge function...');
      const response = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId },
        headers
      });

      console.log('=== Sync Response Received ===');
      console.log('Response:', response);

      // Handle Supabase client errors
      if (response.error) {
        console.error('=== Supabase Client Error ===');
        console.error('Error:', response.error);
        
        errorTracker.captureAmazonError(response.error, {
          connectionId,
          operation: 'sync',
          endpoint: 'amazon-sync'
        });
        
        await this.handleSyncError(response.error, connectionId);
        await refreshConnections();
        return;
      }

      // Validate and handle response
      const validationResult = validateSyncResponse(response.data);
      if (!validationResult.success) {
        console.error('=== Invalid Response Format ===');
        console.error('Validation errors:', validationResult.error.issues);
        
        errorTracker.captureAmazonError('Invalid sync response format', {
          connectionId,
          operation: 'sync'
        });
        
        this.toast.error("Sync Error", {
          description: "Received unexpected response format. Please try again."
        });
        
        await refreshConnections();
        return;
      }

      // Now we know the validation was successful, so we can access the data
      const data = validationResult.data;

      // Handle sync results - check the data properties directly
      if (!data.success || data.error) {
        console.log('=== Sync Failed ===');
        await this.handleSyncFailure(data, connectionId);
      } else {
        console.log('=== Sync Successful ===');
        await this.handleSyncSuccess(data, connectionId);
      }

      await refreshConnections();

    } catch (err) {
      console.error('=== Sync Service Error ===');
      console.error('Error:', err);
      
      errorTracker.captureAmazonError(err as Error, {
        connectionId,
        operation: 'sync'
      });
      
      await this.handleSyncError(err, connectionId);
      await refreshConnections();
    }
  }

  private async handleSyncSuccess(data: any, connectionId: string): Promise<void> {
    const campaignCount = data.campaignCount || data.campaigns_synced || 0;
    
    // Update connection status
    await this.operations.updateConnectionStatus(connectionId, 'active');
    
    // Show success message
    const successMessage = campaignCount > 0 
      ? `Successfully synced ${campaignCount} campaigns`
      : "Amazon connection synced successfully";
    
    this.toast.success("Sync Complete", {
      description: successMessage
    });
  }

  private async handleSyncFailure(data: any, connectionId: string): Promise<void> {
    if (data.requiresSetup) {
      await this.operations.updateConnectionStatus(
        connectionId, 
        'setup_required', 
        data.details || 'Amazon Advertising setup required'
      );
      
      this.toast.warning("Setup Required", {
        description: data.details || "Please set up your Amazon Advertising account first"
      });
    } else if (data.requiresReconnection) {
      await this.operations.updateConnectionStatus(
        connectionId, 
        'expired', 
        data.details || 'Token expired or invalid'
      );
      
      this.toast.error("Reconnection Required", {
        description: data.details || "Please reconnect your Amazon account"
      });
    } else {
      await this.operations.updateConnectionStatus(
        connectionId, 
        'error', 
        data.error || 'Unknown sync error'
      );
      
      this.toast.error("Sync Failed", {
        description: data.details || data.error || "An error occurred during sync"
      });
    }
  }

  private async handleSyncError(error: any, connectionId: string): Promise<void> {
    let errorMessage = 'An error occurred during sync';
    let status: 'error' | 'setup_required' | 'expired' = 'error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.toLowerCase().includes('setup') || errorMessage.toLowerCase().includes('profile')) {
        status = 'setup_required';
        errorMessage = 'Amazon Advertising setup required';
      } else if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('expired')) {
        status = 'expired';
        errorMessage = 'Please reconnect your Amazon account';
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    await this.operations.updateConnectionStatus(connectionId, status, errorMessage);
    
    this.toast.error("Sync Error", {
      description: errorMessage
    });
  }
}
