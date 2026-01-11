import { useState } from 'react';
import { Play, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalFilters } from '@/context/GlobalFiltersContext';
import { useAuth } from '@/hooks/useAuth';
import { useTestResults } from '@/hooks/useTestResults';

interface EdgeFunction {
  name: string;
  description: string;
  method: 'GET' | 'POST';
  requiresProfile: boolean;
  testPayload?: Record<string, unknown>;
}

const edgeFunctions: EdgeFunction[] = [
  { name: 'dashboard', description: 'Fetch dashboard KPIs', method: 'POST', requiresProfile: true },
  { name: 'sync-amazon-data', description: 'Trigger data sync', method: 'POST', requiresProfile: true },
  { name: 'refresh-amazon-token', description: 'Refresh OAuth token', method: 'POST', requiresProfile: true },
  { name: 'rules-engine-runner', description: 'Execute automation rules', method: 'POST', requiresProfile: true },
  { name: 'actions-worker', description: 'Process queued actions', method: 'POST', requiresProfile: false },
  { name: 'ai-insights', description: 'Generate AI insights', method: 'POST', requiresProfile: true },
  { name: 'anomalies-runner', description: 'Detect anomalies', method: 'POST', requiresProfile: true },
  { name: 'budget-forecast', description: 'Generate budget forecasts', method: 'POST', requiresProfile: true },
  { name: 'rollups', description: 'Calculate rollup metrics', method: 'POST', requiresProfile: true },
  { name: 'amazon-diagnostics', description: 'Check Amazon API health', method: 'POST', requiresProfile: true },
  { name: 'check-subscription', description: 'Verify subscription status', method: 'POST', requiresProfile: false },
  { name: 'user-count', description: 'Get user count', method: 'GET', requiresProfile: false },
];

interface TestResult {
  function: string;
  status: 'success' | 'error' | 'pending';
  duration: number;
  response: unknown;
  error?: string;
}

export function EdgeFunctionTester() {
  const { selectedProfileId: selectedProfile } = useGlobalFilters();
  const { saveResult } = useTestResults('edge_function');
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [batchTesting, setBatchTesting] = useState(false);

  const runTest = async (funcName: string): Promise<TestResult> => {
    const func = edgeFunctions.find(f => f.name === funcName);
    if (!func) {
      return { function: funcName, status: 'error', duration: 0, response: null, error: 'Function not found' };
    }

    const startTime = Date.now();
    
    try {
      let payload: Record<string, unknown> = {};
      
      if (func.requiresProfile && selectedProfile) {
        payload.profileId = selectedProfile;
      }
      
      if (func.testPayload) {
        payload = { ...payload, ...func.testPayload };
      }

      const { data, error } = await supabase.functions.invoke(funcName, {
        body: func.method === 'POST' ? payload : undefined,
      });

      const duration = Date.now() - startTime;
      
      if (error) {
        return { function: funcName, status: 'error', duration, response: null, error: error.message };
      }

      return { function: funcName, status: 'success', duration, response: data };
    } catch (err) {
      const duration = Date.now() - startTime;
      return { 
        function: funcName, 
        status: 'error', 
        duration, 
        response: null, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  };

  const handleRunTest = async () => {
    if (!selectedFunction) return;
    
    setTesting(true);
    const result = await runTest(selectedFunction);
    setResults(prev => [result, ...prev.filter(r => r.function !== selectedFunction)]);
    
    // Save to database
    await saveResult({
      test_name: selectedFunction,
      status: result.status === 'success' ? 'pass' : 'fail',
      details: { duration: result.duration, response: result.response, error: result.error },
    });
    
    setTesting(false);
  };

  const handleBatchTest = async () => {
    setBatchTesting(true);
    const newResults: TestResult[] = [];
    
    for (const func of edgeFunctions) {
      if (func.requiresProfile && !selectedProfile) continue;
      
      const result = await runTest(func.name);
      newResults.push(result);
      setResults([...newResults]);
      
      // Save each result
      await saveResult({
        test_name: func.name,
        status: result.status === 'success' ? 'pass' : 'fail',
        details: { duration: result.duration, response: result.response, error: result.error },
      });
    }
    
    setBatchTesting(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edge Function Tester</CardTitle>
        <CardDescription>
          Test edge functions and view responses
          {!selectedProfile && (
            <span className="block text-warning mt-1">
              Select a profile to test profile-dependent functions
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedFunction} onValueChange={setSelectedFunction}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a function to test" />
            </SelectTrigger>
            <SelectContent>
              {edgeFunctions.map(func => (
                <SelectItem 
                  key={func.name} 
                  value={func.name}
                  disabled={func.requiresProfile && !selectedProfile}
                >
                  <div className="flex items-center gap-2">
                    <span>{func.name}</span>
                    <span className="text-xs text-muted-foreground">- {func.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRunTest} disabled={!selectedFunction || testing}>
            {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="ml-2">Run</span>
          </Button>
        </div>

        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleBatchTest}
          disabled={batchTesting}
        >
          {batchTesting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Testing all functions...
            </>
          ) : (
            'Run All Tests'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Results</h4>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <div key={`${result.function}-${idx}`} className="border rounded-lg p-3 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-mono text-sm">{result.function}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {result.duration}ms
                        </span>
                      </div>
                    </div>
                    {result.error && (
                      <div className="text-sm text-destructive bg-destructive/10 p-2 rounded mt-2">
                        {result.error}
                      </div>
                    )}
                    {result.response && (
                      <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto font-mono">
                        {JSON.stringify(result.response, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
