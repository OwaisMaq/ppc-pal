
import React, { useEffect, useState, useRef } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);
  const processingRef = useRef(false);
  const maxRetries = 2;

  useEffect(() => {
    console.log('=== AmazonCallbackPage Component Mounted ===');
    console.log('Component loaded at:', new Date().toISOString());
    console.log('Window location:', window.location.href);
    console.log('Window pathname:', window.location.pathname);
    console.log('Window search:', window.location.search);
    
    // Prevent duplicate processing
    if (processingRef.current) {
      console.log('=== Callback Already Processing ===');
      console.log('Skipping duplicate callback processing');
      return;
    }
    
    processingRef.current = true;
    
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
        console.log('Authorization code length:', code?.length || 0);
        console.log('State parameter:', state);
        console.log('Error parameter:', error);
        console.log('Error description:', errorDescription);
        
        // Handle OAuth errors from Amazon
        if (error) {
          console.error('=== OAuth Error from Amazon ===');
          console.error('Error:', error);
          console.error('Description:', errorDescription);
          
          setStatus('error');
          setMessage('Amazon authorization failed');
          
          let userFriendlyMessage = 'Authorization was denied or failed.';
          switch (error) {
            case 'access_denied':
              userFriendlyMessage = 'You denied access to your Amazon account. Please try again and grant the necessary permissions.';
              break;
            case 'invalid_request':
              userFriendlyMessage = 'There was an issue with the authorization request. Please try connecting again.';
              break;
            case 'unauthorized_client':
              userFriendlyMessage = 'The application is not authorized. Please contact support.';
              break;
            case 'unsupported_response_type':
              userFriendlyMessage = 'Technical error with the authorization process. Please contact support.';
              break;
            case 'invalid_scope':
              userFriendlyMessage = 'Invalid permissions requested. Please contact support.';
              break;
            case 'server_error':
              userFriendlyMessage = 'Amazon encountered a server error. Please try again later.';
              break;
            case 'temporarily_unavailable':
              userFriendlyMessage = 'Amazon services are temporarily unavailable. Please try again later.';
              break;
            default:
              userFriendlyMessage = errorDescription || 'An unknown authorization error occurred.';
          }
          
          setDetails(userFriendlyMessage);
          
          toast({
            title: "Authorization Failed",
            description: userFriendlyMessage,
            variant: "destructive",
          });
          
          // Redirect to settings after showing error
          setTimeout(() => navigate('/settings'), 5000);
          return;
        }

        // Validate required parameters
        if (!code) {
          console.error('=== Missing Authorization Code ===');
          setStatus('error');
          setMessage('No authorization code received');
          setDetails('The authorization process was incomplete. This may happen if you closed the browser window too quickly. Please try connecting again.');
          
          toast({
            title: "Connection Failed",
            description: "No authorization code received from Amazon. Please try again.",
            variant: "destructive",
          });
          
          setTimeout(() => navigate('/settings'), 5000);
          return;
        }

        if (!state) {
          console.error('=== Missing State Parameter ===');
          setStatus('error');
          setMessage('Security validation failed');
          setDetails('The state parameter is missing. This may indicate a security issue or browser problem. Please try connecting again.');
          
          toast({
            title: "Security Error",
            description: "Security validation failed. Please try connecting again.",
            variant: "destructive",
          });
          
          setTimeout(() => navigate('/settings'), 5000);
          return;
        }

        console.log('=== Starting OAuth Callback Processing ===');
        setMessage('Exchanging authorization code for access token...');
        
        // Process the OAuth callback with retry logic
        let result;
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`=== Retry Attempt ${attempt}/${maxRetries} ===`);
              setMessage(`Retrying connection (attempt ${attempt + 1}/${maxRetries + 1})...`);
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
            
            result = await handleOAuthCallback(code, state);
            console.log('=== OAuth Callback Completed Successfully ===');
            console.log('Result:', result);
            break; // Success, exit retry loop
            
          } catch (error) {
            console.error(`=== OAuth Callback Attempt ${attempt + 1} Failed ===`);
            console.error('Error:', error);
            lastError = error;
            
            // If this is not the last attempt, continue to retry
            if (attempt < maxRetries) {
              console.log(`Will retry in ${1000 * (attempt + 1)}ms...`);
              continue;
            }
            
            // If we've exhausted all retries, throw the error
            throw error;
          }
        }
        
        if (!result) {
          throw lastError || new Error('Failed to process callback after all retries');
        }
        
        setStatus('success');
        setMessage('Amazon account connected successfully!');
        
        if (result.profileCount > 0) {
          setDetails(`Found ${result.profileCount} advertising profile(s). You can now sync your campaigns.`);
          toast({
            title: "Connection Successful",
            description: `Connected to Amazon with ${result.profileCount} advertising profile(s)`,
          });
        } else {
          setDetails('Connection established, but no advertising profiles were found. You may need to set up Amazon Advertising at advertising.amazon.com first.');
          toast({
            title: "Connection Successful",
            description: "Connected to Amazon - please set up advertising profiles to sync campaigns",
          });
        }
        
        // Redirect to settings page after success
        setTimeout(() => navigate('/settings'), 3000);
        
      } catch (error) {
        console.error('=== Callback Processing Error ===');
        console.error('Error type:', typeof error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Full error:', error);
        
        setStatus('error');
        setMessage('Failed to process Amazon connection');
        
        // Provide user-friendly error messages
        let userMessage = 'An unexpected error occurred while connecting to Amazon.';
        let shouldRetry = false;
        
        if (error instanceof Error) {
          if (error.message.includes('Authentication failed') || error.message.includes('Invalid user session')) {
            userMessage = 'Your login session has expired. Please log in again and try connecting to Amazon.';
          } else if (error.message.includes('Token exchange failed')) {
            userMessage = 'Failed to exchange authorization code with Amazon. Please try connecting again.';
            shouldRetry = retryCount < maxRetries;
          } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
            userMessage = 'Network connection issue. Please check your internet connection and try again.';
            shouldRetry = retryCount < maxRetries;
          } else if (error.message.includes('Server error') || error.message.includes('500')) {
            userMessage = 'Server error occurred. Please try again in a few moments.';
            shouldRetry = retryCount < maxRetries;
          } else if (error.message.includes('duplicate') || error.message.includes('already')) {
            userMessage = 'This authorization has already been processed. Redirecting to settings...';
            setTimeout(() => navigate('/settings'), 2000);
            return;
          } else {
            userMessage = error.message;
          }
        }
        
        setDetails(userMessage);
        
        toast({
          title: "Connection Failed",
          description: userMessage,
          variant: "destructive",
        });
        
        // Auto-retry for certain errors
        if (shouldRetry) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            console.log('=== Auto-retry triggered ===');
            processingRef.current = false; // Reset processing flag
            window.location.reload(); // Restart the process
          }, 3000);
          return;
        }
        
        // Redirect to settings after showing error
        setTimeout(() => navigate('/settings'), 5000);
      } finally {
        // Reset processing flag when done (success or final failure)
        if (!processingRef.current) return; // Already reset for retry
        processingRef.current = false;
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate, toast, retryCount]);

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
            {status === 'processing' && (
              retryCount > 0 
                ? `Retrying connection (attempt ${retryCount + 1}/${maxRetries + 1})...`
                : 'Please wait while we process your Amazon connection...'
            )}
            {status === 'success' && 'Your Amazon account has been connected successfully!'}
            {status === 'error' && 'There was an issue connecting your Amazon account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">{message}</h3>
            {details && (
              <p className="text-sm text-gray-600 leading-relaxed">{details}</p>
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
          
          {retryCount > 0 && status === 'error' && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-orange-800">
                <span className="text-xs">
                  Retried {retryCount} time{retryCount > 1 ? 's' : ''}
                </span>
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
