
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const AmazonCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAmazonConnections();

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      if (code && state) {
        try {
          await handleOAuthCallback(code, state);
          setTimeout(() => navigate('/settings'), 2000);
        } catch (error) {
          console.error('Callback processing error:', error);
          setTimeout(() => navigate('/settings'), 3000);
        }
      } else {
        console.error('Missing code or state parameters');
        setTimeout(() => navigate('/settings'), 3000);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate]);

  const error = searchParams.get('error');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {error ? (
              <AlertCircle className="h-6 w-6 text-red-500" />
            ) : (
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            )}
            Amazon Connection
          </CardTitle>
          <CardDescription>
            {error ? 'Connection failed' : 'Processing your Amazon connection...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error ? (
            <div className="space-y-2">
              <p className="text-red-600">
                Failed to connect your Amazon account: {error}
              </p>
              <p className="text-gray-500 text-sm">
                Redirecting to settings...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-600">
                Please wait while we complete the connection process.
              </p>
              <p className="text-gray-500 text-sm">
                You'll be redirected to settings shortly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AmazonCallbackPage;
