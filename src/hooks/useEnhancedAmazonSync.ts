
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SyncStep {
  step: string;
  status: 'pending' | 'success' | 'error' | 'warning' | 'info';
  details?: string;
  data?: any;
  timestamp: Date;
}

export interface ProfileDetectionResult {
  success: boolean;
  profiles: any[];
  errors?: string[];
  detectionSummary?: any;
  primaryReason?: string;
  detailedGuidance?: string[];
  troubleshooting?: any;
  nextSteps?: string[];
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
      addStep('Starting enhanced profile detection', 'pending', 'Using advanced multi-strategy detection across all regions');
      
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
          primaryReason: 'API communication error'
        };
      }

      if (data?.success && data.profiles?.length > 0) {
        const summary = data.detectionSummary || {};
        updateLastStep('success', 
          `Successfully detected ${data.profiles.length} advertising profiles using ${summary.strategiesAttempted || 'multiple'} detection strategies`,
          { 
            profilesFound: data.profiles.length,
            regionsChecked: summary.regionsChecked?.length || 0,
            strategiesUsed: summary.strategiesAttempted || 0,
            portfolioActivity: summary.portfolioActivityDetected,
            profileIds: data.profiles.map(p => p.profileId).slice(0, 3)
          }
        );
        
        // Show additional info about detection
        if (summary.portfolioActivityDetected) {
          addStep('Portfolio activity detected', 'success', 'Your Amazon advertising setup appears to be complete and active');
        }
        
        if (summary.accountDetails?.hasAdvertisingAccess) {
          addStep('Account verification', 'success', 'Account has proper advertising API access');
        }
        
        return {
          success: true,
          profiles: data.profiles,
          detectionSummary: summary,
          nextSteps: data.nextSteps
        };
      } else {
        // Enhanced handling for no profiles found
        const reason = data?.primaryReason || 'No advertising profiles found despite comprehensive detection';
        const guidance = data?.detailedGuidance || ['Amazon Advertising account setup may be required'];
        const troubleshooting = data?.troubleshooting || {};
        
        if (troubleshooting.authenticationIssues) {
          updateLastStep('error', 'Authentication issues detected during profile detection', {
            requiresReconnection: true,
            authErrors: true
          });
        } else if (troubleshooting.serverIssues) {
          updateLastStep('warning', 'Amazon API connectivity issues detected', {
            temporaryIssue: true,
            retryRecommended: true
          });
        } else {
          updateLastStep('warning', reason, { 
            regionsChecked: data?.detectionSummary?.regionsChecked || 0,
            strategiesAttempted: data?.detectionSummary?.strategiesAttempted || 0,
            accountHasAccess: troubleshooting.accountHasAdvertisingAccess
          });
        }
        
        // Add guidance steps
        if (guidance && guidance.length > 0) {
          addStep('Setup guidance', 'info', guidance.join(' • '));
        }
        
        return {
          success: false,
          profiles: [],
          errors: data?.errors || ['No advertising profiles detected'],
          primaryReason: reason,
          detailedGuidance: guidance,
          troubleshooting,
          nextSteps: data?.nextSteps || []
        };
      }
    } catch (err) {
      console.error('Enhanced profile detection error:', err);
      updateLastStep('error', `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return {
        success: false,
        profiles: [],
        errors: [err instanceof Error ? err.message : 'Unknown error'],
        primaryReason: 'Unexpected error during detection'
      };
    }
  };

  const updateConnectionWithProfiles = async (connectionId: string, profiles: any[]) => {
    console.log('=== Updating Connection with Profiles ===');
    console.log('Profiles to update:', profiles.length);
    
    if (!profiles || profiles.length === 0) {
      throw new Error('No profiles provided for connection update');
    }

    // Use the first valid profile (they're sorted by preference)
    const primaryProfile = profiles[0];
    const profileId = primaryProfile.profileId.toString();
    const profileName = primaryProfile.countryCode || 
                       primaryProfile.marketplaceStringId || 
                       `${primaryProfile.countryCode} Profile` ||
                       `Profile ${primaryProfile.profileId}`;
    const marketplaceId = primaryProfile.accountInfo?.marketplaceStringId || 
                         primaryProfile.marketplaceStringId ||
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
    addStep('Running intelligent connection recovery', 'pending', 'Attempting to detect and configure advertising profiles automatically');
    
    try {
      // Step 1: Enhanced profile detection
      const profileResult = await runEnhancedProfileDetection(connectionId);
      
      if (profileResult.success && profileResult.profiles.length > 0) {
        addStep('Configuring connection with detected profiles', 'pending', 
          `Found ${profileResult.profiles.length} profile${profileResult.profiles.length === 1 ? '' : 's'}, configuring primary profile`);
        
        try {
          const updatedProfile = await updateConnectionWithProfiles(connectionId, profileResult.profiles);
          updateLastStep('success', 
            `Connection successfully configured with ${updatedProfile.profileName} profile`,
            updatedProfile
          );
          
          // Show additional profiles if found
          if (profileResult.profiles.length > 1) {
            addStep('Multiple profiles detected', 'info', 
              `${profileResult.profiles.length} profiles found. Using ${updatedProfile.profileName} as primary. Others can be configured separately if needed.`);
          }
          
          return { success: true, profilesFound: profileResult.profiles.length };
        } catch (updateErr) {
          updateLastStep('error', `Failed to update connection: ${updateErr.message}`);
          return { success: false, error: updateErr.message };
        }
      } else {
        // Enhanced guidance based on detection results
        const troubleshooting = profileResult.troubleshooting || {};
        
        if (troubleshooting.authenticationIssues) {
          addStep('Authentication issues detected', 'error', 
            'Your Amazon connection has authentication problems. Please reconnect your Amazon account to resolve this issue.');
          
          return { 
            success: false, 
            error: 'Authentication required',
            requiresReconnection: true
          };
        } else if (troubleshooting.serverIssues) {
          addStep('Amazon API issues detected', 'warning', 
            'Amazon Advertising API is experiencing connectivity issues. Please try again in a few minutes.');
          
          return { 
            success: false, 
            error: 'Temporary API issues',
            retryRecommended: true
          };
        } else {
          // Standard setup guidance
          addStep('No advertising profiles found', 'warning', 
            profileResult.primaryReason || 'Enhanced detection found no advertising profiles in your Amazon account.'
          );
          
          if (profileResult.detailedGuidance && profileResult.detailedGuidance.length > 0) {
            addStep('Setup instructions', 'info', 
              'To resolve this: ' + profileResult.detailedGuidance.join(' → ')
            );
          }
          
          return { 
            success: false, 
            error: profileResult.primaryReason || 'No advertising profiles found',
            guidance: profileResult.detailedGuidance?.[0] || 'Amazon Advertising setup required',
            nextSteps: profileResult.nextSteps || []
          };
        }
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
        description: "Please wait for the current enhanced sync to complete.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setSteps([]);

    try {
      console.log('=== Enhanced Amazon Sync Started ===');
      addStep('Initializing enhanced sync', 'pending', `Starting comprehensive sync process for connection: ${connectionId}`);

      // Step 1: Validate session and get auth headers
      addStep('Validating authentication', 'pending', 'Checking session and preparing secure API headers');
      let headers;
      try {
        headers = await getAuthHeaders();
        updateLastStep('success', 'Authentication validated and secure headers prepared');
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
      addStep('Validating Amazon connection', 'pending', 'Verifying connection exists and is accessible');
      const { data: connection, error: connectionError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connection) {
        updateLastStep('error', 'Connection not found or access denied');
        toast({
          title: "Connection Error",
          description: "Could not find the Amazon connection. Please reconnect your account.",
          variant: "destructive",
        });
        return;
      }
      updateLastStep('success', `Connection validated for ${connection.profile_name || 'Amazon account'}`);

      // Step 3: Enhanced token validity check
      addStep('Checking token validity', 'pending', 'Verifying Amazon API token is current and valid');
      const tokenExpiry = new Date(connection.token_expires_at);
      const now = new Date();
      const hoursUntilExpiry = Math.round((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (tokenExpiry <= now) {
        updateLastStep('error', `Access token expired ${Math.abs(hoursUntilExpiry)} hours ago`);
        addStep('Token renewal required', 'warning', 'Your Amazon connection needs to be refreshed to continue syncing');
        toast({
          title: "Token Expired",
          description: "Please reconnect your Amazon account to refresh the access token.",
          variant: "destructive",
        });
        return;
      }
      
      let tokenStatus = 'success';
      let tokenMessage = `Token valid for ${hoursUntilExpiry} hours`;
      
      if (hoursUntilExpiry < 24) {
        tokenStatus = 'warning';
        tokenMessage += ' (renewal recommended soon)';
      }
      
      updateLastStep(tokenStatus as any, tokenMessage);

      // Step 4: Enhanced profile validation and intelligent recovery
      addStep('Validating profile configuration', 'pending', 'Checking advertising profile setup and configuration');
      const profileValidation = validateProfileConfiguration(connection.profile_id);
      
      if (!profileValidation.isValid) {
        updateLastStep('warning', `Profile issue detected: ${profileValidation.reason}`);
        
        // Attempt intelligent recovery
        addStep('Starting intelligent profile recovery', 'pending', 'Attempting to automatically detect and configure advertising profiles');
        const recoveryResult = await runConnectionRecovery(connectionId);
        
        if (!recoveryResult.success) {
          if (recoveryResult.requiresReconnection) {
            toast({
              title: "Reconnection Required",
              description: "Please reconnect your Amazon account to resolve authentication issues.",
              variant: "destructive",
            });
            return;
          } else if (recoveryResult.retryRecommended) {
            toast({
              title: "Temporary Issues",
              description: "Amazon API is experiencing issues. Please try again in a few minutes.",
              variant: "destructive",
            });
            return;
          } else {
            addStep('Setup guidance provided', 'info', 
              'Detailed setup instructions have been provided above. Complete Amazon Advertising setup and try Enhanced Sync again.'
            );
            
            toast({
              title: "Amazon Advertising Setup Required",
              description: recoveryResult.guidance || "Please complete your Amazon Advertising account setup at advertising.amazon.com",
              variant: "destructive",
            });
            return;
          }
        }

        // Profile recovery was successful, continue with sync
        addStep('Profile recovery completed', 'success', 
          `Successfully configured ${recoveryResult.profilesFound} advertising profile${recoveryResult.profilesFound === 1 ? '' : 's'}`
        );
      } else {
        updateLastStep('success', `Profile validated: ${connection.profile_id} (${connection.profile_name || 'Amazon Profile'})`);
      }

      // Step 5: Enhanced campaign sync with comprehensive error handling
      addStep('Syncing campaigns', 'pending', 
        'Fetching campaign data from Amazon Advertising API with enhanced error handling'
      );
      
      const { data: syncData, error: syncError } = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId },
        headers
      });

      if (syncError) {
        updateLastStep('error', `Sync failed: ${syncError.message || syncError}`);
        toast({
          title: "Sync Failed",
          description: syncError.message || "Failed to sync campaign data from Amazon",
          variant: "destructive",
        });
        return;
      }

      if (syncData?.error) {
        updateLastStep('error', `Amazon API error: ${syncData.error}`);
        
        // Provide specific guidance based on error type
        if (syncData.requiresSetup) {
          addStep('Amazon Advertising setup required', 'warning', 
            'Your Amazon account needs advertising setup completed. Visit advertising.amazon.com to create your first campaign.'
          );
          
          toast({
            title: "Setup Required",
            description: "Complete your Amazon Advertising setup and create at least one campaign.",
            variant: "destructive",
          });
        } else if (syncData.requiresReconnection) {
          addStep('Reconnection required', 'warning', 
            'Your Amazon connection needs to be refreshed. Please reconnect your account to continue.'
          );
          
          toast({
            title: "Reconnection Required",
            description: "Please reconnect your Amazon account to refresh the connection.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sync Error",
            description: syncData.details || syncData.error,
            variant: "destructive",
          });
        }
        return;
      }

      // Step 6: Success handling with detailed feedback
      const campaignCount = syncData?.campaignsSynced || syncData?.campaignCount || 0;
      updateLastStep('success', `Successfully synced ${campaignCount} campaigns from Amazon Advertising`);
      
      if (campaignCount > 0) {
        addStep('Campaign import completed', 'success', 
          `${campaignCount} campaigns imported and ready for optimization. You can now analyze performance and apply recommendations.`
        );
        
        // Add performance insights if available
        if (syncData?.campaignTypes) {
          addStep('Campaign analysis', 'info', 
            `Campaign types found: ${Object.entries(syncData.campaignTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}`
          );
        }
        
        toast({
          title: "Enhanced Sync Complete!",
          description: `Successfully synced ${campaignCount} campaigns. Your data is ready for optimization.`,
        });
      } else {
        addStep('Sync completed successfully', 'success', 
          'Sync was successful, but no campaigns were found in your Amazon Advertising account. This is normal for new accounts.'
        );
        
        addStep('Next steps', 'info', 
          'Create campaigns in Amazon Advertising (advertising.amazon.com) to see them here. Once created, run Enhanced Sync again to import them.'
        );
        
        toast({
          title: "Sync Complete",
          description: "Sync completed successfully. Create campaigns in Amazon Advertising to see them here.",
        });
      }

      // Step 7: Final summary and recommendations
      if (hoursUntilExpiry < 72) {
        addStep('Token expiry reminder', 'info', 
          `Your Amazon token expires in ${hoursUntilExpiry} hours. Consider reconnecting your account soon to maintain continuous sync capability.`
        );
      }

    } catch (err) {
      console.error('Enhanced sync error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addStep('Unexpected error', 'error', `Critical error during sync: ${errorMessage}`);
      
      toast({
        title: "Sync Failed",
        description: "An unexpected error occurred during enhanced sync. Please try again or contact support if the issue persists.",
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
