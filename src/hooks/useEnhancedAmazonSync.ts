
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
      
      // Get auth headers
      console.log('=== Getting Auth Headers ===');
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
      
      // Get auth headers
      console.log('=== Getting Auth Headers ===');
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
      
      // Get auth headers
      console.log('=== Getting Auth Headers ===');
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
        return;
      }

      addStep('Enhanced Sync Complete', 'success', 'All validation steps completed successfully');

    } catch (error) {
      console.error('Enhanced sync error:', error);
      addStep('Sync Failed', 'error', `Unexpected error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runConnectionRecovery = async (connectionId: string) => {
    console.log('[Enhanced Sync] Running enhanced connection recovery:', { connectionId });
    
    // This is a simplified recovery - just run the enhanced sync
    await runEnhancedSync(connectionId);
    
    const hasErrors = steps.some(step => step.status === 'error');
    const profileDetectionStep = steps.find(step => step.step === 'Profile Detection');
    const profilesFound = profileDetectionStep?.data?.profilesFound || 0;
    
    return {
      success: !hasErrors && profilesFound > 0,
      profilesFound,
      requiresReconnection: hasErrors,
      guidance: hasErrors ? 'Please check the errors above and try reconnecting' : 'Recovery completed successfully'
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
      
      // Run all diagnostic steps
      await validateToken(connectionId);
      await validateAccount(connectionId);
      await detectProfiles(connectionId);
      
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
    addStep,
    updateLastStep
  };
};
