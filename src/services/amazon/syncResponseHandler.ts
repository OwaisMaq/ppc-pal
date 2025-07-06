
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AmazonConnectionOperations } from '../amazonConnectionOperations';

export class SyncResponseHandler {
  private toast: typeof toast;
  private operations: AmazonConnectionOperations;

  constructor(toastFn: typeof toast, operations: AmazonConnectionOperations) {
    this.toast = toastFn;
    this.operations = operations;
  }

  async handleSyncResponse(
    data: any, 
    error: any, 
    connectionId: string, 
    refreshConnections: () => Promise<void>
  ) {
    console.log('=== Handling Sync Response ===');
    console.log('Response data:', data);
    console.log('Response error:', error);

    if (error) {
      console.error('=== Sync Function Error ===');
      console.error('Error details:', error);
      
      // Update connection status to error
      await this.operations.updateConnectionStatus(connectionId, 'error', 'sync_error');
      
      this.toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with Amazon API",
        variant: "destructive",
      });
      
      await refreshConnections();
      return;
    }

    if (!data) {
      console.error('=== No Response Data ===');
      
      // Update connection status to warning
      await this.operations.updateConnectionStatus(connectionId, 'warning', 'no_response_data');
      
      this.toast({
        title: "Sync Warning",
        description: "No data received from Amazon API. Please try again.",
        variant: "destructive",
      });
      
      await refreshConnections();
      return;
    }

    // Handle different response statuses
    if (data.success === false) {
      console.log('=== Sync Failed with Response ===');
      console.log('Failure reason:', data.error || data.message);
      
      let setupReason = 'sync_failed';
      let connectionStatus = 'error';
      
      // Determine specific failure reason
      if (data.error?.includes('profile') || data.message?.includes('profile')) {
        setupReason = 'profile_issues';
        connectionStatus = 'setup_required';
      } else if (data.error?.includes('token') || data.message?.includes('token')) {
        setupReason = 'token_expired';
        connectionStatus = 'expired';
      } else if (data.error?.includes('no advertising profiles')) {
        setupReason = 'no_advertising_profiles';
        connectionStatus = 'setup_required';
      }
      
      await this.operations.updateConnectionStatus(connectionId, connectionStatus, setupReason);
      
      this.toast({
        title: "Sync Failed",
        description: data.error || data.message || "Amazon sync encountered an error",
        variant: "destructive",
      });
      
      await refreshConnections();
      return;
    }

    // Handle successful sync
    if (data.success === true) {
      console.log('=== Sync Successful ===');
      
      const campaignCount = data.campaignCount || data.campaigns_synced || 0;
      const profilesFound = data.profilesFound || data.profiles_detected || 0;
      
      console.log('Campaigns synced:', campaignCount);
      console.log('Profiles found:', profilesFound);
      
      // Update connection with success status
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
        }
      } catch (updateErr) {
        console.error('Error updating connection status:', updateErr);
      }
      
      // Show success message
      const successMessage = campaignCount > 0 
        ? `Successfully synced ${campaignCount} campaigns`
        : profilesFound > 0 
          ? `Connected successfully with ${profilesFound} profiles found`
          : "Amazon connection synced successfully";
      
      this.toast({
        title: "Sync Complete",
        description: successMessage,
      });
      
      console.log('=== Sync Response Handled Successfully ===');
      await refreshConnections();
      return;
    }

    // Handle partial success or warnings
    if (data.warning || data.warnings) {
      console.log('=== Sync Completed with Warnings ===');
      
      const campaignCount = data.campaignCount || 0;
      await this.operations.updateConnectionStatus(connectionId, 'warning', 'sync_warnings');
      
      // Update campaign count if available
      if (campaignCount > 0) {
        try {
          await supabase
            .from('amazon_connections')
            .update({
              campaign_count: campaignCount,
              last_sync_at: new Date().toISOString()
            })
            .eq('id', connectionId);
        } catch (updateErr) {
          console.error('Error updating campaign count:', updateErr);
        }
      }
      
      this.toast({
        title: "Sync Completed with Warnings",
        description: Array.isArray(data.warnings) 
          ? data.warnings.join(', ')
          : data.warning || "Some issues were encountered during sync",
        variant: "destructive",
      });
      
      await refreshConnections();
      return;
    }

    // Default handling for unexpected response format
    console.log('=== Unexpected Response Format ===');
    console.log('Response data structure:', Object.keys(data));
    
    // Try to extract useful information
    const campaignCount = data.campaignCount || data.campaigns_synced || data.campaigns?.length || 0;
    
    if (campaignCount > 0) {
      // Assume success if we have campaign data
      await this.operations.updateConnectionStatus(connectionId, 'active', null);
      
      try {
        await supabase
          .from('amazon_connections')
          .update({
            campaign_count: campaignCount,
            last_sync_at: new Date().toISOString()
          })
          .eq('id', connectionId);
      } catch (updateErr) {
        console.error('Error updating campaign count:', updateErr);
      }
      
      this.toast({
        title: "Sync Complete",
        description: `Successfully processed ${campaignCount} campaigns`,
      });
    } else {
      // No clear success indicator
      await this.operations.updateConnectionStatus(connectionId, 'warning', 'unclear_sync_result');
      
      this.toast({
        title: "Sync Status Unclear",
        description: "Sync completed but results are unclear. Please check your campaigns.",
        variant: "destructive",
      });
    }
    
    await refreshConnections();
  }
}
