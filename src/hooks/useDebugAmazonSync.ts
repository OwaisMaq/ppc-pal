
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

  const runDebugSync = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to run debug sync",
        variant: "destructive",
      });
      return;
    }

    setIsDebugging(true);
    setDebugSteps([]);

    try {
      // Step 1: Check user authentication
      addDebugStep("Verifying user authentication", "pending");
      if (user) {
        updateLastStep("success", `Authenticated as: ${user.email}`, { userId: user.id });
      } else {
        updateLastStep("error", "No authenticated user found");
        return;
      }

      // Step 2: Verify session and auth headers
      addDebugStep("Checking session and auth headers", "pending");
      try {
        const headers = await getAuthHeaders();
        updateLastStep("success", "Session and auth headers validated", { 
          hasAuthHeader: !!headers.Authorization,
          tokenLength: headers.Authorization.length 
        });
      } catch (headerError) {
        updateLastStep("error", "Failed to get auth headers", { error: headerError.message });
        return;
      }

      // Step 3: Fetch Amazon connections
      addDebugStep("Fetching Amazon connections", "pending");
      const { data: connections, error: connectionsError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('user_id', user.id);

      if (connectionsError) {
        updateLastStep("error", "Failed to fetch connections", connectionsError);
        return;
      }

      if (!connections || connections.length === 0) {
        updateLastStep("warning", "No Amazon connections found", { connectionsCount: 0 });
        addDebugStep("Recommendation", "warning", "Connect your Amazon account first", {
          action: "Go to Settings > Amazon Account Setup"
        });
        return;
      }

      updateLastStep("success", `Found ${connections.length} connection(s)`, { 
        connections: connections.map(c => ({
          id: c.id,
          profile_id: c.profile_id,
          profile_name: c.profile_name,
          status: c.status,
          marketplace_id: c.marketplace_id
        }))
      });

      // Step 4: Analyze each connection
      for (const connection of connections) {
        addDebugStep(`Analyzing connection: ${connection.profile_name}`, "pending");
        
        // Check token expiry
        const tokenExpiry = new Date(connection.token_expires_at);
        const now = new Date();
        const isTokenExpired = tokenExpiry <= now;
        
        if (isTokenExpired) {
          updateLastStep("error", "Access token has expired", {
            tokenExpiry: tokenExpiry.toISOString(),
            currentTime: now.toISOString()
          });
          continue;
        } else {
          updateLastStep("success", "Token is valid", {
            expiresIn: Math.round((tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60)),
            unit: "hours"
          });
        }

        // Step 5: Test Amazon API connectivity with proper headers
        addDebugStep(`Testing Amazon API connectivity`, "pending");
        
        try {
          const headers = await getAuthHeaders();
          
          const { data: testResult, error: testError } = await supabase.functions.invoke('amazon-test-connection', {
            body: { connectionId: connection.id },
            headers
          });

          if (testError) {
            updateLastStep("error", "API test failed", testError);
            continue;
          }

          if (testResult?.error) {
            updateLastStep("error", "API connectivity issue", testResult);
            continue;
          }

          updateLastStep("success", "API connectivity confirmed", testResult);

          // Step 6: Attempt Enhanced Profile Detection with proper headers
          addDebugStep(`Running enhanced profile detection`, "pending");
          
          const { data: forceSyncResult, error: forceSyncError } = await supabase.functions.invoke('amazon-enhanced-profile-detection', {
            body: { connectionId: connection.id },
            headers
          });

          if (forceSyncError) {
            updateLastStep("error", "Enhanced profile detection failed", forceSyncError);
            continue;
          }

          if (forceSyncResult?.error) {
            updateLastStep("warning", "Enhanced profile detection completed with issues", forceSyncResult);
          } else {
            updateLastStep("success", "Enhanced profile detection completed successfully", forceSyncResult);
          }

          // Step 7: Attempt regular sync if profiles were found
          if (forceSyncResult?.success && forceSyncResult?.profiles?.length > 0) {
            addDebugStep(`Testing regular campaign sync`, "pending");
            
            const { data: syncResult, error: syncError } = await supabase.functions.invoke('amazon-sync', {
              body: { connectionId: connection.id },
              headers
            });

            if (syncError) {
              updateLastStep("error", "Regular sync failed", syncError);
            } else if (syncResult?.error) {
              updateLastStep("warning", "Sync completed with warnings", syncResult);
            } else {
              updateLastStep("success", "Regular sync successful", syncResult);
            }
          }

        } catch (error) {
          updateLastStep("error", "Unexpected error during API tests", { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      // Final recommendations
      addDebugStep("Generating recommendations", "pending");
      const recommendations = [];
      
      const hasExpiredConnections = connections.some(c => new Date(c.token_expires_at) <= new Date());
      const hasNoProfiles = connections.some(c => c.profile_id === 'setup_required_no_profiles_found');
      const hasActiveCampaigns = connections.some(c => c.status === 'active');

      if (hasExpiredConnections) {
        recommendations.push("Reconnect expired Amazon accounts");
      }
      if (hasNoProfiles) {
        recommendations.push("Set up Amazon Advertising at advertising.amazon.com");
      }
      if (!hasActiveCampaigns) {
        recommendations.push("Use Enhanced Sync to attempt profile detection");
        recommendations.push("Verify your Amazon Advertising account has active campaigns");
      }

      updateLastStep("success", "Debug analysis complete", { recommendations });

      toast({
        title: "Debug Analysis Complete",
        description: `Analyzed ${connections.length} connection(s). Check results above.`,
      });

    } catch (error) {
      console.error('Debug sync error:', error);
      addDebugStep("Debug process failed", "error", 
        error instanceof Error ? error.message : "Unknown error occurred", 
        error
      );
      
      toast({
        title: "Debug Failed",
        description: "An error occurred during debug analysis. Check the results for details.",
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
