
import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
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
        setStatus('error');
        toast({
          title: "Connection Failed",
          description: "Invalid callback parameters received.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      try {
        console.log('Processing Amazon OAuth callback...');
        const result = await handleOAuthCallback(code, state);
        
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
        
        setTimeout(() => navigate('/settings'), 3000);
      } catch (err) {
        console.error('Error processing callback:', err);
        setStatus('error');
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
        return 'There was an issue connecting your Amazon account. Please try again.';
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
