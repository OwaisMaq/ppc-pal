
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
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      console.error('No access token in session');
      throw new Error('No valid session found. Please sign in again.');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  const runEnhancedProfileDetection = async (connectionId: string): Promise<ProfileDetectionResult> => {
    console.log('=== Enhanced Profile Detection Started ===');
    
    try {
      addStep('Starting enhanced profile detection', 'pending', 'Using advanced multi-strategy detection');
      
      const headers = await getAuthHeaders();
      
      const { data, error } = await supabase.functions.invoke('amazon-enhanced-profile-detection', {
        body: { connectionId },
        headers
      });

      if (error) {
        console.error('Enhanced profile detection error:', error);
        updateLastStep('error', `Detection failed: ${error.message}`);
        return {
          success: false,
          profiles: [],
          errors: [error.message],
          primaryReason: 'API communication error'
        };
      }

      if (data?.success && data.profiles?.length > 0) {
        const summary = data.detectionSummary || {};
        updateLastStep('success', 
          `Successfully detected ${data.profiles.length} advertising profiles`,
          { 
            profilesFound: data.profiles.length,
            regionsChecked: summary.regionsChecked?.length || 0,
            strategiesUsed: summary.strategiesAttempted || 0
          }
        );
        
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
          updateLastStep('error', 'Authentication issues detected', {
            requiresReconnection: true
          });
        } else {
          updateLastStep('warning', reason, { 
            regionsChecked: data?.detectionSummary?.regionsChecked || 0,
            strategiesAttempted: data?.detectionSummary?.strategiesAttempted || 0
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
    const profileName = primaryProfile.countryCode || `Profile ${primaryProfile.profileId}`;
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

    return { profileId, profileName, marketplaceId };
  };

  const runConnectionRecovery = async (connectionId: string) => {
    addStep('Running connection recovery', 'pending', 'Detecting and configuring advertising profiles automatically');
    
    try {
      const profileResult = await runEnhancedProfileDetection(connectionId);
      
      if (profileResult.success && profileResult.profiles.length > 0) {
        addStep('Configuring connection', 'pending', 
          `Found ${profileResult.profiles.length} profile${profileResult.profiles.length === 1 ? '' : 's'}`);
        
        try {
          const updatedProfile = await updateConnectionWithProfiles(connectionId, profileResult.profiles);
          updateLastStep('success', 
            `Connection configured with ${updatedProfile.profileName}`,
            updatedProfile
          );
          
          if (profileResult.profiles.length > 1) {
            addStep('Multiple profiles detected', 'info', 
              `${profileResult.profiles.length} profiles found. Using ${updatedProfile.profileName} as primary.`);
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
            'Your Amazon connection has authentication problems. Please reconnect your account.');
          
          return { 
            success: false, 
            error: 'Authentication required',
            requiresReconnection: true
          };
        } else {
          addStep('No advertising profiles found', 'warning', 
            profileResult.primaryReason || 'No advertising profiles found in your Amazon account.'
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
      addStep('Initializing enhanced sync', 'pending', `Starting sync for connection: ${connectionId}`);

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
        updateLastStep('error', 'Connection not found');
        toast({
          title: "Connection Error",
          description: "Could not find the Amazon connection.",
          variant: "destructive",
        });
        return;
      }
      updateLastStep('success', `Connection validated: ${connection.profile_name || 'Amazon account'}`);

      // Enhanced token validity check
      addStep('Checking token validity', 'pending', 'Verifying Amazon API token');
      const tokenExpiry = new Date(connection.token_expires_at);
      const now = new Date();
      const hoursUntilExpiry = Math.round((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (tokenExpiry <= now) {
        updateLastStep('error', `Access token expired ${Math.abs(hoursUntilExpiry)} hours ago`);
        toast({
          title: "Token Expired",
          description: "Please reconnect your Amazon account.",
          variant: "destructive",
        });
        return;
      }
      
      updateLastStep('success', `Token valid for ${hoursUntilExpiry} hours`);

      // Enhanced profile validation and recovery
      addStep('Validating profile configuration', 'pending', 'Checking advertising profile setup');
      
      const isValidProfile = connection.profile_id && 
                           connection.profile_id !== 'setup_required_no_profiles_found' &&
                           /^\d+$/.test(connection.profile_id);
      
      if (!isValidProfile) {
        updateLastStep('warning', `Profile issue: ${connection.profile_id || 'No profile ID'}`);
        
        const recoveryResult = await runConnectionRecovery(connectionId);
        
        if (!recoveryResult.success) {
          if (recoveryResult.requiresReconnection) {
            toast({
              title: "Reconnection Required",
              description: "Please reconnect your Amazon account.",
              variant: "destructive",
            });
            return;
          } else {
            toast({
              title: "Setup Required",
              description: recoveryResult.guidance || "Complete Amazon Advertising setup at advertising.amazon.com",
              variant: "destructive",
            });
            return;
          }
        }

        addStep('Profile recovery completed', 'success', 
          `Successfully configured ${recoveryResult.profilesFound} profile${recoveryResult.profilesFound === 1 ? '' : 's'}`
        );
      } else {
        updateLastStep('success', `Profile validated: ${connection.profile_id}`);
      }

      // Enhanced campaign sync
      addStep('Syncing campaigns', 'pending', 'Fetching campaign data from Amazon');
      
      const { data: syncData, error: syncError } = await supabase.functions.invoke('amazon-sync', {
        body: { connectionId },
        headers
      });

      if (syncError) {
        updateLastStep('error', `Sync failed: ${syncError.message}`);
        toast({
          title: "Sync Failed",
          description: syncError.message || "Failed to sync campaign data",
          variant: "destructive",
        });
        return;
      }

      if (syncData?.error) {
        updateLastStep('error', `Amazon API error: ${syncData.error}`);
        
        if (syncData.requiresSetup) {
          addStep('Amazon Advertising setup required', 'warning', 
            'Visit advertising.amazon.com to create your first campaign.');
          
          toast({
            title: "Setup Required",
            description: "Complete Amazon Advertising setup and create campaigns.",
            variant: "destructive",
          });
        } else if (syncData.requiresReconnection) {
          addStep('Reconnection required', 'warning', 
            'Please reconnect your Amazon account.');
          
          toast({
            title: "Reconnection Required",
            description: "Please reconnect your Amazon account.",
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

      // Success handling
      const campaignCount = syncData?.campaignsSynced || syncData?.campaignCount || 0;
      updateLastStep('success', `Successfully synced ${campaignCount} campaigns`);
      
      if (campaignCount > 0) {
        addStep('Campaign import completed', 'success', 
          `${campaignCount} campaigns imported and ready for optimization.`
        );
        
        toast({
          title: "Enhanced Sync Complete!",
          description: `Successfully synced ${campaignCount} campaigns.`,
        });
      } else {
        addStep('Sync completed successfully', 'success', 
          'Sync successful, but no campaigns found. This is normal for new accounts.'
        );
        
        addStep('Next steps', 'info', 
          'Create campaigns at advertising.amazon.com to see them here.'
        );
        
        toast({
          title: "Sync Complete",
          description: "Sync completed. Create campaigns in Amazon Advertising to see them here.",
        });
      }

    } catch (err) {
      console.error('Enhanced sync error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addStep('Unexpected error', 'error', `Critical error: ${errorMessage}`);
      
      toast({
        title: "Sync Failed",
        description: "An unexpected error occurred. Please try again.",
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
