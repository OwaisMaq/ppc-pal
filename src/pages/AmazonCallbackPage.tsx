
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
  const mountedRef = useRef(true);
  const maxRetries = 2;

  useEffect(() => {
    // Component mount protection
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    console.log('=== AmazonCallbackPage Component Mounted ===');
    console.log('Component loaded at:', new Date().toISOString());
    console.log('Window location:', window.location.href);
    
    // Prevent duplicate processing
    if (processingRef.current) {
      console.log('=== Callback Already Processing ===');
      return;
    }
    
    processingRef.current = true;
    
    const processCallback = async () => {
      try {
        if (!mountedRef.current) {
          console.log('Component unmounted, aborting callback processing');
          return;
        }

        console.log('=== Amazon Callback Page Processing Started ===');
        console.log('Current URL:', window.location.href);
        
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
          setDetails('The authorization process was incomplete. Please try connecting again.');
          
          toast({
            title: "Connection Failed",
            description: "No authorization code received from Amazon. Please try again.",
            variant: "destructive",
          });
          
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
          setDetails('The state parameter is missing. Please try connecting again.');
          
          toast({
            title: "Security Error",
            description: "Security validation failed. Please try connecting again.",
            variant: "destructive",
          });
          
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
        
        // Redirect to settings page after success
        setTimeout(() => {
          if (mountedRef.current) navigate('/settings');
        }, 3000);
        
      } catch (error) {
        console.error('=== Callback Processing Error ===');
        console.error('Error details:', error);
        
        if (!mountedRef.current) return;
        
        setStatus('error');
        setMessage('Failed to process Amazon connection');
        
        // Enhanced error handling
        let userMessage = 'An unexpected error occurred while connecting to Amazon.';
        let shouldRetry = false;
        
        if (error instanceof Error) {
          if (error.message.includes('Server configuration error') || 
              error.message.includes('missing Amazon credentials')) {
            userMessage = 'Server configuration issue. Please contact support.';
          } else if (error.message.includes('Authorization code has expired') || 
                     error.message.includes('invalid_grant')) {
            userMessage = 'Authorization code has expired. Please try connecting again.';
          } else if (error.message.includes('Invalid client configuration')) {
            userMessage = 'Application configuration error. Please contact support.';
          } else if (error.message.includes('Authentication failed') || 
                     error.message.includes('Invalid user session')) {
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
          } else if (error.message.includes('Invalid state parameter') || 
                     error.message.includes('State parameter could not be decoded')) {
            userMessage = 'Security validation failed. Please try connecting again from the settings page.';
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
        if (shouldRetry && mountedRef.current) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            console.log('=== Auto-retry triggered ===');
            if (mountedRef.current) {
              processingRef.current = false;
              window.location.reload();
            }
          }, 3000);
          return;
        }
        
        // Redirect to settings after showing error
        setTimeout(() => {
          if (mountedRef.current) navigate('/settings');
        }, 5000);
      } finally {
        if (mountedRef.current) {
          processingRef.current = false;
        }
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
