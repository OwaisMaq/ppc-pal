import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AmazonCallback = () => {
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAmazonConnections();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Amazon connection...');
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

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
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Processing Amazon OAuth callback:`, { 
          code: code.substring(0, 10) + '...', 
          state,
          timestamp 
        });
        const result = await handleOAuthCallback(code, state);
        console.log(`[${timestamp}] OAuth callback result:`, JSON.stringify(result, null, 2));
        
        if (result?.requiresSetup) {
          setStatus('error');
          
          // Provide specific guidance based on diagnostics if available
          let detailedMessage = result.details || 'Amazon Advertising account setup required.';
          
          const diagnostics = (result as any).diagnostics;
          if (diagnostics?.issueType === 'infrastructure_dns') {
            detailedMessage = 'Network connectivity issues preventing connection to Amazon\'s advertising servers. This appears to be a temporary infrastructure problem.';
          } else if (diagnostics?.issueType === 'no_advertising_account') {
            detailedMessage = 'Successfully connected to Amazon\'s servers, but no advertising profiles were found. This usually means you don\'t have an active Amazon Advertising account.';
          } else if (diagnostics?.issueType === 'partial_connectivity') {
            detailedMessage = 'Some Amazon advertising regions are temporarily unavailable, but we successfully connected to others. However, no advertising profiles were found.';
          }
          
          setMessage(detailedMessage);
          
          // Store diagnostic info for display
          if (diagnostics) {
            setDiagnosticInfo(diagnostics);
          }
          
          return;
        }
        
        if (result?.success) {
          setStatus('success');
          const profileCount = result?.profileCount || 0;
          const syncStarted = result?.syncStarted || false;
          
          if (syncStarted) {
            setMessage(`Amazon account connected! Found ${profileCount} profile(s) and started syncing your advertising data. You can view the data in your dashboard as it loads.`);
          } else {
            setMessage(`Amazon account connected successfully! Found ${profileCount} advertising profile(s). Redirecting to dashboard...`);
          }
          
          // Redirect to dashboard after 3 seconds to give users time to read the message
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else {
          console.log('OAuth callback returned falsy result:', JSON.stringify(result, null, 2));
          setStatus('error');
          setMessage('Failed to connect Amazon account');
        }
      } catch (error) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Callback processing error:`, error);
        console.error(`[${timestamp}] Full error details:`, JSON.stringify({
          message: error.message,
          stack: error.stack,
          name: error.name,
          cause: error.cause,
          timestamp
        }, null, 2));
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
          
          {/* Show diagnostic information for setup issues */}
          {status === 'error' && diagnosticInfo && (
            <Alert className="text-left">
              <Wifi className="h-4 w-4" />
              <AlertDescription>
                <strong>Connection Diagnostics:</strong>
                <br />
                {diagnosticInfo.successfulEndpoints > 0 ? (
                  <>Successfully connected to {diagnosticInfo.successfulEndpoints} of {diagnosticInfo.totalEndpoints} Amazon regions.</>
                ) : (
                  <>Unable to connect to any Amazon advertising regions.</>
                )}
                {diagnosticInfo.dnsFailureCount > 0 && (
                  <>
                    <br />
                    <strong>Network Issues:</strong> {diagnosticInfo.dnsFailureCount} region(s) have DNS connectivity problems.
                  </>
                )}
                <br />
                <strong>Recommendation:</strong> {diagnosticInfo.recommendation || 'Check your Amazon Advertising account setup and try again.'}
                {diagnosticInfo.userAction && (
                  <>
                    <br />
                    <strong>Next Steps:</strong> {diagnosticInfo.userAction}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          
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