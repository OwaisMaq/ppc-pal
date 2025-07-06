
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateProfileConfiguration } from '@/utils/amazonConnectionValidation';
import { AmazonConnectionOperations } from './amazonConnectionOperations';
import { SyncResponseHandler } from './amazon/syncResponseHandler';
import { SyncErrorHandler } from './amazon/syncErrorHandler';
import { SyncResponse } from './amazon/types';

export class AmazonSyncService {
  private toast: ReturnType<typeof useToast>['toast'];
  private operations: AmazonConnectionOperations;
  private responseHandler: SyncResponseHandler;
  private errorHandler: SyncErrorHandler;

  constructor(toast: ReturnType<typeof useToast>['toast'], operations: AmazonConnectionOperations) {
    this.toast = toast;
    this.operations = operations;
    this.responseHandler = new SyncResponseHandler(toast, operations);
    this.errorHandler = new SyncErrorHandler(toast, operations);
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

      // Handle response using the response handler
      await this.responseHandler.handleSyncResponse(data, error, connectionId, refreshConnections);
      
    } catch (err) {
      await this.errorHandler.handleGeneralError(err, connectionId);
    }
  }
}
