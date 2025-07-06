
import { useToast } from '@/hooks/use-toast';
import { AmazonConnectionOperations } from '../amazonConnectionOperations';
import { SyncResponse } from './types';
import { SyncErrorHandler } from './syncErrorHandler';

export class SyncResponseHandler {
  private toast: ReturnType<typeof useToast>['toast'];
  private operations: AmazonConnectionOperations;
  private errorHandler: SyncErrorHandler;

  constructor(toast: ReturnType<typeof useToast>['toast'], operations: AmazonConnectionOperations) {
    this.toast = toast;
    this.operations = operations;
    this.errorHandler = new SyncErrorHandler(toast, operations);
  }

  async handleSyncResponse(
    data: SyncResponse, 
    error: any, 
    connectionId: string, 
    refreshConnections: () => Promise<void>
  ): Promise<void> {
    // Handle edge function errors
    if (error) {
      await this.errorHandler.handleEdgeFunctionError(error, connectionId);
      return;
    }

    // Handle server response errors
    if (!data.success && data.error) {
      await this.errorHandler.handleServerResponseError(data, connectionId, refreshConnections);
      return;
    }

    // Handle successful sync responses
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
