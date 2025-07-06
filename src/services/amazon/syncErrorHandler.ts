
import { toast } from 'sonner';
import { AmazonConnectionOperations } from '../amazonConnectionOperations';
import { SyncResponse } from './types';

export class SyncErrorHandler {
  private toast: typeof toast;
  private operations: AmazonConnectionOperations;

  constructor(toastFn: typeof toast, operations: AmazonConnectionOperations) {
    this.toast = toastFn;
    this.operations = operations;
  }

  async handleEdgeFunctionError(error: any, connectionId: string): Promise<void> {
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
    
    await this.operations.updateConnectionStatus(
      connectionId, 
      errorType === 'auth_error' ? 'error' : 'warning', 
      userMessage
    );
    
    throw new Error(userMessage);
  }

  async handleServerResponseError(data: SyncResponse, connectionId: string, refreshConnections: () => Promise<void>): Promise<void> {
    console.error('=== Sync Server Response Error ===');
    console.error('Server error:', data.error);
    console.error('Error type:', data.errorType);
    console.error('Requires reconnection:', data.requiresReconnection);
    console.error('Requires setup:', data.requiresSetup);
    
    if (data.requiresSetup) {
      this.toast.error("Amazon Advertising Setup Required", {
        description: data.details || "Please set up your Amazon Advertising account at advertising.amazon.com first, then try 'Enhanced Sync' to import your campaigns.",
      });
      await this.operations.updateConnectionStatus(connectionId, 'setup_required', 'Amazon Advertising setup required');
    } else if (data.requiresReconnection) {
      this.toast.error("Reconnection Required", {
        description: data.details || "Please reconnect your Amazon account to continue syncing",
      });
      await this.operations.updateConnectionStatus(connectionId, 'error', 'Token expired or invalid');
    } else {
      this.toast.error("Sync Failed", {
        description: data.details || data.error,
      });
      await this.operations.updateConnectionStatus(connectionId, 'error', data.error || 'Unknown error');
    }
    
    await refreshConnections();
  }

  async handleGeneralError(err: unknown, connectionId: string): Promise<void> {
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
    
    this.toast.error("Sync Failed", {
      description: userMessage,
    });
  }
}
