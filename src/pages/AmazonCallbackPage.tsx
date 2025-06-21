
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const AmazonCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAmazonConnections();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your Amazon connection...');
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('Callback processing started');
        console.log('Code present:', !!code);
        console.log('State present:', !!state);
        console.log('Error present:', !!error);

        if (error) {
          console.error('OAuth error from Amazon:', error, errorDescription);
          setStatus('error');
          setMessage(`Amazon authorization failed: ${error}`);
          setDetails(errorDescription || 'Please try connecting again.');
          setTimeout(() => navigate('/settings'), 5000);
          return;
        }

        if (!code || !state) {
          console.error('Missing required parameters - Code:', !!code, 'State:', !!state);
          setStatus('error');
          setMessage('Missing authorization parameters');
          setDetails('The Amazon authorization response was incomplete. Please try again.');
          setTimeout(() => navigate('/settings'), 5000);
          return;
        }

        console.log('Processing OAuth callback with code and state');
        setMessage('Exchanging authorization code...');

        const result = await handleOAuthCallback(code, state);
        
        if (result) {
          console.log('OAuth callback successful');
          setStatus('success');
          setMessage('Amazon account connected successfully!');
          setDetails(`Connection established with ${result.profileCount} profile(s).`);
          setTimeout(() => navigate('/settings'), 2000);
        } else {
          throw new Error('No result returned from OAuth callback');
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setMessage('Failed to connect Amazon account');
        setDetails(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
        setTimeout(() => navigate('/settings'), 5000);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />;
    }
  };

  const getHeaderColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className={`flex items-center justify-center gap-2 ${getHeaderColor()}`}>
            {getIcon()}
            Amazon Connection
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Setting up your Amazon integration...'}
            {status === 'success' && 'Connection established successfully'}
            {status === 'error' && 'Connection failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <p className={`font-medium ${getHeaderColor()}`}>
              {message}
            </p>
            {details && (
              <p className="text-gray-600 text-sm mt-2">
                {details}
              </p>
            )}
          </div>
          
          <div className="text-gray-500 text-sm">
            {status === 'success' && 'Redirecting to settings...'}
            {status === 'error' && 'Redirecting to settings in a few seconds...'}
            {status === 'processing' && 'Please wait...'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AmazonCallbackPage;
