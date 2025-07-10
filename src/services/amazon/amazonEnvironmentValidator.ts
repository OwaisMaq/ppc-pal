
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

      // Test edge function accessibility
      const response = await supabase.functions.invoke('amazon-oauth-init', {
        body: { test: true },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.error) {
        console.error('Environment validation failed:', response.error);
        
        let errorMessage = 'Server configuration issue detected';
        
        if (response.error.message?.includes('non-2xx status code')) {
          errorMessage = 'Amazon API credentials not configured. Please contact support.';
        } else if (response.error.message?.includes('missing')) {
          errorMessage = 'Required server configuration missing. Please contact support.';
        }
        
        this.toast.error("Configuration Error", {
          description: errorMessage
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
