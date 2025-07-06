
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DebugStep {
  step: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  details?: string;
  data?: any;
  timestamp: Date;
}

export const useDebugAmazonSync = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);

  const addDebugStep = (step: string, status: DebugStep['status'], details?: string, data?: any) => {
    const debugStep: DebugStep = {
      step,
      status,
      details,
      data,
      timestamp: new Date()
    };
    
    console.log(`[DEBUG] ${step}: ${status}`, { details, data });
    setDebugSteps(prev => [...prev, debugStep]);
    return debugStep;
  };

  const updateLastStep = (status: DebugStep['status'], details?: string, data?: any) => {
    setDebugSteps(prev => {
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

  const clearDebugSteps = () => {
    setDebugSteps([]);
  };

  const getAuthHeaders = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      throw new Error('Failed to get valid session for API calls');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  const validateProfileConfiguration = (profileId: string) => {
    if (!profileId) return { isValid: false, reason: 'No profile ID' };
    if (profileId === 'setup_required_no_profiles_found') return { isValid: false, reason: 'No advertising profiles found' };
    if (profileId.includes('error') || profileId === 'invalid') return { isValid: false, reason: 'Invalid profile ID' };
    if (!/^\d+$/.test(profileId)) return { isValid: false, reason: 'Profile ID should be numeric' };
    return { isValid: true };
  };

  const runDebugSync = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to run debug analysis",
        variant: "destructive",
      });
      return;
    }

    setIsDebugging(true);
    setDebugSteps([]);

    try {
      // Step 1: Authentication check
      addDebugStep("Verifying user authentication", "pending");
      updateLastStep("success", `Authenticated as: ${user.email}`, { 
        userId: user.id,
        email: user.email 
      });

      // Step 2: Session validation
      addDebugStep("Validating session and auth headers", "pending");
      try {
        const headers = await getAuthHeaders();
        updateLastStep("success", "Session and auth headers validated", { 
          hasAuthHeader: !!headers.Authorization,
          tokenLength: headers.Authorization.length 
        });
      } catch (headerError) {
        updateLastStep("error", "Auth header validation failed", { error: headerError.message });
        return;
      }

      // Step 3: Fetch connections with enhanced validation
      addDebugStep("Fetching and analyzing Amazon connections", "pending");
      const { data: connections, error: connectionsError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('user_id', user.id);

      if (connectionsError) {
        updateLastStep("error", "Failed to fetch connections", connectionsError);
        return;
      }

      if (!connections || connections.length === 0) {
        updateLastStep("warning", "No Amazon connections found", { 
          connectionsCount: 0,
          recommendation: "Connect your Amazon account first" 
        });
        return;
      }

      updateLastStep("success", `Found ${connections.length} connection(s)`, { 
        connectionsCount: connections.length,
        connections: connections.map(c => ({
          id: c.id,
          profile_id: c.profile_id,
          profile_name: c.profile_name,
          status: c.status,
          marketplace_id: c.marketplace_id,
          last_sync_at: c.last_sync_at
        }))
      });

      // Step 4: Detailed connection analysis
      for (const [index, connection] of connections.entries()) {
        addDebugStep(`Analyzing connection ${index + 1}: ${connection.profile_name || 'Unnamed'}`, "pending");
        
        const analysis = {
          connectionId: connection.id,
          profileId: connection.profile_id,
          profileName: connection.profile_name,
          status: connection.status,
          marketplaceId: connection.marketplace_id,
          lastSync: connection.last_sync_at,
          issues: [],
          recommendations: []
        };

        // Token expiry check
        const tokenExpiry = new Date(connection.token_expires_at);
        const now = new Date();
        const isTokenExpired = tokenExpiry <= now;
        const hoursUntilExpiry = Math.round((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        if (isTokenExpired) {
          analysis.issues.push(`Token expired ${Math.abs(hoursUntilExpiry)} hours ago`);
          analysis.recommendations.push("Reconnect Amazon account to refresh token");
          updateLastStep("error", "Access token has expired", {
            tokenExpiry: tokenExpiry.toISOString(),
            expiredHoursAgo: Math.abs(hoursUntilExpiry)
          });
          continue;
        } else {
          analysis.issues.push(`Token expires in ${hoursUntilExpiry} hours`);
        }

        // Profile validation
        const profileValidation = validateProfileConfiguration(connection.profile_id);
        if (!profileValidation.isValid) {
          analysis.issues.push(`Profile issue: ${profileValidation.reason}`);
          analysis.recommendations.push("Use Enhanced Sync to detect advertising profiles");
        }

        updateLastStep("success", "Connection analysis completed", analysis);

        // Step 5: API connectivity test
        addDebugStep(`Testing Amazon API connectivity for connection ${index + 1}`, "pending");
        
        try {
          const headers = await getAuthHeaders();
          
          const { data: testResult, error: testError } = await supabase.functions.invoke('amazon-test-connection', {
            body: { connectionId: connection.id },
            headers
          });

          if (testError) {
            updateLastStep("error", "API connectivity test failed", { 
              error: testError.message,
              recommendation: "Check connection status and try reconnecting"
            });
            continue;
          }

          if (testResult?.error) {
            updateLastStep("warning", "API connectivity issues detected", {
              apiError: testResult.error,
              details: testResult.details,
              recommendation: testResult.requiresReconnection ? "Reconnect account" : "Try Enhanced Sync"
            });
            continue;
          }

          updateLastStep("success", "API connectivity confirmed", testResult);

          // Step 6: Enhanced profile detection test
          if (!profileValidation.isValid) {
            addDebugStep(`Testing enhanced profile detection for connection ${index + 1}`, "pending");
            
            const { data: profileResult, error: profileError } = await supabase.functions.invoke('amazon-enhanced-profile-detection', {
              body: { connectionId: connection.id },
              headers
            });

            if (profileError) {
              updateLastStep("error", "Enhanced profile detection failed", profileError);
            } else if (profileResult?.success) {
              updateLastStep("success", "Enhanced profile detection successful", {
                profilesFound: profileResult.profiles?.length || 0,
                regionsChecked: profileResult.regions?.length || 0,
                recommendation: "Use Enhanced Sync to configure these profiles"
              });
            } else {
              updateLastStep("warning", "No advertising profiles found", {
                regionsChecked: profileResult?.regions?.length || 0,
                recommendation: "Set up Amazon Advertising at advertising.amazon.com"
              });
            }
          }

          // Step 7: Campaign sync test (only if profile is valid)
          if (profileValidation.isValid) {
            addDebugStep(`Testing campaign sync for connection ${index + 1}`, "pending");
            
            const { data: syncResult, error: syncError } = await supabase.functions.invoke('amazon-sync', {
              body: { connectionId: connection.id },
              headers
            });

            if (syncError) {
              updateLastStep("error", "Campaign sync test failed", {
                error: syncError.message,
                recommendation: "Check API headers and profile configuration"
              });
            } else if (syncResult?.error) {
              updateLastStep("warning", "Campaign sync completed with issues", {
                syncError: syncResult.error,
                details: syncResult.details,
                recommendation: syncResult.requiresSetup ? "Set up Amazon Advertising" : "Try Enhanced Sync"
              });
            } else {
              updateLastStep("success", "Campaign sync test successful", {
                campaignCount: syncResult?.campaignsSynced || syncResult?.campaignCount || 0
              });
            }
          }

        } catch (error) {
          updateLastStep("error", "Unexpected error during connection tests", { 
            error: error instanceof Error ? error.message : String(error),
            recommendation: "Check network connection and try again"
          });
        }
      }

      // Step 8: Generate comprehensive recommendations
      addDebugStep("Generating diagnostic recommendations", "pending");
      
      const recommendations = [];
      const hasExpiredConnections = connections.some(c => new Date(c.token_expires_at) <= new Date());
      const hasInvalidProfiles = connections.some(c => !validateProfileConfiguration(c.profile_id).isValid);
      const hasNoSyncHistory = connections.some(c => !c.last_sync_at);
      const hasErrorStatus = connections.some(c => c.status === 'error');

      if (hasExpiredConnections) {
        recommendations.push({
          issue: "Expired token connections found",
          action: "Reconnect affected Amazon accounts",
          priority: "high"
        });
      }

      if (hasInvalidProfiles) {
        recommendations.push({
          issue: "Invalid advertising profile configurations",
          action: "Use Enhanced Sync to detect and configure profiles",
          priority: "high"
        });
      }

      if (hasNoSyncHistory) {
        recommendations.push({
          issue: "Connections have never been synced",
          action: "Run initial sync to import campaign data",
          priority: "medium"
        });
      }

      if (hasErrorStatus) {
        recommendations.push({
          issue: "Connections in error state",
          action: "Check connection logs and try Enhanced Sync",
          priority: "medium"
        });
      }

      if (connections.every(c => validateProfileConfiguration(c.profile_id).isValid)) {
        recommendations.push({
          issue: "All connections appear properly configured",
          action: "Regular sync should work normally",
          priority: "low"
        });
      }

      updateLastStep("success", "Diagnostic analysis complete", { 
        totalConnections: connections.length,
        recommendations: recommendations,
        summary: {
          expiredTokens: hasExpiredConnections,
          invalidProfiles: hasInvalidProfiles,
          noSyncHistory: hasNoSyncHistory,
          errorStates: hasErrorStatus
        }
      });

      toast({
        title: "Debug Analysis Complete",
        description: `Analyzed ${connections.length} connection(s). Check detailed results above.`,
      });

    } catch (error) {
      console.error('Debug analysis error:', error);
      addDebugStep("Debug analysis failed", "error", 
        error instanceof Error ? error.message : "Unknown error occurred", 
        error
      );
      
      toast({
        title: "Debug Failed",
        description: "An error occurred during diagnostic analysis.",
        variant: "destructive",
      });
    } finally {
      setIsDebugging(false);
    }
  };

  return {
    debugSteps,
    isDebugging,
    runDebugSync,
    clearDebugSteps,
  };
};
