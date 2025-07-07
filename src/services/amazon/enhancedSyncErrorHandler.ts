
import { toast } from 'sonner';
import { AmazonConnectionOperations } from '../amazonConnectionOperations';

export class EnhancedSyncErrorHandler {
  private toast: typeof toast;
  private operations: AmazonConnectionOperations;

  constructor(toastFn: typeof toast, operations: AmazonConnectionOperations) {
    this.toast = toastFn;
    this.operations = operations;
  }

  async handleEdgeFunctionError(error: any, connectionId: string): Promise<void> {
    console.log('=== Handling Edge Function Error ===');
    
    let status: 'error' | 'setup_required' | 'expired' = 'error';
    let reason = 'Unknown error';
    let userMessage = 'An error occurred during sync';
    
    if (typeof error === 'object' && error.message) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('setup') || errorMessage.includes('profile')) {
        status = 'setup_required';
        reason = 'Amazon Advertising setup required';
        userMessage = 'Please set up your Amazon Advertising account';
      } else if (errorMessage.includes('token') || errorMessage.includes('expired')) {
        status = 'expired';
        reason = 'Access token expired';
        userMessage = 'Please reconnect your Amazon account';
      } else {
        reason = error.message;
        userMessage = error.message;
      }
    } else if (typeof error === 'string') {
      reason = error;
      userMessage = error;
    }
    
    await this.operations.updateConnectionStatus(connectionId, status, reason);
    
    this.toast.error("Sync Error", {
      description: userMessage
    });
  }

  async handleGeneralError(error: unknown, connectionId: string): Promise<void> {
    console.log('=== Handling General Error ===');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    await this.operations.updateConnectionStatus(
      connectionId, 
      'error', 
      `Sync failed: ${errorMessage}`
    );
    
    this.toast.error("Sync Failed", {
      description: errorMessage
    });
  }
}
