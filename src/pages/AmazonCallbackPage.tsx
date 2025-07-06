
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const AmazonCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { handleOAuthCallback } = useAmazonConnections();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Amazon connection...');
  const [details, setDetails] = useState<string>('');
  const [errorType, setErrorType] = useState<string>('');
  const [userAction, setUserAction] = useState<string>('');
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  const processedRef = useRef(false);

  useEffect(() => {
    // Component mount protection
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Clean up URL parameters to prevent reprocessing
  const cleanupUrl = () => {
    console.log('=== Cleaning up URL parameters ===');
    const newSearchParams = new URLSearchParams();
    setSearchParams(newSearchParams, { replace: true });
  };

  const handleRetry = () => {
    console.log('=== Manual Retry Initiated ===');
    setStatus('processing');
    setMessage('Retrying Amazon connection...');
    setDetails('');
    setErrorType('');
    setUserAction('');
    processingRef.current = false;
    processedRef.current = false;
    
    // Re-trigger processing
    processCallback();
  };

  const processCallback = async () => {
    // Prevent duplicate processing
    if (processingRef.current || processedRef.current) {
      console.log('=== Callback Already Processing or Processed ===');
      return;
    }
    
    processingRef.current = true;
    
    try {
      if (!mountedRef.current) {
        console.log('Component unmounted, aborting callback processing');
        return;
      }

      console.log('=== Amazon Callback Page Processing Started ===');
      console.log('Current URL:', window.location.href);
      console.log('Component instance:', Date.now());
      
      // Extract parameters from URL
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.log('=== URL Parameters ===');
      console.log('Authorization code present:', !!code);
      console.log('State parameter present:', !!state);
      console.log('Error parameter:', error);
      console.log('Error description:', errorDescription);
      
      // Handle OAuth errors from Amazon
      if (error) {
        console.error('=== OAuth Error from Amazon ===');
        console.error('Error:', error);
        console.error('Description:', errorDescription);
        
        if (!mountedRef.current) return;
        
        setStatus('error');
        setMessage('Amazon authorization failed');
        setErrorType('oauth_error');
        
        let userFriendlyMessage = 'Authorization was denied or failed.';
        let actionMessage = 'Please try connecting again from the settings page.';
        
        switch (error) {
          case 'access_denied':
            userFriendlyMessage = 'You denied access to your Amazon account.';
            actionMessage = 'Please try again and grant the necessary permissions.';
            break;
          case 'invalid_request':
            userFriendlyMessage = 'There was an issue with the authorization request.';
            actionMessage = 'Please try connecting again from the settings page.';
            break;
          case 'unauthorized_client':
            userFriendlyMessage = 'The application is not authorized.';
            actionMessage = 'Please contact support.';
            break;
          case 'server_error':
            userFriendlyMessage = 'Amazon encountered a server error.';
            actionMessage = 'Please try again later.';
            break;
          case 'temporarily_unavailable':
            userFriendlyMessage = 'Amazon services are temporarily unavailable.';
            actionMessage = 'Please try again later.';
            break;
          default:
            userFriendlyMessage = errorDescription || 'An unknown authorization error occurred.';
        }
        
        setDetails(userFriendlyMessage);
        setUserAction(actionMessage);
        
        toast({
          title: "Authorization Failed",
          description: userFriendlyMessage,
          variant: "destructive",
        });
        
        // Clean up URL and mark as processed
        cleanupUrl();
        processedRef.current = true;
        
        setTimeout(() => {
          if (mountedRef.current) navigate('/settings');
        }, 5000);
        return;
      }

      // Validate required parameters
      if (!code) {
        console.error('=== Missing Authorization Code ===');
        
        if (!mountedRef.current) return;
        
        setStatus('error');
        setMessage('No authorization code received');
        setDetails('The authorization process was incomplete.');
        setErrorType('missing_code');
        setUserAction('Please try connecting again from the settings page.');
        
        toast({
          title: "Connection Failed",
          description: "No authorization code received from Amazon. Please try again.",
          variant: "destructive",
        });
        
        cleanupUrl();
        processedRef.current = true;
        
        setTimeout(() => {
          if (mountedRef.current) navigate('/settings');
        }, 5000);
        return;
      }

      if (!state) {
        console.error('=== Missing State Parameter ===');
        
        if (!mountedRef.current) return;
        
        setStatus('error');
        setMessage('Security validation failed');
        setDetails('The state parameter is missing.');
        setErrorType('missing_state');
        setUserAction('Please try connecting again from the settings page.');
        
        toast({
          title: "Security Error",
          description: "Security validation failed. Please try connecting again.",
          variant: "destructive",
        });
        
        cleanupUrl();
        processedRef.current = true;
        
        setTimeout(() => {
          if (mountedRef.current) navigate('/settings');
        }, 5000);
        return;
      }

      console.log('=== Starting OAuth Callback Processing ===');
      
      if (!mountedRef.current) return;
      setMessage('Exchanging authorization code for access token...');
      
      // Process the OAuth callback
      const result = await handleOAuthCallback(code, state);
      console.log('=== OAuth Callback Completed Successfully ===');
      console.log('Result:', result);
      
      if (!mountedRef.current) return;
      
      setStatus('success');
      setMessage('Amazon account connected successfully!');
      
      if (result.profileCount > 0) {
        setDetails(`Found ${result.profileCount} advertising profile(s). You can now sync your campaigns.`);
        toast({
          title: "Connection Successful",
          description: `Connected to Amazon with ${result.profileCount} advertising profile(s)`,
        });
      } else {
        setDetails('Connection established, but no advertising profiles were found. You may need to set up Amazon Advertising first.');
        toast({
          title: "Connection Successful",
          description: "Connected to Amazon - please set up advertising profiles to sync campaigns",
        });
      }
      
      // Clean up URL and mark as processed
      cleanupUrl();
      processedRef.current = true;
      
      // Redirect to settings page after success
      setTimeout(() => {
        if (mountedRef.current) navigate('/settings');
      }, 3000);
      
    } catch (error: any) {
      console.error('=== Callback Processing Error ===');
      console.error('Error details:', error);
      
      if (!mountedRef.current) return;
      
      setStatus('error');
      setMessage('Failed to process Amazon connection');
      
      // Enhanced error handling with server response structure
      let userMessage = 'An unexpected error occurred while connecting to Amazon.';
      let actionMessage = 'Please try connecting again.';
      let errorTypeValue = 'unknown_error';
      
      if (error && typeof error === 'object') {
        // Handle structured error responses from server
        if (error.errorType) {
          errorTypeValue = error.errorType;
          userMessage = error.error || error.message || userMessage;
          actionMessage = error.userAction || actionMessage;
        } else if (error.message) {
          userMessage = error.message;
          
          // Categorize common error types
          if (error.message.includes('Authorization code has expired') || 
              error.message.includes('invalid_grant')) {
            errorTypeValue = 'code_expired';
            actionMessage = 'The authorization code has expired. Please try connecting again.';
          } else if (error.message.includes('Server configuration error') || 
                     error.message.includes('missing Amazon credentials')) {
            errorTypeValue = 'server_config';
            actionMessage = 'Server configuration issue. Please contact support.';
          } else if (error.message.includes('Authentication failed') || 
                     error.message.includes('Invalid user session')) {
            errorTypeValue = 'auth_failed';
            actionMessage = 'Your login session has expired. Please log in again and try connecting to Amazon.';
          } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
            errorTypeValue = 'network_error';
            actionMessage = 'Network connection issue. Please check your internet connection and try again.';
          } else if (error.message.includes('Invalid state parameter') || 
                     error.message.includes('State parameter could not be decoded')) {
            errorTypeValue = 'invalid_state';
            actionMessage = 'Security validation failed. Please try connecting again from the settings page.';
          }
        }
      }
      
      setDetails(userMessage);
      setErrorType(errorTypeValue);
      setUserAction(actionMessage);
      
      toast({
        title: "Connection Failed",
        description: userMessage,
        variant: "destructive",
      });
      
      // Clean up URL and mark as processed for most errors
      if (!['network_error', 'server_config'].includes(errorTypeValue)) {
        cleanupUrl();
        processedRef.current = true;
        
        // Redirect to settings after showing error
        setTimeout(() => {
          if (mountedRef.current) navigate('/settings');
        }, 8000);
      }
      
    } finally {
      if (mountedRef.current) {
        processingRef.current = false;
      }
    }
  };

  useEffect(() => {
    // Only process if we have parameters and haven't processed yet
    const hasParams = searchParams.has('code') || searchParams.has('error');
    if (hasParams && !processedRef.current) {
      console.log('=== Triggering Callback Processing ===');
      processCallback();
    } else if (!hasParams && !processedRef.current) {
      // No parameters - probably accessed directly
      console.log('=== No Callback Parameters Found ===');
      setStatus('error');
      setMessage('Invalid callback URL');
      setDetails('This page should only be accessed through the Amazon OAuth flow.');
      setUserAction('Please start the connection process from the settings page.');
      setErrorType('invalid_access');
      
      setTimeout(() => {
        if (mountedRef.current) navigate('/settings');
      }, 3000);
    }
  }, [searchParams]);

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

  const canRetry = status === 'error' && ['network_error', 'server_config', 'code_expired'].includes(errorType);

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
              <p className="text-sm text-gray-600 leading-relaxed mb-2">{details}</p>
            )}
            {userAction && (
              <p className="text-sm text-blue-600 leading-relaxed">{userAction}</p>
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
          
          {status === 'error' && errorType && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-orange-800">
                <span className="text-xs font-medium">Error Type: </span>
                <span className="text-xs">{errorType.replace(/_/g, ' ')}</span>
              </div>
            </div>
          )}
          
          {canRetry && (
            <div className="mt-4">
              <Button 
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
          
          {status !== 'processing' && !canRetry && (
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
