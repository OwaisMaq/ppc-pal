
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const AmazonCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAmazonConnections();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [profileCount, setProfileCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasProcessed = useRef(false);
  const isProcessing = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      // Prevent multiple processing attempts
      if (hasProcessed.current || isProcessing.current) {
        console.log('OAuth callback already processed or in progress, skipping');
        return;
      }

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      console.log('Processing Amazon OAuth callback:', { 
        hasCode: !!code, 
        hasState: !!state, 
        error,
        hasProcessed: hasProcessed.current,
        isProcessing: isProcessing.current
      });

      if (error) {
        console.error('OAuth error:', error);
        hasProcessed.current = true;
        setStatus('error');
        setErrorMessage('Amazon authorization was cancelled or failed.');
        toast({
          title: "Connection Failed",
          description: "Amazon authorization was cancelled or failed.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state parameters');
        hasProcessed.current = true;
        setStatus('error');
        setErrorMessage('Invalid callback parameters received.');
        toast({
          title: "Connection Failed",
          description: "Invalid callback parameters received.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      // Mark as processing to prevent race conditions
      isProcessing.current = true;

      try {
        console.log('Processing Amazon OAuth callback with state management...');
        const result = await handleOAuthCallback(code, state);
        
        // Mark as successfully processed
        hasProcessed.current = true;
        isProcessing.current = false;
        
        console.log('OAuth callback result:', result);
        setProfileCount(result.profileCount);
        setStatus('success');
        
        if (result.profileCount === 0) {
          toast({
            title: "Connection Successful",
            description: "Amazon account connected, but no advertising profiles found. You may need to set up Amazon Advertising first.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Connection Successful",
            description: `Amazon account connected with ${result.profileCount} advertising profile(s).`,
          });
        }
        
        // Wait before redirecting to ensure data is synced
        setTimeout(() => {
          console.log('Redirecting to settings page...');
          navigate('/settings');
        }, 2000);
        
      } catch (err) {
        console.error('Error processing callback:', err);
        hasProcessed.current = true;
        isProcessing.current = false;
        setStatus('error');
        
        const errorMsg = err instanceof Error ? err.message : 'Failed to complete Amazon connection';
        setErrorMessage(errorMsg);
        
        toast({
          title: "Connection Failed",
          description: "Failed to complete Amazon connection. Please try again.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/settings'), 3000);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'Processing Amazon connection...';
      case 'success':
        return profileCount === 0 
          ? 'Connected, but no advertising profiles found'
          : `Successfully connected with ${profileCount} profile(s)`;
      case 'error':
        return 'Connection failed';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'processing':
        return 'Please wait while we complete your Amazon Ads connection.';
      case 'success':
        return profileCount === 0 
          ? 'You may need to set up Amazon Advertising at advertising.amazon.com first.'
          : 'You can now sync your campaigns and start optimizing your ads.';
      case 'error':
        return errorMessage || 'There was an issue connecting your Amazon account. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-xl">
            {getStatusMessage()}
          </CardTitle>
          <CardDescription>
            {getStatusDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-600">
            Redirecting to settings in a few seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AmazonCallbackPage;
