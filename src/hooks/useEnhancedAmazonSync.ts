
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
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        console.error('No access token in session');
        throw new Error('No valid session found. Please sign in again.');
      }
      
      console.log('Auth headers prepared successfully');
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Failed to get auth headers:', error);
      throw error;
    }
  };

  const refreshTokenIfNeeded = async (connectionId: string): Promise<boolean> => {
    console.log('=== Token Refresh Check ===');
    
    try {
      addStep('Checking token expiry', 'pending', 'Validating Amazon access token');
      
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('amazon-token-refresh', {
        body: { connectionId },
        headers
      });

      if (error) {
        console.error('Token refresh error:', error);
        updateLastStep('error', `Token refresh failed: ${error.message}`);
        return false;
      }

      if (data?.requiresReconnection) {
        updateLastStep('error', 'Amazon connection expired - reconnection required');
        return false;
      }

      if (data?.refreshed) {
        updateLastStep('success', `Token refreshed - expires in ${data.hoursUntilExpiry} hours`);
      } else {
        updateLastStep('success', `Token valid - expires in ${data.hoursUntilExpiry} hours`);
      }

      return true;
    } catch (err) {
      console.error('Token refresh check error:', err);
      updateLastStep('error', `Token validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  };

  const validateAmazonAccount = async (connectionId: string): Promise<AccountValidationResult | null> => {
    console.log('=== Account Validation Started ===');
    
    try {
      addStep('Validating Amazon account setup', 'pending', 'Checking advertising account configuration');
      
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('amazon-account-validation', {
        body: { connectionId },
        headers
      });

      if (error) {
        console.error('Account validation error:', error);
        updateLastStep('error', `Account validation failed: ${error.message}`);
        return null;
      }

      const validation = data as AccountValidationResult;
      
      if (validation.validation.isValid) {
        if (validation.validation.hasCampaigns) {
          updateLastStep('success', 
            `Account validated - ${validation.validation.profilesFound} profiles, ${validation.validation.campaignsFound} campaigns`
          );
        } else {
          updateLastStep('warning', 
            `Account setup complete but no campaigns found - ${validation.validation.profilesFound} profiles detected`
          );
        }
      } else {
        updateLastStep('error', 
          `Account setup issues: ${validation.validation.issues.join(', ')}`
        );
        
        if (validation.validation.recommendations.length > 0) {
          addStep('Setup recommendations', 'info', 
            validation.validation.recommendations.join(' • ')
          );
        }
      }

      return validation;
    } catch (err) {
      console.error('Account validation error:', err);
      updateLastStep('error', `Account validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    }
  };

  const runEnhancedProfileDetection = async (connectionId: string): Promise<ProfileDetectionResult> => {
    console.log('=== Enhanced Profile Detection Started ===');
    
    try {
      addStep('Starting enhanced profile detection', 'pending', 'Scanning multiple regions for advertising profiles');
      
      const headers = await getAuthHeaders();
      console.log('Headers prepared, invoking enhanced detection function...');
      
      const { data, error } = await supabase.functions.invoke('amazon-enhanced-profile-detection', {
        body: { connectionId },
        headers
      });

      console.log('Enhanced detection response received:', { data: !!data, error: !!error });

      if (error) {
        console.error('Enhanced profile detection error:', error);
        updateLastStep('error', `Detection failed: ${error.message}`);
        return {
          success: false,
          profiles: [],
          errors: [error.message],
          primaryReason: 'Function invocation error'
        };
      }

      console.log('Enhanced detection data received:', Object.keys(data || {}));

      if (data?.success && data.profiles?.length > 0) {
        const summary = data.detectionSummary || {};
        updateLastStep('success', 
          `Successfully detected ${data.profiles.length} advertising profiles across ${summary.successfulRegions || 0} regions`,
          { 
            profilesFound: data.profiles.length,
            regionsChecked: summary.regionsChecked || 0,
            successfulRegions: summary.successfulRegions || 0,
            primaryRegion: summary.primaryRegion || 'Unknown'
          }
        );
        
        // Add regional breakdown if multiple regions found profiles
        if (summary.successfulRegions > 1) {
          addStep('Multi-region detection success', 'info', 
            `Profiles detected across ${summary.successfulRegions} regions. Primary region: ${summary.primaryRegion}`
          );
        }
        
        return {
          success: true,
          profiles: data.profiles,
          detectionSummary: summary,
          nextSteps: data.nextSteps
        };
      } else {
        const reason = data?.primaryReason || 'No advertising profiles found';
        const guidance = data?.detailedGuidance || ['Amazon Advertising setup required'];
        const troubleshooting = data?.troubleshooting || {};
        
        if (troubleshooting.authenticationIssues) {
          updateLastStep('error', 'Authentication issues detected across regions', {
            requiresReconnection: true,
            authenticationIssues: true
          });
        } else {
          updateLastStep('warning', reason, { 
            regionsChecked: data?.detectionSummary?.regionsChecked || 0,
            successfulRegions: data?.detectionSummary?.successfulRegions || 0,
            detectionResults: data?.detectionSummary?.detectionResults || []
          });
        }
        
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
    
    if (!profiles || profiles.length === 0) {
      throw new Error('No profiles provided for connection update');
    }

    const primaryProfile = profiles[0];
    const profileId = primaryProfile.profileId.toString();
    const profileName = `${primaryProfile.countryCode} Profile (${primaryProfile.detectedRegion || 'Unknown Region'})`;
    const marketplaceId = primaryProfile.accountInfo?.marketplaceStringId || 
                         primaryProfile.marketplaceStringId ||
                         primaryProfile.countryCode;

    console.log('Updating connection with enhanced profile data:', {
      profileId,
      profileName,
      marketplaceId,
      detectedRegion: primaryProfile.detectedRegion,
      profileCount: profiles.length
    });

    const { error: updateError } = await supabase
      .from('amazon_connections')
      .update({
        profile_id: profileId,
        profile_name: profileName,
        marketplace_id: marketplaceId,
        status: 'active', // Set to active once profile is configured
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Failed to update connection:', updateError);
      throw new Error(`Failed to update connection: ${updateError.message}`);
    }

    return { profileId, profileName, marketplaceId, profileCount: profiles.length };
  };

  const runConnectionRecovery = async (connectionId: string) => {
    addStep('Running connection recovery', 'pending', 'Intelligent profile detection and configuration');
    
    try {
      // Step 1: Refresh token if needed
      const tokenValid = await refreshTokenIfNeeded(connectionId);
      if (!tokenValid) {
        return { 
          success: false, 
          error: 'Token refresh required',
          requiresReconnection: true
        };
      }

      // Step 2: Validate account setup
      const accountValidation = await validateAmazonAccount(connectionId);
      if (!accountValidation?.validation.isValid) {
        return {
          success: false,
          error: accountValidation?.validation.issues.join(', ') || 'Account validation failed',
          guidance: accountValidation?.validation.recommendations?.[0] || 'Account setup required',
          nextSteps: accountValidation?.validation.recommendations || []
        };
      }

      // Step 3: Enhanced profile detection
      const profileResult = await runEnhancedProfileDetection(connectionId);
      
      if (profileResult.success && profileResult.profiles.length > 0) {
        addStep('Configuring connection', 'pending', 
          `Found ${profileResult.profiles.length} profile${profileResult.profiles.length === 1 ? '' : 's'} - setting up optimal configuration`);
        
        try {
          const updatedProfile = await updateConnectionWithProfiles(connectionId, profileResult.profiles);
          updateLastStep('success', 
            `Connection configured with ${updatedProfile.profileName}`,
            {
              ...updatedProfile,
              detectedRegion: profileResult.profiles[0]?.detectedRegion
            }
          );
          
          if (profileResult.profiles.length > 1) {
            addStep('Multi-profile optimization', 'info', 
              `${profileResult.profiles.length} profiles available. Using optimal profile from ${profileResult.profiles[0]?.detectedRegion || 'primary region'}.`);
          }
          
          return { success: true, profilesFound: profileResult.profiles.length };
        } catch (updateErr) {
          updateLastStep('error', `Failed to update connection: ${updateErr.message}`);
          return { success: false, error: updateErr.message };
        }
      } else {
        const troubleshooting = profileResult.troubleshooting || {};
        
        if (troubleshooting.authenticationIssues) {
          addStep('Authentication issues detected', 'error', 
            'Your Amazon connection has authentication problems across multiple regions. Please reconnect your account.');
          
          return { 
            success: false, 
            error: 'Authentication required',
            requiresReconnection: true
          };
        } else {
          addStep('No advertising profiles found', 'warning', 
            profileResult.primaryReason || 'No advertising profiles found in your Amazon account across all regions.'
          );
          
          if (profileResult.detailedGuidance && profileResult.detailedGuidance.length > 0) {
            addStep('Setup instructions', 'info', 
              'To resolve: ' + profileResult.detailedGuidance.join(' → ')
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

  const debugConnection = async (connectionId: string) => {
    console.log('=== Debug Connection Started ===');
    
    try {
      addStep('Starting connection debug', 'pending', 'Running comprehensive connection analysis');
      
      // Token validation check
      const tokenValid = await refreshTokenIfNeeded(connectionId);
      
      // Account validation check
      const accountValidation = await validateAmazonAccount(connectionId);
      
      // Profile detection test
      const profileResult = await runEnhancedProfileDetection(connectionId);
      
      if (tokenValid && accountValidation?.validation.isValid && profileResult.success) {
        updateLastStep('success', 'All connection checks passed successfully');
        return { success: true };
      } else {
        const issues = [];
        if (!tokenValid) issues.push('Token validation failed');
        if (!accountValidation?.validation.isValid) issues.push('Account validation failed');
        if (!profileResult.success) issues.push('Profile detection failed');
        
        updateLastStep('warning', `Debug found issues: ${issues.join(', ')}`);
        return { success: false, issues };
      }
    } catch (err) {
      console.error('Debug connection error:', err);
      updateLastStep('error', `Debug failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      addStep('Initializing enhanced sync', 'pending', `Starting intelligent sync for connection: ${connectionId}`);

      // Validate session and get auth headers
      addStep('Validating authentication', 'pending', 'Checking session and preparing API headers');
      let headers;
      try {
        headers = await getAuthHeaders();
        updateLastStep('success', 'Authentication validated');
      } catch (authError) {
        updateLastStep('error', `Authentication failed: ${authError.message}`);
        toast({
          title: "Authentication Error",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
        return;
      }

      // Validate connection
      addStep('Validating Amazon connection', 'pending', 'Verifying connection exists');
      const { data: connection, error: connectionError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connection) {
        updateLastStep('error', 'Connection not found or access denied');
        toast({
          title: "Connection Error",
          description: "Amazon connection not found. Please reconnect your account.",
          variant: "destructive",
        });
        return;
      }

      updateLastStep('success', `Connection found: ${connection.profile_name || 'Amazon Account'}`);

      // Run enhanced connection recovery
      console.log('=== Starting Intelligent Recovery ===');
      const recoveryResult = await runConnectionRecovery(connectionId);

      if (recoveryResult.success) {
        addStep('Enhanced sync completed', 'success', 
          `Successfully configured Amazon connection with ${recoveryResult.profilesFound} profile${recoveryResult.profilesFound === 1 ? '' : 's'} - ready for campaign sync`
        );
        
        toast({
          title: "Enhanced Sync Successful",
          description: `Amazon connection is now properly configured across multiple regions and ready for campaign sync.`,
        });
      } else {
        if (recoveryResult.requiresReconnection) {
          addStep('Reconnection required', 'error', 
            'Please reconnect your Amazon account to resolve authentication issues across all regions'
          );
          
          toast({
            title: "Reconnection Required",
            description: "Your Amazon connection needs to be re-established. Please reconnect your account.",
            variant: "destructive",
          });
        } else {
          addStep('Setup guidance provided', 'warning', 
            recoveryResult.guidance || 'Additional setup required'
          );
          
          toast({
            title: "Setup Required", 
            description: recoveryResult.guidance || "Additional Amazon Advertising setup is required.",
            variant: "destructive",
          });
        }
      }

    } catch (error) {
      console.error('Enhanced sync error:', error);
      addStep('Enhanced sync failed', 'error', 
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      toast({
        title: "Sync Failed",
        description: "An unexpected error occurred during enhanced sync.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return {
    isRunning,
    steps,
    clearSteps,
    runEnhancedSync,
    runConnectionRecovery,
    runEnhancedProfileDetection,
    validateAmazonAccount,
    refreshTokenIfNeeded,
    debugConnection
  };
};
