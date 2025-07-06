
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SyncStep {
  step: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  details?: string;
  data?: any;
  timestamp: Date;
}

export interface ProfileDetectionResult {
  success: boolean;
  profiles: any[];
  errors: string[];
  regions: string[];
  totalAttempts: number;
}

export const useEnhancedAmazonSync = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<SyncStep[]>([]);
  const { toast } = useToast();

  const addStep = (step: string, status: SyncStep['status'], details?: string, data?: any) => {
    const newStep: SyncStep = {
      step,
      status,
      details,
      data,
      timestamp: new Date()
    };
    setSteps(prev => [...prev, newStep]);
    console.log(`[Enhanced Sync] ${step}:`, { status, details, data });
    return newStep;
  };

  const updateLastStep = (status: SyncStep['status'], details?: string, data?: any) => {
    setSteps(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          status,
          details,
          data
        };
      }
      return updated;
    });
  };

  const clearSteps = () => {
    setSteps([]);
  };

  const getAuthHeaders = async () => {
    console.log('=== Getting Auth Headers ===');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Session check result:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      sessionError: sessionError?.message,
      tokenLength: session?.access_token?.length || 0
    });
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      console.error('No access token in session');
      throw new Error('No valid session found. Please sign in again.');
    }
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('Auth headers prepared:', {
      hasAuthHeader: !!headers.Authorization,
      authHeaderLength: headers.Authorization.length,
      contentType: headers['Content-Type']
    });
    
    return headers;
  };

  const runEnhancedProfileDetection = async (connectionId: string): Promise<ProfileDetectionResult> => {
    console.log('=== Enhanced Profile Detection Started ===');
    
    try {
      addStep('Starting enhanced profile detection', 'pending', 'Attempting multiple detection strategies');
      
      const headers = await getAuthHeaders();
      
      const { data, error } = await supabase.functions.invoke('amazon-enhanced-profile-detection', {
        body: { connectionId },
        headers
      });

      if (error) {
        console.error('Enhanced profile detection error:', error);
        updateLastStep('error', `Detection failed: ${error.message || error}`);
        return {
          success: false,
          profiles: [],
          errors: [error.message || 'Unknown error'],
          regions: [],
          totalAttempts: 0
        };
      }

      if (data?.success) {
        updateLastStep('success', 
          `Found ${data.profiles?.length || 0} profiles across ${data.regions?.length || 0} regions`,
          data
        );
        return {
          success: true,
          profiles: data.profiles || [],
          errors: data.errors || [],
          regions: data.regions || [],
          totalAttempts: data.totalAttempts || 0
        };
      } else {
        updateLastStep('warning', 
          data?.message || 'No profiles found despite enhanced detection',
          data
        );
        return {
          success: false,
          profiles: [],
          errors: data?.errors || ['No profiles detected'],
          regions: data?.regions || [],
          totalAttempts: data?.totalAttempts || 0
        };
      }
    } catch (err) {
      console.error('Enhanced profile detection error:', err);
      updateLastStep('error', `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return {
        success: false,
        profiles: [],
        errors: [err instanceof Error ? err.message : 'Unknown error'],
        regions: [],
        totalAttempts: 0
      };
    }
  };

  const runConnectionRecovery = async (connectionId: string) => {
    addStep('Running connection recovery', 'pending', 'Attempting to recover and update connection');
    
    try {
      const profileResult = await runEnhancedProfileDetection(connectionId);
      
      if (profileResult.success && profileResult.profiles.length > 0) {
        addStep('Updating connection with found profiles', 'pending');
        
        const headers = await getAuthHeaders();
        
        const { error: updateError } = await supabase.functions.invoke('amazon-update-connection-profiles', {
          body: { 
            connectionId, 
            profiles: profileResult.profiles 
          },
          headers
        });

        if (updateError) {
          updateLastStep('error', `Failed to update connection: ${updateError.message}`);
          return false;
        } else {
          updateLastStep('success', 'Connection updated with advertising profiles');
          return true;
        }
      } else {
        addStep('No profiles to update', 'warning', 
          'Enhanced detection found no advertising profiles. Account may need Amazon Advertising setup.'
        );
        return false;
      }
    } catch (err) {
      updateLastStep('error', `Recovery failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  };

  const runEnhancedSync = async (connectionId: string) => {
    if (isRunning) {
      toast({
        title: "Sync in Progress",
        description: "Please wait for the current sync to complete.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setSteps([]);

    try {
      console.log('=== Enhanced Amazon Sync Started ===');
      addStep('Initializing enhanced sync', 'pending', `Connection ID: ${connectionId}`);

      // Step 1: Validate session and get auth headers
      addStep('Validating session and authentication', 'pending');
      let headers;
      try {
        headers = await getAuthHeaders();
        updateLastStep('success', 'Session validated and auth headers prepared');
      } catch (authError) {
        updateLastStep('error', `Authentication failed: ${authError.message}`);
        toast({
          title: "Authentication Error",
          description: "Please sign in again to continue with enhanced sync.",
          variant: "destructive",
        });
        return;
      }

      // Step 2: Validate connection
      addStep('Validating connection', 'pending');
      const { data: connection, error: connectionError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connection) {
        updateLastStep('error', 'Connection not found or access denied');
        toast({
          title: "Connection Error",
          description: "Could not find the Amazon connection.",
          variant: "destructive",
        });
        return;
      }
      updateLastStep('success', `Connection found: ${connection.profile_name || 'Unknown'}`);

      // Step 3: Check token validity
      addStep('Checking token validity', 'pending');
      const tokenExpiry = new Date(connection.token_expires_at);
      const now = new Date();
      
      if (tokenExpiry <= now) {
        updateLastStep('error', 'Access token has expired');
        addStep('Token refresh required', 'warning', 'Please reconnect your Amazon account');
        toast({
          title: "Token Expired",
          description: "Please reconnect your Amazon account to continue.",
          variant: "destructive",
        });
        return;
      }
      updateLastStep('success', `Token valid until ${tokenExpiry.toLocaleDateString()}`);

      // Step 4: Check profile configuration
      addStep('Checking profile configuration', 'pending');
      if (!connection.profile_id || connection.profile_id === 'setup_required_no_profiles_found') {
        updateLastStep('warning', 'No advertising profiles configured');
        
        // Run connection recovery
        const recoverySuccess = await runConnectionRecovery(connectionId);
        
        if (!recoverySuccess) {
          addStep('Setup guidance', 'warning', 
            'Amazon Advertising setup may be required. Please visit advertising.amazon.com to set up your advertising account.'
          );
          toast({
            title: "Setup Required",
            description: "Amazon Advertising setup is required. Please check the detailed guidance below.",
            variant: "destructive",
          });
          return;
        }

        // If recovery was successful, continue with sync
        addStep('Profile recovery successful', 'success', 'Proceeding with campaign sync');
      } else {
        updateLastStep('success', `Profile configured: ${connection.profile_id}`);
      }

      // Step 5: Attempt campaign sync with proper authentication
      addStep('Syncing campaigns', 'pending', 'Fetching campaign data from Amazon with enhanced authentication');
      
      const { data: syncData, error: syncError } = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId },
        headers
      });

      if (syncError) {
        updateLastStep('error', `Sync failed: ${syncError.message || syncError}`);
        toast({
          title: "Sync Failed",
          description: syncError.message || "Failed to sync campaign data",
          variant: "destructive",
        });
        return;
      }

      if (syncData?.error) {
        updateLastStep('error', `Amazon API error: ${syncData.error}`);
        
        // Provide specific guidance based on error type
        if (syncData.requiresSetup) {
          addStep('Amazon Advertising setup required', 'warning', 
            'Visit advertising.amazon.com to complete your advertising account setup'
          );
        } else if (syncData.requiresReconnection) {
          addStep('Reconnection required', 'warning', 
            'Your Amazon connection needs to be refreshed'
          );
        }
        
        toast({
          title: "Sync Error",
          description: syncData.details || syncData.error,
          variant: "destructive",
        });
        return;
      }

      // Step 6: Success
      const campaignCount = syncData?.campaignsSynced || syncData?.campaignCount || 0;
      updateLastStep('success', `Successfully synced ${campaignCount} campaigns`);
      
      addStep('Sync completed', 'success', 
        campaignCount > 0 
          ? `${campaignCount} campaigns imported successfully`
          : 'Sync completed, but no campaigns were found in your Amazon account'
      );

      toast({
        title: "Sync Complete",
        description: campaignCount > 0 
          ? `Successfully synced ${campaignCount} campaigns`
          : "Sync completed, but no campaigns found",
      });

    } catch (err) {
      console.error('Enhanced sync error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addStep('Unexpected error', 'error', errorMessage);
      
      toast({
        title: "Sync Failed",
        description: "An unexpected error occurred during sync",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return {
    steps,
    isRunning,
    runEnhancedSync,
    runEnhancedProfileDetection,
    runConnectionRecovery,
    clearSteps,
  };
};
