
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateSyncResponse } from '@/lib/validation/amazonApiSchemas';
import { errorTracker } from '@/services/errorTracker';
import { AmazonConnectionOperations } from '../amazonConnectionOperations';
import { EnhancedSyncValidator } from './enhancedSyncValidator';
import { EnhancedSyncResponseHandler } from './enhancedSyncResponseHandler';
import { EnhancedSyncErrorHandler } from './enhancedSyncErrorHandler';

export class EnhancedSyncService {
  private toast: typeof toast;
  private operations: AmazonConnectionOperations;
  private validator: EnhancedSyncValidator;
  private responseHandler: EnhancedSyncResponseHandler;
  private errorHandler: EnhancedSyncErrorHandler;

  constructor(toastFn: typeof toast, operations: AmazonConnectionOperations) {
    this.toast = toastFn;
    this.operations = operations;
    this.validator = new EnhancedSyncValidator();
    this.responseHandler = new EnhancedSyncResponseHandler(toastFn, operations);
    this.errorHandler = new EnhancedSyncErrorHandler(toastFn, operations);
  }

  async syncConnection(
    connectionId: string,
    refreshConnections: () => Promise<void>
  ): Promise<void> {
    console.log('=== Enhanced Sync Service - Starting Sync ===');
    console.log('Connection ID:', connectionId);

    try {
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
        
        await this.errorHandler.handleEdgeFunctionError(response.error, connectionId);
        await refreshConnections();
        return;
      }

      // Validate response data
      const validationResult = validateSyncResponse(response.data);
      if (!validationResult.success) {
        console.error('=== Invalid Response Format ===');
        console.error('Validation errors:', validationResult.error.issues);
        
        errorTracker.captureAmazonError('Invalid sync response format', {
          connectionId,
          operation: 'sync'
        });
        
        await this.validator.handleValidationError(connectionId, validationResult.error);
        this.toast.error("Sync Warning", {
          description: "Received unexpected response format. Please try again."
        });
        
        await refreshConnections();
        return;
      }

      // Handle validated response
      await this.responseHandler.handleValidatedSyncResponse(
        validationResult.data,
        connectionId,
        refreshConnections
      );

    } catch (err) {
      console.error('=== Sync Service Error ===');
      console.error('Error:', err);
      
      errorTracker.captureAmazonError(err as Error, {
        connectionId,
        operation: 'sync'
      });
      
      await this.errorHandler.handleGeneralError(err, connectionId);
      await refreshConnections();
    }
  }
}
