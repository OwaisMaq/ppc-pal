import { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTestResults } from '@/hooks/useTestResults';

interface DataCheck {
  id: string;
  name: string;
  description: string;
  check: () => Promise<{ status: 'pass' | 'fail' | 'warn'; message: string; details?: unknown }>;
}

export function DataValidator() {
  const { saveResult } = useTestResults('data_check');
  const [results, setResults] = useState<Record<string, { status: string; message: string; details?: unknown }>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const dataChecks: DataCheck[] = [
    {
      id: 'connections_valid',
      name: 'Amazon Connections',
      description: 'All connections have valid (non-expired) tokens',
      check: async () => {
        const { data, error } = await supabase
          .from('amazon_connections')
          .select('id, profile_name, token_expires_at, status')
          .eq('status', 'active');
        
        if (error) return { status: 'fail', message: error.message };
        
        const expired = data?.filter(c => new Date(c.token_expires_at) < new Date()) || [];
        if (expired.length > 0) {
          return { 
            status: 'warn', 
            message: `${expired.length} connection(s) have expired tokens`,
            details: expired.map(c => c.profile_name)
          };
        }
        return { status: 'pass', message: `${data?.length || 0} active connections with valid tokens` };
      }
    },
    {
      id: 'campaigns_exist',
      name: 'Campaigns Data',
      description: 'Campaigns exist and have recent data',
      check: async () => {
        const { data, error, count } = await supabase
          .from('campaigns')
          .select('id, updated_at', { count: 'exact' })
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (error) return { status: 'fail', message: error.message };
        if (!count || count === 0) return { status: 'warn', message: 'No campaigns found' };
        
        const lastUpdate = data?.[0]?.updated_at;
        const daysSinceUpdate = lastUpdate 
          ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        if (daysSinceUpdate && daysSinceUpdate > 7) {
          return { status: 'warn', message: `${count} campaigns, but last update was ${daysSinceUpdate} days ago` };
        }
        
        return { status: 'pass', message: `${count} campaigns, last updated ${daysSinceUpdate ?? 0} days ago` };
      }
    },
    {
      id: 'keywords_exist',
      name: 'Keywords Data',
      description: 'Keywords exist with performance metrics',
      check: async () => {
        const { count, error } = await supabase
          .from('keywords')
          .select('id', { count: 'exact', head: true });
        
        if (error) return { status: 'fail', message: error.message };
        if (!count || count === 0) return { status: 'warn', message: 'No keywords found' };
        
        return { status: 'pass', message: `${count} keywords in database` };
      }
    },
    {
      id: 'actions_not_stuck',
      name: 'Action Queue Health',
      description: 'No actions stuck in queued state for over 1 hour',
      check: async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
          .from('action_queue')
          .select('id, action_type, created_at')
          .eq('status', 'queued')
          .lt('created_at', oneHourAgo);
        
        if (error) return { status: 'fail', message: error.message };
        if (data && data.length > 0) {
          return { 
            status: 'warn', 
            message: `${data.length} action(s) stuck in queue`,
            details: data.map(a => ({ id: a.id, type: a.action_type }))
          };
        }
        
        return { status: 'pass', message: 'No stuck actions' };
      }
    },
    {
      id: 'rules_valid',
      name: 'Automation Rules',
      description: 'All enabled rules have valid parameters',
      check: async () => {
        const { data, error } = await supabase
          .from('automation_rules')
          .select('id, name, params, action')
          .eq('enabled', true);
        
        if (error) return { status: 'fail', message: error.message };
        if (!data || data.length === 0) return { status: 'warn', message: 'No enabled automation rules' };
        
        const invalid = data.filter(r => !r.params || !r.action);
        if (invalid.length > 0) {
          return { 
            status: 'fail', 
            message: `${invalid.length} rule(s) have invalid configuration`,
            details: invalid.map(r => r.name)
          };
        }
        
        return { status: 'pass', message: `${data.length} enabled rules, all valid` };
      }
    },
    {
      id: 'sync_recent',
      name: 'Recent Sync Activity',
      description: 'Data sync has run in the last 24 hours',
      check: async () => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
          .from('amazon_connections')
          .select('profile_name, last_sync_at')
          .not('last_sync_at', 'is', null)
          .gte('last_sync_at', oneDayAgo);
        
        if (error) return { status: 'fail', message: error.message };
        if (!data || data.length === 0) {
          return { status: 'warn', message: 'No syncs in the last 24 hours' };
        }
        
        return { status: 'pass', message: `${data.length} connection(s) synced recently` };
      }
    },
    {
      id: 'alerts_processed',
      name: 'Alert Processing',
      description: 'No unacknowledged critical alerts older than 24 hours',
      check: async () => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
          .from('alerts')
          .select('id, title, level, created_at')
          .eq('level', 'critical')
          .eq('state', 'open')
          .lt('created_at', oneDayAgo);
        
        if (error) return { status: 'fail', message: error.message };
        if (data && data.length > 0) {
          return { 
            status: 'warn', 
            message: `${data.length} old critical alert(s) unacknowledged`,
            details: data.map(a => a.title)
          };
        }
        
        return { status: 'pass', message: 'No old unacknowledged critical alerts' };
      }
    },
    {
      id: 'bid_states_exist',
      name: 'Bid Optimization Data',
      description: 'Bid states exist for optimization',
      check: async () => {
        const { count, error } = await supabase
          .from('bid_states')
          .select('id', { count: 'exact', head: true })
          .eq('optimization_enabled', true);
        
        if (error) return { status: 'fail', message: error.message };
        if (!count || count === 0) {
          return { status: 'warn', message: 'No entities with bid optimization enabled' };
        }
        
        return { status: 'pass', message: `${count} entities with bid optimization enabled` };
      }
    },
  ];

  const runCheck = async (check: DataCheck) => {
    setRunning(check.id);
    try {
      const result = await check.check();
      setResults(prev => ({ ...prev, [check.id]: result }));
      
      // Save to database
      await saveResult({
        test_name: check.id,
        status: result.status === 'pass' ? 'pass' : result.status === 'warn' ? 'pass' : 'fail',
        details: { message: result.message, details: result.details },
        notes: result.message,
      });
    } catch (err) {
      setResults(prev => ({ 
        ...prev, 
        [check.id]: { status: 'fail', message: err instanceof Error ? err.message : 'Unknown error' } 
      }));
    }
    setRunning(null);
  };

  const runAllChecks = async () => {
    setRunningAll(true);
    for (const check of dataChecks) {
      await runCheck(check);
    }
    setRunningAll(false);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warn':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-success text-success-foreground">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive">Fail</Badge>;
      case 'warn':
        return <Badge className="bg-warning text-warning-foreground">Warning</Badge>;
      default:
        return <Badge variant="secondary">Not Run</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Validator</CardTitle>
        <CardDescription>
          Automated checks for data integrity and health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runAllChecks} 
          disabled={runningAll}
          className="w-full"
        >
          {runningAll ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Running all checks...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run All Checks
            </>
          )}
        </Button>

        <div className="space-y-2">
          {dataChecks.map(check => (
            <div 
              key={check.id}
              className="border rounded-lg p-3 bg-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(results[check.id]?.status)}
                  <div>
                    <div className="font-medium text-sm">{check.name}</div>
                    <div className="text-xs text-muted-foreground">{check.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(results[check.id]?.status)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runCheck(check)}
                    disabled={running === check.id || runningAll}
                  >
                    {running === check.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              {results[check.id]?.message && (
                <div className="mt-2 text-sm text-muted-foreground pl-7">
                  {results[check.id].message}
                </div>
              )}
              {results[check.id]?.details && (
                <pre className="mt-2 text-xs bg-muted p-2 rounded ml-7 overflow-x-auto font-mono">
                  {JSON.stringify(results[check.id].details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
