
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

  const validateProfileConfiguration = (profileId: string): { isValid: boolean; reason?: string } => {
    console.log('=== Validating Profile Configuration ===');
    console.log('Profile ID:', profileId);

    if (!profileId) {
      return { isValid: false, reason: 'No profile ID configured' };
    }

    if (profileId === 'setup_required_no_profiles_found') {
      return { isValid: false, reason: 'No advertising profiles found during setup' };
    }

    if (profileId.includes('error') || profileId === 'invalid') {
      return { isValid: false, reason: 'Invalid profile configuration detected' };
    }

    // Amazon profile IDs should be numeric strings
    if (!/^\d+$/.test(profileId)) {
      return { isValid: false, reason: 'Profile ID format appears invalid (should be numeric)' };
    }

    console.log('Profile configuration is valid');
    return { isValid: true };
  };

  const runEnhancedProfileDetection = async (connectionId: string): Promise<ProfileDetectionResult> => {
    console.log('=== Enhanced Profile Detection Started ===');
    
    try {
      addStep('Starting enhanced profile detection', 'pending', 'Using multiple detection strategies across regions');
      
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

      if (data?.success && data.profiles?.length > 0) {
        updateLastStep('success', 
          `Found ${data.profiles.length} advertising profiles across ${data.regions?.length || 0} regions`,
          { 
            profilesFound: data.profiles.length,
            regionsChecked: data.regions?.length || 0,
            profileIds: data.profiles.map(p => p.profileId).slice(0, 3)
          }
        );
        return {
          success: true,
          profiles: data.profiles,
          errors: data.errors || [],
          regions: data.regions || [],
          totalAttempts: data.totalAttempts || 0
        };
      } else {
        updateLastStep('warning', 
          'No advertising profiles found despite enhanced detection',
          { 
            regionsChecked: data?.regions?.length || 0,
            errors: data?.errors || [],
            suggestion: 'Amazon Advertising account setup may be required'
          }
        );
        return {
          success: false,
          profiles: [],
          errors: data?.errors || ['No advertising profiles detected'],
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

  const updateConnectionWithProfiles = async (connectionId: string, profiles: any[]) => {
    console.log('=== Updating Connection with Profiles ===');
    console.log('Profiles to update:', profiles.length);
    
    if (!profiles || profiles.length === 0) {
      throw new Error('No profiles provided for connection update');
    }

    // Use the first valid profile (they're usually sorted by preference)
    const primaryProfile = profiles[0];
    const profileId = primaryProfile.profileId.toString();
    const profileName = primaryProfile.countryCode || 
                       primaryProfile.marketplace || 
                       `Profile ${primaryProfile.profileId}`;
    const marketplaceId = primaryProfile.accountInfo?.marketplaceStringId || 
                         primaryProfile.countryCode;

    console.log('Updating connection with profile:', {
      profileId,
      profileName,
      marketplaceId
    });

    const { error: updateError } = await supabase
      .from('amazon_connections')
      .update({
        profile_id: profileId,
        profile_name: profileName,
        marketplace_id: marketplaceId,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Failed to update connection:', updateError);
      throw new Error(`Failed to update connection: ${updateError.message}`);
    }

    console.log('Connection updated successfully');
    return { profileId, profileName, marketplaceId };
  };

  const runConnectionRecovery = async (connectionId: string) => {
    addStep('Running connection recovery', 'pending', 'Attempting to detect and configure advertising profiles');
    
    try {
      // Step 1: Enhanced profile detection
      const profileResult = await runEnhancedProfileDetection(connectionId);
      
      if (profileResult.success && profileResult.profiles.length > 0) {
        addStep('Updating connection with detected profiles', 'pending');
        
        try {
          const updatedProfile = await updateConnectionWithProfiles(connectionId, profileResult.profiles);
          updateLastStep('success', 
            `Connection updated with profile: ${updatedProfile.profileName}`,
            updatedProfile
          );
          return { success: true, profilesFound: profileResult.profiles.length };
        } catch (updateErr) {
          updateLastStep('error', `Failed to update connection: ${updateErr.message}`);
          return { success: false, error: updateErr.message };
        }
      } else {
        addStep('No advertising profiles found', 'warning', 
          `Enhanced detection checked ${profileResult.regions.length} regions but found no advertising profiles. ` +
          'This usually means Amazon Advertising is not set up for this account.'
        );
        
        // Provide helpful guidance
        addStep('Setup guidance', 'warning', 
          'To resolve this: 1. Visit advertising.amazon.com, 2. Complete your advertising account setup, ' +
          '3. Create at least one campaign, 4. Return here and try Enhanced Sync again'
        );
        
        return { 
          success: false, 
          error: 'No advertising profiles found',
          guidance: 'Amazon Advertising setup required'
        };
      }
    } catch (err) {
      updateLastStep('error', `Recovery failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
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
        updateLastStep('error', `Access token expired on ${tokenExpiry.toLocaleDateString()}`);
        addStep('Token refresh required', 'warning', 'Please reconnect your Amazon account to refresh the token');
        toast({
          title: "Token Expired",
          description: "Please reconnect your Amazon account to continue.",
          variant: "destructive",
        });
        return;
      }
      updateLastStep('success', `Token valid until ${tokenExpiry.toLocaleDateString()}`);

      // Step 4: Enhanced profile validation and recovery
      addStep('Validating profile configuration', 'pending');
      const profileValidation = validateProfileConfiguration(connection.profile_id);
      
      if (!profileValidation.isValid) {
        updateLastStep('warning', `Profile issue detected: ${profileValidation.reason}`);
        
        // Attempt automatic recovery
        const recoveryResult = await runConnectionRecovery(connectionId);
        
        if (!recoveryResult.success) {
          if (recoveryResult.guidance) {
            addStep('Setup Required', 'warning', 
              'Amazon Advertising setup is required before campaign sync can proceed. ' +
              'Please visit advertising.amazon.com to complete setup.'
            );
          }
          
          toast({
            title: "Profile Setup Required",
            description: recoveryResult.error || "Amazon Advertising account setup is required.",
            variant: "destructive",
          });
          return;
        }

        // Profile recovery was successful, continue with sync
        addStep('Profile recovery successful', 'success', 
          `Successfully configured ${recoveryResult.profilesFound} advertising profile(s)`
        );
      } else {
        updateLastStep('success', `Profile validated: ${connection.profile_id}`);
      }

      // Step 5: Enhanced campaign sync with proper headers
      addStep('Syncing campaigns with enhanced API headers', 'pending', 
        'Using properly configured Amazon Advertising API headers'
      );
      
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
            'Your Amazon account needs advertising setup. Visit advertising.amazon.com to get started.'
          );
        } else if (syncData.requiresReconnection) {
          addStep('Reconnection required', 'warning', 
            'Your Amazon connection needs to be refreshed. Please reconnect your account.'
          );
        }
        
        toast({
          title: "Sync Error",
          description: syncData.details || syncData.error,
          variant: "destructive",
        });
        return;
      }

      // Step 6: Success handling
      const campaignCount = syncData?.campaignsSynced || syncData?.campaignCount || 0;
      updateLastStep('success', `Successfully synced ${campaignCount} campaigns`);
      
      if (campaignCount > 0) {
        addStep('Campaign import completed', 'success', 
          `${campaignCount} campaigns imported and ready for optimization`
        );
        
        toast({
          title: "Sync Complete!",
          description: `Successfully synced ${campaignCount} campaigns from Amazon.`,
        });
      } else {
        addStep('Sync completed - No campaigns found', 'success', 
          'Sync was successful, but no campaigns were found in your Amazon Advertising account. ' +
          'This is normal for new accounts. Create campaigns in Amazon Advertising to see them here.'
        );
        
        toast({
          title: "Sync Complete",
          description: "Sync completed successfully. No campaigns found - this is normal for new advertising accounts.",
        });
      }

    } catch (err) {
      console.error('Enhanced sync error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addStep('Unexpected error', 'error', errorMessage);
      
      toast({
        title: "Sync Failed",
        description: "An unexpected error occurred during sync. Please try again.",
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
