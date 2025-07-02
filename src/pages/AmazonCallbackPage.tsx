
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useToast } from '@/hooks/use-toast';

const AmazonCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAmazonConnections();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Amazon connection...');
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log('=== Amazon Callback Page Loaded ===');
        console.log('Current URL:', window.location.href);
        console.log('Search params:', window.location.search);
        
        // Extract parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('=== URL Parameters ===');
        console.log('Authorization code present:', !!code);
        console.log('State parameter:', state);
        console.log('Error parameter:', error);
        console.log('Error description:', errorDescription);
        
        // Handle OAuth errors
        if (error) {
          console.error('=== OAuth Error from Amazon ===');
          console.error('Error:', error);
          console.error('Description:', errorDescription);
          
          setStatus('error');
          setMessage('Amazon authorization failed');
          setDetails(errorDescription || error);
          
          toast({
            title: "Authorization Failed",
            description: `Amazon returned an error: ${errorDescription || error}`,
            variant: "destructive",
          });
          
          // Redirect to settings after showing error
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        // Validate required parameters
        if (!code) {
          console.error('=== Missing Authorization Code ===');
          setStatus('error');
          setMessage('No authorization code received');
          setDetails('The authorization process was incomplete. Please try connecting again.');
          
          toast({
            title: "Connection Failed",
            description: "No authorization code received from Amazon",
            variant: "destructive",
          });
          
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        if (!state) {
          console.error('=== Missing State Parameter ===');
          setStatus('error');
          setMessage('Security validation failed');
          setDetails('The state parameter is missing. This may indicate a security issue.');
          
          toast({
            title: "Security Error",
            description: "State parameter is missing from the callback",
            variant: "destructive",
          });
          
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        console.log('=== Starting OAuth Callback Processing ===');
        setMessage('Exchanging authorization code for access token...');
        
        // Process the OAuth callback
        const result = await handleOAuthCallback(code, state);
        
        console.log('=== OAuth Callback Completed ===');
        console.log('Result:', result);
        
        setStatus('success');
        setMessage('Amazon account connected successfully!');
        setDetails(result.profileCount > 0 
          ? `Found ${result.profileCount} advertising profile(s)` 
          : 'Connection established - you may need to set up Amazon Advertising profiles'
        );
        
        toast({
          title: "Connection Successful",
          description: result.profileCount > 0 
            ? `Connected to Amazon with ${result.profileCount} advertising profile(s)`
            : "Connected to Amazon - setup your advertising profiles to sync campaigns",
        });
        
        // Redirect to settings page after success
        setTimeout(() => navigate('/settings'), 2000);
        
      } catch (error) {
        console.error('=== Callback Processing Error ===');
        console.error('Error type:', typeof error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Full error:', error);
        
        setStatus('error');
        setMessage('Failed to process Amazon connection');
        setDetails(error instanceof Error ? error.message : 'An unexpected error occurred');
        
        toast({
          title: "Connection Failed",
          description: `Failed to connect to Amazon: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
        
        // Redirect to settings after showing error
        setTimeout(() => navigate('/settings'), 3000);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-xl ${getStatusColor()}`}>
            Amazon Connection
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Please wait while we process your Amazon connection...'}
            {status === 'success' && 'Your Amazon account has been connected successfully!'}
            {status === 'error' && 'There was an issue connecting your Amazon account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">{message}</h3>
            {details && (
              <p className="text-sm text-gray-600">{details}</p>
            )}
          </div>
          
          {status === 'processing' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Please do not close this window</span>
              </div>
            </div>
          )}
          
          {status !== 'processing' && (
            <div className="mt-6 text-xs text-gray-500">
              You will be redirected to your settings page shortly...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AmazonCallbackPage;
