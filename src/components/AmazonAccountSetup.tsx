import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ConnectionSummaryTable from '@/components/performance/ConnectionSummaryTable';

const AmazonAccountSetup = () => {
  const { 
    connections, 
    loading, 
    error, 
    initiateConnection, 
    syncConnection, 
    deleteConnection,
    refreshConnections 
  } = useAmazonConnections();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      console.log('=== Amazon Connect Button Clicked ===');
      console.log('Starting Amazon connection process...');
      
      // Use the deployed URL for the redirect
      const redirectUri = 'https://ppcpal.online/amazon-callback';
      console.log('Using redirect URI:', redirectUri);
      
      console.log('About to call supabase.functions.invoke with amazon-oauth-init...');
      const { data, error } = await supabase.functions.invoke('amazon-oauth-init', {
        body: { redirectUri }
      });

      console.log('=== OAuth Init Response ===');
      console.log('Data:', data);
      console.log('Error:', error);
      console.log('Data type:', typeof data);
      console.log('Data keys:', data ? Object.keys(data) : 'no data');

      if (error) {
        console.error('=== OAuth Init Error Details ===');
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Full error object:', error);
        throw error;
      }

      if (data?.authUrl) {
        console.log('=== Auth URL Found ===');
        console.log('Auth URL:', data.authUrl);
        console.log('Auth URL type:', typeof data.authUrl);
        console.log('Auth URL length:', data.authUrl.length);
        
        // Add a small delay to ensure logs are captured
        setTimeout(() => {
          console.log('=== Redirecting to Amazon OAuth URL ===');
          console.log('Final redirect URL:', data.authUrl);
          // Force a full page redirect to Amazon
          window.location.href = data.authUrl;
        }, 100);
      } else {
        console.error('=== No Auth URL Received ===');
        console.error('Data received:', data);
        console.error('Data structure:', JSON.stringify(data, null, 2));
        throw new Error('No authorization URL received from server');
      }
    } catch (err) {
      console.error('=== Connect Error ===');
      console.error('Error type:', typeof err);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Full error:', err);
      toast({
        title: "Connection Failed",
        description: `Failed to initiate Amazon connection: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleForceSync = async (connectionId: string) => {
    try {
      console.log('Force syncing connection:', connectionId);
      
      toast({
        title: "Force Sync Started",
        description: "Attempting to fetch campaigns even without detected profiles. This may take a few moments...",
      });
      
      const { data, error } = await supabase.functions.invoke('amazon-force-sync', {
        body: { connectionId }
      });

      if (error) throw error;

      toast({
        title: "Force Sync Complete",
        description: data?.message || `Successfully synced ${data?.campaignCount || 0} campaigns from Amazon.`,
      });

      await refreshConnections();
    } catch (err) {
      console.error('Error force syncing connection:', err);
      toast({
        title: "Force Sync Failed",
        description: "Failed to force sync campaign data. Please check your Amazon account setup and try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            Amazon Advertising Setup
          </CardTitle>
          <CardDescription>Loading your Amazon connections...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/320px-Amazon_logo.svg.png" 
              alt="Amazon" 
              className="h-5 w-auto"
            />
            Amazon Advertising Setup
          </CardTitle>
          <CardDescription>
            Connect your Amazon Advertising account to sync campaigns and optimize performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Connection Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {connections.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Amazon Accounts Connected
                </h3>
                <p className="text-gray-600 mb-6">
                  Connect your Amazon Advertising account to start optimizing your campaigns
                </p>
              </div>
              
              <Button onClick={handleConnect} className="mb-4">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Amazon Account
              </Button>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <h4 className="font-medium text-blue-800 mb-2">Before you connect:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Make sure you have an active Amazon Advertising account</li>
                  <li>• Ensure you have campaigns with recent activity</li>
                  <li>• You'll be redirected to Amazon to authorize access</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Amazon Account Connected</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleConnect}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Add Another Account
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {connections.length > 0 && (
        <ConnectionSummaryTable 
          connections={connections}
          onSync={syncConnection}
          onDelete={deleteConnection}
          onForceSync={handleForceSync}
        />
      )}
    </div>
  );
};

export default AmazonAccountSetup;
