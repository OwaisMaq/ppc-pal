
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

export interface TokenValidationResult {
  isValid: boolean;
  hoursUntilExpiry: number;
  requiresRefresh: boolean;
  error?: string;
}

export interface AccountValidationResult {
  success: boolean;
  validation: {
    isValid: boolean;
    hasAdvertisingAccount: boolean;
    hasActiveProfiles: boolean;
    hasCampaigns: boolean;
    issues: string[];
    recommendations: string[];
    profilesFound: number;
    campaignsFound: number;
  };
  summary: {
    accountReady: boolean;
    setupRequired: boolean;
    canSync: boolean;
    nextSteps: string[];
  };
  message: string;
}

export interface CampaignSyncResult {
  success: boolean;
  campaignsSynced: number;
  campaignCount: number;
  syncStatus: string;
  message: string;
  error?: string;
  requiresReconnection?: boolean;
  requiresSetup?: boolean;
}

export const useEnhancedAmazonSync = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<SyncStep[]>([]);
  const { toast } = useToast();

  const addStep = (step: string, status: SyncStep['status'], details?: string, data?: any) => {
    console.log(`[Enhanced Sync] ${step}:`, details || '', data || '');
    setSteps(prev => [...prev, {
      step,
      status,
      details,
      data,
      timestamp: new Date()
    }]);
  };

  const updateLastStep = (status: SyncStep['status'], details?: string, data?: any) => {
    setSteps(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          status,
          details: details || updated[updated.length - 1].details,
          data: data || updated[updated.length - 1].data
        };
      }
      return updated;
    });
  };

  const validateToken = async (connectionId: string): Promise<TokenValidationResult> => {
    console.log('=== Token Refresh Check ===');
    addStep('Token Validation', 'pending', 'Checking token expiry and refreshing if needed...');

    try {
      console.log('[Enhanced Sync] Checking token expiry:', { connectionId });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication session not found');
      }
      
      console.log('Auth headers prepared successfully');

      const { data, error } = await supabase.functions.invoke('amazon-token-refresh', {
        body: { connectionId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('Token refresh error:', error);
        updateLastStep('error', `Token refresh failed: ${error.message}`);
        return {
          isValid: false,
          hoursUntilExpiry: 0,
          requiresRefresh: true,
          error: error.message
        };
      }

      if (!data.success) {
        updateLastStep('warning', data.details || data.error);
        return {
          isValid: false,
          hoursUntilExpiry: data.hoursUntilExpiry || 0,
          requiresRefresh: true,
          error: data.error
        };
      }

      updateLastStep('success', data.refreshed ? 
        `Token refreshed successfully (expires in ${data.hoursUntilExpiry} hours)` : 
        `Token valid (expires in ${data.hoursUntilExpiry} hours)`
      );

      return {
        isValid: true,
        hoursUntilExpiry: data.hoursUntilExpiry,
        requiresRefresh: false
      };

    } catch (error) {
      console.error('Token validation error:', error);
      updateLastStep('error', `Token validation failed: ${error.message}`);
      return {
        isValid: false,
        hoursUntilExpiry: 0,
        requiresRefresh: true,
        error: error.message
      };
    }
  };

  const validateAccount = async (connectionId: string): Promise<AccountValidationResult> => {
    console.log('=== Account Validation Started ===');
    addStep('Account Validation', 'pending', 'Validating Amazon account setup and permissions...');

    try {
      console.log('[Enhanced Sync] Validating Amazon account setup:', { connectionId });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication session not found');
      }
      
      console.log('Auth headers prepared successfully');

      const { data, error } = await supabase.functions.invoke('amazon-account-validation', {
        body: { connectionId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('Account validation error:', error);
        updateLastStep('error', `Account validation failed: ${error.message}`);
        throw new Error(`Account validation failed: ${error.message}`);
      }

      if (!data.success) {
        updateLastStep('warning', data.details || data.error);
        return {
          success: false,
          validation: {
            isValid: false,
            hasAdvertisingAccount: false,
            hasActiveProfiles: false,
            hasCampaigns: false,
            issues: [data.error],
            recommendations: ['Reconnect Amazon account'],
            profilesFound: 0,
            campaignsFound: 0
          },
          summary: {
            accountReady: false,
            setupRequired: true,
            canSync: false,
            nextSteps: ['Reconnect Amazon account']
          },
          message: data.error
        };
      }

      updateLastStep('success', `Account validation complete: ${data.message}`, {
        profilesFound: data.validation.profilesFound,
        campaignsFound: data.validation.campaignsFound,
        issues: data.validation.issues
      });

      return data;

    } catch (error) {
      console.error('Account validation error:', error);
      updateLastStep('error', `Account validation failed: ${error.message}`);
      return {
        success: false,
        validation: {
          isValid: false,
          hasAdvertisingAccount: false,
          hasActiveProfiles: false,
          hasCampaigns: false,
          issues: [error.message],
          recommendations: ['Check connection and try again'],
          profilesFound: 0,
          campaignsFound: 0
        },
        summary: {
          accountReady: false,
          setupRequired: true,
          canSync: false,
          nextSteps: ['Check connection and try again']
        },
        message: `Validation failed: ${error.message}`
      };
    }
  };

  const detectProfiles = async (connectionId: string): Promise<ProfileDetectionResult> => {
    console.log('=== Enhanced Profile Detection Started ===');
    addStep('Profile Detection', 'pending', 'Scanning all Amazon regions for advertising profiles...');

    try {
      console.log('[Enhanced Sync] Starting enhanced profile detection:', { connectionId });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication session not found');
      }
      
      console.log('Auth headers prepared successfully');
      console.log('Headers prepared, invoking enhanced detection function...');

      const { data, error } = await supabase.functions.invoke('amazon-enhanced-profile-detection', {
        body: { connectionId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('Enhanced detection response received:', { data: !!data, error: !!error });

      if (error) {
        console.error('Enhanced profile detection error:', error);
        updateLastStep('error', `Profile detection failed: ${error.message}`);
        return {
          success: false,
          profiles: [],
          errors: [error.message],
          primaryReason: 'API Error',
          detailedGuidance: ['Check your internet connection', 'Verify Amazon API credentials'],
          nextSteps: ['Try again later', 'Contact support if issue persists']
        };
      }

      if (!data.success) {
        updateLastStep('warning', `No profiles found: ${data.error || 'Unknown error'}`, {
          profilesFound: 0,
          regionsChecked: 3
        });
        return {
          success: false,
          profiles: [],
          errors: data.errors || [data.error || 'No profiles found'],
          primaryReason: 'No Advertising Profiles',
          detailedGuidance: [
            'Set up Amazon Advertising account at advertising.amazon.com',
            'Create at least one advertising campaign',
            'Wait 24 hours after setup for API access'
          ],
          nextSteps: [
            'Visit advertising.amazon.com',
            'Complete account setup',
            'Try connection again'
          ]
        };
      }

      updateLastStep('success', `Found ${data.profiles.length} profiles across ${data.detectionSummary.regionsDetected.length} regions`, {
        profilesFound: data.profiles.length,
        regionsChecked: 3,
        primaryRegion: data.detectionSummary.primaryRegion
      });

      return {
        success: true,
        profiles: data.profiles,
        detectionSummary: data.detectionSummary,
        nextSteps: data.detectionSummary.syncRecommendations
      };

    } catch (error) {
      console.error('Enhanced profile detection error:', error);
      updateLastStep('error', `Profile detection failed: ${error.message}`);
      return {
        success: false,
        profiles: [],
        errors: [error.message],
        primaryReason: 'Network Error',
        detailedGuidance: ['Check your internet connection', 'Try again in a few minutes'],
        nextSteps: ['Retry profile detection', 'Contact support if issue persists']
      };
    }
  };

  const updateConnectionWithProfiles = async (connectionId: string, profiles: any[]): Promise<boolean> => {
    try {
      if (profiles.length === 0) {
        console.log('No profiles to update connection with');
        return false;
      }

      const primaryProfile = profiles[0];
      console.log('=== Updating Connection with Profiles ===');
      console.log('Primary profile:', primaryProfile);

      addStep('Profile Update', 'pending', 'Updating connection with found profiles...');

      const { error } = await supabase
        .from('amazon_connections')
        .update({
          profile_id: primaryProfile.profileId.toString(),
          profile_name: primaryProfile.accountInfo?.name || `${primaryProfile.countryCode} Profile`,
          marketplace_id: primaryProfile.accountInfo?.marketplaceStringId || primaryProfile.countryCode,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) {
        console.error('Failed to update connection:', error);
        updateLastStep('error', `Failed to update connection: ${error.message}`);
        return false;
      }

      updateLastStep('success', `Connection updated with profile: ${primaryProfile.accountInfo?.name || primaryProfile.profileId}`);
      return true;

    } catch (error) {
      console.error('Error updating connection with profiles:', error);
      updateLastStep('error', `Update failed: ${error.message}`);
      return false;
    }
  };

  const syncCampaigns = async (connectionId: string): Promise<CampaignSyncResult> => {
    console.log('=== Campaign Sync Started ===');
    addStep('Campaign Sync', 'pending', 'Fetching campaign data from Amazon Ads API...');

    try {
      console.log('[Enhanced Sync] Starting campaign sync:', { connectionId });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication session not found');
      }
      
      console.log('Auth headers prepared successfully');

      const { data, error } = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('Campaign sync response received:', { data: !!data, error: !!error });

      if (error) {
        console.error('Campaign sync error:', error);
        updateLastStep('error', `Campaign sync failed: ${error.message}`);
        return {
          success: false,
          campaignsSynced: 0,
          campaignCount: 0,
          syncStatus: 'error',
          message: 'Campaign sync failed',
          error: error.message
        };
      }

      if (!data.success) {
        if (data.requiresReconnection) {
          updateLastStep('error', `Campaign sync failed: ${data.error}`, {
            requiresReconnection: true
          });
          return {
            success: false,
            campaignsSynced: 0,
            campaignCount: 0,
            syncStatus: 'error',
            message: data.message || 'Token expired - reconnection required',
            error: data.error,
            requiresReconnection: true
          };
        }

        if (data.requiresSetup) {
          updateLastStep('warning', `Campaign sync incomplete: ${data.error}`, {
            requiresSetup: true
          });
          return {
            success: false,
            campaignsSynced: 0,
            campaignCount: 0,
            syncStatus: 'setup_required',
            message: data.message || 'Amazon Advertising setup required',
            error: data.error,
            requiresSetup: true
          };
        }

        updateLastStep('warning', `Campaign sync completed with issues: ${data.error}`);
        return {
          success: false,
          campaignsSynced: data.campaignsSynced || 0,
          campaignCount: data.campaignCount || 0,
          syncStatus: data.syncStatus || 'warning',
          message: data.message || 'Sync completed with issues',
          error: data.error
        };
      }

      const campaignCount = data.campaignsSynced || data.campaignCount || 0;
      updateLastStep('success', `Successfully synced ${campaignCount} campaigns`, {
        campaignsSynced: campaignCount,
        syncStatus: data.syncStatus
      });

      return {
        success: true,
        campaignsSynced: campaignCount,
        campaignCount: campaignCount,
        syncStatus: data.syncStatus || 'success',
        message: data.message || `Successfully synced ${campaignCount} campaigns`
      };

    } catch (error) {
      console.error('Campaign sync error:', error);
      updateLastStep('error', `Campaign sync failed: ${error.message}`);
      return {
        success: false,
        campaignsSynced: 0,
        campaignCount: 0,
        syncStatus: 'error',
        message: `Campaign sync failed: ${error.message}`,
        error: error.message
      };
    }
  };

  const updateConnectionStatus = async (connectionId: string, profilesFound: number, campaignsSynced: number): Promise<void> => {
    try {
      console.log('=== Updating Connection Status ===');
      addStep('Status Update', 'pending', 'Updating connection status...');

      let status: 'active' | 'setup_required' | 'warning' | 'error' = 'active';
      let setupRequiredReason: string | null = null;

      if (profilesFound === 0) {
        status = 'setup_required';
        setupRequiredReason = 'no_advertising_profiles';
      } else if (campaignsSynced === 0) {
        status = 'setup_required';
        setupRequiredReason = 'needs_sync';
      } else {
        status = 'active';
        setupRequiredReason = null;
      }

      const { error } = await supabase
        .from('amazon_connections')
        .update({
          status,
          setup_required_reason: setupRequiredReason,
          campaign_count: campaignsSynced,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) {
        console.error('Failed to update connection status:', error);
        updateLastStep('error', `Failed to update connection status: ${error.message}`);
        return;
      }

      updateLastStep('success', `Connection status updated: ${status} (${campaignsSynced} campaigns)`);

    } catch (error) {
      console.error('Error updating connection status:', error);
      updateLastStep('error', `Status update failed: ${error.message}`);
    }
  };

  const runEnhancedSync = async (connectionId: string) => {
    setIsRunning(true);
    console.log('[Enhanced Sync] Running enhanced sync:', { connectionId });

    try {
      // Step 1: Validate and refresh token
      const tokenResult = await validateToken(connectionId);
      if (!tokenResult.isValid && tokenResult.requiresRefresh) {
        addStep('Sync Failed', 'error', 'Cannot proceed without valid token');
        return;
      }

      // Step 2: Validate account
      const accountResult = await validateAccount(connectionId);
      if (!accountResult.success) {
        addStep('Sync Failed', 'error', 'Account validation failed - cannot proceed with sync');
        return;
      }

      // Step 3: Detect profiles
      const profileResult = await detectProfiles(connectionId);
      if (!profileResult.success) {
        addStep('Sync Incomplete', 'warning', 'No profiles found - setup required');
        await updateConnectionStatus(connectionId, 0, 0);
        return;
      }

      // Step 4: Update connection with found profiles
      const updateSuccess = await updateConnectionWithProfiles(connectionId, profileResult.profiles);
      if (!updateSuccess) {
        addStep('Sync Warning', 'warning', 'Profiles found but connection update failed');
        await updateConnectionStatus(connectionId, profileResult.profiles.length, 0);
        return;
      }

      // Step 5: Sync campaigns
      const campaignResult = await syncCampaigns(connectionId);
      
      // Step 6: Update final connection status
      await updateConnectionStatus(connectionId, profileResult.profiles.length, campaignResult.campaignsSynced);

      if (campaignResult.success) {
        addStep('Enhanced Sync Complete', 'success', 
          `Successfully completed enhanced sync: ${campaignResult.campaignsSynced} campaigns synced`);
      } else if (campaignResult.requiresReconnection) {
        addStep('Sync Failed - Reconnection Required', 'error', 
          'Token expired or invalid - please reconnect your Amazon account');
      } else if (campaignResult.requiresSetup) {
        addStep('Sync Incomplete - Setup Required', 'warning', 
          'Profile updated but no campaigns found - Amazon Advertising setup may be required');
      } else {
        addStep('Sync Completed with Issues', 'warning', 
          `Profile updated but campaign sync had issues: ${campaignResult.error}`);
      }

    } catch (error) {
      console.error('Enhanced sync error:', error);
      addStep('Sync Failed', 'error', `Unexpected error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runConnectionRecovery = async (connectionId: string) => {
    console.log('[Enhanced Sync] Running enhanced connection recovery:', { connectionId });
    
    // Run the enhanced sync which now includes both profile and campaign sync
    await runEnhancedSync(connectionId);
    
    const hasErrors = steps.some(step => step.status === 'error');
    const profileDetectionStep = steps.find(step => step.step === 'Profile Detection');
    const profilesFound = profileDetectionStep?.data?.profilesFound || 0;
    const campaignSyncStep = steps.find(step => step.step === 'Campaign Sync');
    const campaignsSynced = campaignSyncStep?.data?.campaignsSynced || 0;
    
    return {
      success: !hasErrors && profilesFound > 0 && campaignsSynced >= 0,
      profilesFound,
      campaignsSynced,
      requiresReconnection: steps.some(step => step.data?.requiresReconnection),
      requiresSetup: steps.some(step => step.data?.requiresSetup),
      guidance: hasErrors ? 'Please check the errors above and try reconnecting' : 
                campaignsSynced > 0 ? `Successfully synced ${campaignsSynced} campaigns` :
                profilesFound > 0 ? 'Profile updated but no campaigns found - may need Amazon Advertising setup' :
                'Recovery completed but no profiles found'
    };
  };

  const runEnhancedProfileDetection = async (connectionId: string) => {
    setIsRunning(true);
    try {
      return await detectProfiles(connectionId);
    } finally {
      setIsRunning(false);
    }
  };

  const debugConnection = async (connectionId: string) => {
    console.log('=== Enhanced Debug Connection Started ===');
    setIsRunning(true);
    
    try {
      console.log('[Enhanced Sync] Starting enhanced connection debug:', { connectionId });
      
      // Run all diagnostic steps including campaign sync
      await validateToken(connectionId);
      await validateAccount(connectionId);
      const profileResult = await detectProfiles(connectionId);
      
      // If profiles found, try to update connection and sync campaigns
      if (profileResult.success && profileResult.profiles.length > 0) {
        const updateSuccess = await updateConnectionWithProfiles(connectionId, profileResult.profiles);
        if (updateSuccess) {
          await syncCampaigns(connectionId);
        }
      }
      
      const hasErrors = steps.some(step => step.status === 'error');
      const issues = steps.filter(step => step.status === 'error').map(step => step.details || step.step);
      
      return {
        success: !hasErrors,
        issues,
        message: hasErrors ? 'Debug found issues - see steps above' : 'Debug completed successfully'
      };
      
    } catch (error) {
      console.error('Debug connection error:', error);
      return {
        success: false,
        issues: [error.message],
        message: 'Debug failed with error'
      };
    } finally {
      setIsRunning(false);
    }
  };

  const clearSteps = () => {
    setSteps([]);
  };

  return {
    steps,
    isRunning,
    runEnhancedSync,
    runConnectionRecovery,
    runEnhancedProfileDetection,
    debugConnection,
    clearSteps,
    validateToken,
    validateAccount,
    detectProfiles,
    syncCampaigns,
    addStep,
    updateLastStep
  };
};
