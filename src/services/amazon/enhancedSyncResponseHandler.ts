
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SyncResponse } from '@/lib/validation/amazonApiSchemas';
import { errorTracker } from '@/services/errorTracker';
import { AmazonConnectionOperations } from '../amazonConnectionOperations';

export class EnhancedSyncResponseHandler {
  private toast: typeof toast;
  private operations: AmazonConnectionOperations;

  constructor(toastFn: typeof toast, operations: AmazonConnectionOperations) {
    this.toast = toastFn;
    this.operations = operations;
  }

  async handleValidatedSyncResponse(
    data: SyncResponse,
    connectionId: string,
    refreshConnections: () => Promise<void>
  ): Promise<void> {
    console.log('=== Processing Validated Sync Response ===');
    
    // Handle errors - check the data properties directly since validation passed
    if (!data.success || data.error) {
      console.log('=== Sync Failed ===');
      console.log('Error:', data.error);
      console.log('Requires setup:', data.requiresSetup);
      console.log('Requires reconnection:', data.requiresReconnection);
      
      await this.handleSyncFailure(data, connectionId);
      await refreshConnections();
      return;
    }

    // Handle success
    console.log('=== Sync Successful ===');
    await this.handleSyncSuccess(data, connectionId);
    await refreshConnections();
  }

  private async handleSyncFailure(data: SyncResponse, connectionId: string): Promise<void> {
    if (data.requiresSetup) {
      await this.operations.updateConnectionStatus(
        connectionId, 
        'setup_required', 
        data.details || 'Amazon Advertising setup required'
      );
      
      this.toast.error("Setup Required", {
        description: data.details || "Please set up your Amazon Advertising account first"
      });
    } else if (data.requiresReconnection) {
      await this.operations.updateConnectionStatus(
        connectionId, 
        'error', 
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

  private async handleSyncSuccess(data: SyncResponse, connectionId: string): Promise<void> {
    const campaignCount = data.campaignCount || data.campaigns_synced || 0;
    const profilesFound = data.profilesFound || 0;
    
    console.log('Campaigns synced:', campaignCount);
    console.log('Profiles found:', profilesFound);
    
    // Update connection status
    try {
      const { error: updateError } = await supabase
        .from('amazon_connections')
        .update({
          status: 'active',
          campaign_count: campaignCount,
          setup_required_reason: null,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (updateError) {
        console.error('Failed to update connection after successful sync:', updateError);
        errorTracker.captureAmazonError(updateError, {
          connectionId,
          operation: 'update_connection_status'
        });
      }
    } catch (updateErr) {
      console.error('Error updating connection status:', updateErr);
      errorTracker.captureAmazonError(updateErr as Error, {
        connectionId,
        operation: 'update_connection_status'
      });
    }
    
    // Show success message
    const successMessage = campaignCount > 0 
      ? `Successfully synced ${campaignCount} campaigns`
      : profilesFound > 0 
        ? `Connected successfully with ${profilesFound} profiles found`
        : "Amazon connection synced successfully";
    
    this.toast.success("Sync Complete", {
      description: successMessage
    });
  }
}
