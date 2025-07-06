
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export class AmazonOAuthService {
  private toast: ReturnType<typeof useToast>['toast'];
  private oauthCallbackCache: Map<string, Promise<any>>;

  constructor(toast: ReturnType<typeof useToast>['toast']) {
    this.toast = toast;
    this.oauthCallbackCache = new Map();
  }

  async handleOAuthCallback(code: string, state: string, fetchConnections: () => Promise<void>, syncConnection: (connectionId: string) => Promise<void>) {
    const cacheKey = `${code}-${state}`;
    
    console.log('=== OAuth Callback Started ===');
    console.log('Cache key generated:', cacheKey.substring(0, 20) + '...');
    
    if (this.oauthCallbackCache.has(cacheKey)) {
      console.log('=== Duplicate Callback Detected - Using Cache ===');
      try {
        const result = await this.oauthCallbackCache.get(cacheKey);
        console.log('=== Cached Result Retrieved ===', result);
        return result;
      } catch (err) {
        console.error('=== Cached Result Failed ===', err);
        this.oauthCallbackCache.delete(cacheKey);
        throw err;
      }
    }

    console.log('=== Starting New OAuth Callback Process ===');

    try {
      const callbackPromise = supabase.functions.invoke('amazon-oauth-callback', {
        body: { code, state }
      }).then(async ({ data, error }) => {
        console.log('=== OAuth Callback Response ===');
        console.log('Data present:', !!data);
        console.log('Error present:', !!error);
        console.log('Data keys:', data ? Object.keys(data) : 'none');

        if (error) {
          console.error('=== OAuth Callback Error ===');
          console.error('Error details:', error);
          
          let userMessage = 'Failed to process Amazon callback';
          let errorType = 'unknown_error';
          
          if (typeof error === 'object' && error.message) {
            userMessage = error.message;
            errorType = error.errorType || 'server_error';
          } else if (typeof error === 'string') {
            userMessage = error;
          }
          
          const enhancedError = new Error(userMessage);
          (enhancedError as any).errorType = errorType;
          (enhancedError as any).userAction = error.userAction || 'Please try connecting again';
          throw enhancedError;
        }

        if (data?.error || !data?.success) {
          console.error('=== OAuth Callback Returned Error ===');
          console.error('Server error:', data?.error);
          console.error('Error type:', data?.errorType);
          console.error('User action:', data?.userAction);
          
          const enhancedError = new Error(data?.error || 'Callback processing failed');
          (enhancedError as any).errorType = data?.errorType || 'callback_error';
          (enhancedError as any).userAction = data?.userAction || 'Please try connecting again';
          throw enhancedError;
        }

        console.log('=== OAuth Callback Successful - Starting Auto-Sync ===');
        
        // Step 1: Refresh connections to get the new connection
        await fetchConnections();
        
        // Step 2: Auto-sync the new connection if it exists and needs sync
        if (data?.connectionId) {
          console.log('=== Auto-Syncing New Connection ===');
          console.log('Connection ID:', data.connectionId);
          
          // Wait a moment for the connection to be fully created
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            await syncConnection(data.connectionId);
          } catch (syncError) {
            console.error('=== Auto-Sync Failed ===');
            console.error('Sync error:', syncError);
            
            // Don't throw the error - just log it and continue with callback success
            this.toast({
              title: "Connection Created",
              description: "Amazon account connected but initial sync failed. Please try syncing manually.",
              variant: "destructive",
            });
          }
        }
        
        const result = { 
          profileCount: data?.profile_count || 0,
          message: data?.message || 'Connection successful',
          status: data?.status || 'active',
          connectionId: data?.connectionId
        };
        console.log('=== OAuth Callback Success ===', result);
        return result;
      });

      this.oauthCallbackCache.set(cacheKey, callbackPromise);
      
      try {
        const result = await callbackPromise;
        console.log('=== Final OAuth Result ===', result);
        return result;
      } finally {
        // Always clean up cache after processing
        setTimeout(() => {
          this.oauthCallbackCache.delete(cacheKey);
          console.log('=== OAuth Cache Entry Cleaned Up ===');
        }, 5000); // Keep for 5 seconds to handle rapid duplicate calls
      }
      
    } catch (err) {
      console.error('=== OAuth Callback Process Error ===');
      console.error('Error details:', err);
      
      this.oauthCallbackCache.delete(cacheKey);
      
      // Re-throw with enhanced error information
      if (err instanceof Error && (err as any).errorType) {
        throw err; // Already enhanced
      }
      
      const enhancedError = new Error(err instanceof Error ? err.message : 'Unknown callback error');
      (enhancedError as any).errorType = 'callback_processing_error';
      (enhancedError as any).userAction = 'Please try connecting again';
      throw enhancedError;
    }
  }
}
