import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AmazonCallback = () => {
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAmazonConnections();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Amazon connection...');

  useEffect(() => {
    let processed = false;
    
    const processCallback = async () => {
      if (processed) return;
      processed = true;
      
      // Give auth context time to restore session after redirect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Amazon authorization failed: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization parameters');
        return;
      }

      try {
        console.log('Processing Amazon OAuth callback:', { code: code.substring(0, 10) + '...', state });
        const result = await handleOAuthCallback(code, state);
        console.log('OAuth callback result:', result);
        
        if (result?.requiresSetup) {
          setStatus('error');
          setMessage(result.details || 'Amazon Advertising account setup required. Please ensure you have an active Amazon Advertising account with API access.');
          return;
        }
        
        if (result?.success) {
          setStatus('success');
          const profileCount = result?.profileCount || 0;
          setMessage(`Amazon account connected successfully! Found ${profileCount} advertising profile(s). Redirecting to dashboard...`);
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          console.log('OAuth callback returned falsy result:', result);
          setStatus('error');
          setMessage('Failed to connect Amazon account');
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        console.error('Error details:', error);
        setStatus('error');
        setMessage(`Connection error: ${error.message || 'Unknown error'}`);
      }
    };

    processCallback();
  }, []); // Empty dependency array to run only once

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getIcon()}
            <span className={getColor()}>
              {status === 'loading' && 'Connecting...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Connection Failed'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{message}</p>
          
          {status === 'error' && (
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline"
              className="w-full"
            >
              Return to Dashboard
            </Button>
          )}
          
          {status === 'success' && (
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AmazonCallback;