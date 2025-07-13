import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class AmazonEnvironmentValidator {
  private toast: typeof toast;

  constructor(toastFn: typeof toast) {
    this.toast = toastFn;
  }

  async validateEnvironment(): Promise<boolean> {
    console.log('=== Validating Amazon Environment ===');
    
    try {
      // Get auth headers
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.access_token) {
        this.toast.error("Authentication Error", {
          description: "Please log in again to continue"
        });
        return false;
      }

      // First test if credentials are accessible
      console.log('=== Testing Amazon Credentials Access ===');
      const testResponse = await supabase.functions.invoke('test-amazon-credentials', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Credentials test response:', testResponse);

      if (testResponse.error) {
        console.error('Credentials test failed:', testResponse.error);
        this.toast.error("Configuration Error", {
          description: "Unable to test Amazon credentials. Edge functions may need redeployment."
        });
        return false;
      }

      const credentialsData = testResponse.data;
      if (!credentialsData?.amazonClientId || !credentialsData?.amazonClientSecret) {
        console.error('Amazon credentials not accessible:', credentialsData);
        this.toast.error("Amazon Credentials Missing", {
          description: "Amazon API credentials are not accessible to edge functions. Please verify they are set in Supabase secrets and redeploy if needed."
        });
        return false;
      }

      console.log('Credentials test passed:', {
        clientIdLength: credentialsData.clientIdLength,
        clientSecretLength: credentialsData.clientSecretLength
      });

      // Test edge function accessibility with test mode only
      console.log('=== Testing Environment Function ===');
      const response = await supabase.functions.invoke('test-environment', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('OAuth init test response:', response);

      if (response.error) {
        console.error('Environment validation failed:', response.error);
        console.error('Response data:', response.data);
        
        let errorMessage = 'Server configuration issue detected';
        
        if (response.error.message?.includes('non-2xx status code')) {
          errorMessage = 'Amazon API credentials not configured. Please set up AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET in Supabase secrets.';
        } else if (response.error.message?.includes('missing')) {
          errorMessage = 'Required server configuration missing. Please contact support.';
        }
        
        this.toast.error("Configuration Error", {
          description: errorMessage
        });
        
        return false;
      }

      // Check if the response indicates missing credentials
      if (response.data?.errorType === 'missing_amazon_client_id' || 
          response.data?.errorType === 'missing_amazon_client_secret') {
        this.toast.error("Amazon Credentials Missing", {
          description: "Amazon API credentials need to be configured in Supabase secrets"
        });
        return false;
      }

      console.log('Environment validation passed');
      return true;
      
    } catch (error) {
      console.error('Environment validation error:', error);
      
      this.toast.error("Environment Error", {
        description: "Unable to verify server configuration. Please try again."
      });
      
      return false;
    }
  }
}