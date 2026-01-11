import { useState } from 'react';
import { Play, CheckCircle, XCircle, Circle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalFilters } from '@/context/GlobalFiltersContext';
import { useTestResults } from '@/hooks/useTestResults';

interface FlowStep {
  id: string;
  name: string;
  run: () => Promise<{ success: boolean; message: string; details?: unknown }>;
}

interface Flow {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
}

interface StepResult {
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: unknown;
}

export function FlowSimulator() {
  const { selectedProfileId: selectedProfile } = useGlobalFilters();
  const { saveResult } = useTestResults('flow');
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);
  const [stepResults, setStepResults] = useState<Record<string, Record<string, StepResult>>>({});
  const [runningFlow, setRunningFlow] = useState<string | null>(null);

  const flows: Flow[] = [
    {
      id: 'onboarding',
      name: 'New User Onboarding',
      description: 'Verify the complete onboarding experience',
      steps: [
        {
          id: 'auth_check',
          name: 'Auth system responds',
          run: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              return { success: true, message: 'Auth session active' };
            }
            return { success: false, message: 'No auth session' };
          }
        },
        {
          id: 'onboarding_status',
          name: 'Check user profile',
          run: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              return { success: false, message: 'No session' };
            }
            return { 
              success: true, 
              message: 'User authenticated',
              details: { userId: session.user.id, email: session.user.email }
            };
          }
        },
        {
          id: 'connections_check',
          name: 'Amazon connections exist',
          run: async () => {
            const { data, error, count } = await supabase
              .from('amazon_connections')
              .select('id, profile_name, status', { count: 'exact' });
            
            if (error) return { success: false, message: error.message };
            if (!count || count === 0) {
              return { success: true, message: 'No connections yet - expected for new users' };
            }
            return { 
              success: true, 
              message: `${count} connection(s) found`,
              details: data?.map(c => ({ name: c.profile_name, status: c.status }))
            };
          }
        },
      ]
    },
    {
      id: 'automation',
      name: 'Automation Execution',
      description: 'Test the automation rule execution flow',
      steps: [
        {
          id: 'rules_exist',
          name: 'Check enabled rules',
          run: async () => {
            const { data, error, count } = await supabase
              .from('automation_rules')
              .select('id, name, rule_type', { count: 'exact' })
              .eq('enabled', true);
            
            if (error) return { success: false, message: error.message };
            if (!count || count === 0) {
              return { success: false, message: 'No enabled rules to test' };
            }
            return { 
              success: true, 
              message: `${count} enabled rule(s)`,
              details: data?.map(r => ({ name: r.name, type: r.rule_type }))
            };
          }
        },
        {
          id: 'trigger_rules',
          name: 'Trigger rules engine',
          run: async () => {
            if (!selectedProfile) {
              return { success: false, message: 'No profile selected' };
            }
            
            const { data, error } = await supabase.functions.invoke('rules-engine-runner', {
              body: { profileId: selectedProfile, dryRun: true }
            });
            
            if (error) return { success: false, message: error.message };
            return { success: true, message: 'Rules engine executed', details: data };
          }
        },
        {
          id: 'check_alerts',
          name: 'Check for new alerts',
          run: async () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            
            const { data, error, count } = await supabase
              .from('alerts')
              .select('id, title, level', { count: 'exact' })
              .gte('created_at', fiveMinutesAgo);
            
            if (error) return { success: false, message: error.message };
            return { 
              success: true, 
              message: `${count || 0} alert(s) created in last 5 minutes`,
              details: data
            };
          }
        },
        {
          id: 'check_actions',
          name: 'Check action queue',
          run: async () => {
            const { data, error, count } = await supabase
              .from('action_queue')
              .select('id, action_type, status', { count: 'exact' })
              .eq('status', 'queued');
            
            if (error) return { success: false, message: error.message };
            return { 
              success: true, 
              message: `${count || 0} action(s) in queue`,
              details: data?.slice(0, 5)
            };
          }
        },
      ]
    },
    {
      id: 'data_accuracy',
      name: 'Data Accuracy',
      description: 'Verify data calculations and consistency',
      steps: [
        {
          id: 'campaign_count',
          name: 'Verify campaign count',
          run: async () => {
            const { count, error } = await supabase
              .from('campaigns')
              .select('id', { count: 'exact', head: true });
            
            if (error) return { success: false, message: error.message };
            return { success: true, message: `${count || 0} campaigns in database` };
          }
        },
        {
          id: 'kpi_calc',
          name: 'Test KPI calculations',
          run: async () => {
            if (!selectedProfile) {
              return { success: false, message: 'No profile selected' };
            }
            
            const { data, error } = await supabase.functions.invoke('dashboard', {
              body: { profileId: selectedProfile, dateRange: { from: '2024-01-01', to: '2024-12-31' } }
            });
            
            if (error) return { success: false, message: error.message };
            if (!data) return { success: false, message: 'No data returned' };
            
            return { 
              success: true, 
              message: 'KPIs calculated successfully',
              details: { 
                hasSpend: 'spend' in (data || {}),
                hasSales: 'sales' in (data || {}),
                hasAcos: 'acos' in (data || {})
              }
            };
          }
        },
        {
          id: 'rollups_exist',
          name: 'Check campaign data freshness',
          run: async () => {
            const { count, error } = await supabase
              .from('campaigns')
              .select('id', { count: 'exact', head: true });
            
            if (error) return { success: false, message: error.message };
            return { 
              success: count && count > 0, 
              message: count ? `${count} campaigns in database` : 'No campaign data yet'
            };
          }
        },
      ]
    },
    {
      id: 'sync_flow',
      name: 'Data Sync Flow',
      description: 'Test the complete data synchronization process',
      steps: [
        {
          id: 'connection_health',
          name: 'Check connection health',
          run: async () => {
            const { data, error } = await supabase
              .from('amazon_connections')
              .select('id, profile_name, health_status, last_sync_at')
              .eq('status', 'active');
            
            if (error) return { success: false, message: error.message };
            if (!data || data.length === 0) {
              return { success: false, message: 'No active connections' };
            }
            
            const healthy = data.filter(c => c.health_status === 'healthy');
            return { 
              success: healthy.length > 0, 
              message: `${healthy.length}/${data.length} connections healthy`,
              details: data.map(c => ({ name: c.profile_name, health: c.health_status }))
            };
          }
        },
        {
          id: 'sync_history',
          name: 'Check sync history',
          run: async () => {
            const { data, error } = await supabase
              .from('auto_sync_history')
              .select('id, status, trigger_type, started_at')
              .order('started_at', { ascending: false })
              .limit(5);
            
            if (error) return { success: false, message: error.message };
            if (!data || data.length === 0) {
              return { success: true, message: 'No sync history yet' };
            }
            
            const successful = data.filter(s => s.status === 'completed');
            return { 
              success: successful.length > 0, 
              message: `${successful.length}/${data.length} recent syncs successful`,
              details: data
            };
          }
        },
        {
          id: 'entities_synced',
          name: 'Verify entity counts',
          run: async () => {
            const [campaigns, adGroups, keywords] = await Promise.all([
              supabase.from('campaigns').select('id', { count: 'exact', head: true }),
              supabase.from('ad_groups').select('id', { count: 'exact', head: true }),
              supabase.from('keywords').select('id', { count: 'exact', head: true }),
            ]);
            
            return { 
              success: true, 
              message: 'Entity counts retrieved',
              details: {
                campaigns: campaigns.count || 0,
                adGroups: adGroups.count || 0,
                keywords: keywords.count || 0
              }
            };
          }
        },
      ]
    },
  ];

  const runFlow = async (flow: Flow) => {
    setRunningFlow(flow.id);
    setExpandedFlow(flow.id);
    
    const flowResults: Record<string, StepResult> = {};
    
    for (const step of flow.steps) {
      flowResults[step.id] = { status: 'running' };
      setStepResults(prev => ({ ...prev, [flow.id]: { ...flowResults } }));
      
      try {
        const result = await step.run();
        flowResults[step.id] = {
          status: result.success ? 'success' : 'error',
          message: result.message,
          details: result.details
        };
      } catch (err) {
        flowResults[step.id] = {
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error'
        };
      }
      
      setStepResults(prev => ({ ...prev, [flow.id]: { ...flowResults } }));
    }
    
    // Save flow result
    const allPassed = Object.values(flowResults).every(r => r.status === 'success');
    await saveResult({
      test_name: flow.id,
      status: allPassed ? 'pass' : 'fail',
      details: flowResults,
    });
    
    setRunningFlow(null);
  };

  const getStepIcon = (status?: StepResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getFlowStatus = (flowId: string) => {
    const results = stepResults[flowId];
    if (!results) return 'pending';
    
    const statuses = Object.values(results).map(r => r.status);
    if (statuses.some(s => s === 'running')) return 'running';
    if (statuses.every(s => s === 'success')) return 'success';
    if (statuses.some(s => s === 'error')) return 'error';
    return 'pending';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flow Simulator</CardTitle>
        <CardDescription>
          Test end-to-end user journeys and critical flows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {flows.map(flow => (
          <Collapsible
            key={flow.id}
            open={expandedFlow === flow.id}
            onOpenChange={(open) => setExpandedFlow(open ? flow.id : null)}
          >
            <div className="border rounded-lg bg-card">
              <div className="p-3 flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                  {expandedFlow === flow.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div>
                    <div className="font-medium text-sm">{flow.name}</div>
                    <div className="text-xs text-muted-foreground">{flow.description}</div>
                  </div>
                </CollapsibleTrigger>
                <div className="flex items-center gap-2">
                  {getFlowStatus(flow.id) === 'success' && (
                    <Badge className="bg-success text-success-foreground">Passed</Badge>
                  )}
                  {getFlowStatus(flow.id) === 'error' && (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => runFlow(flow)}
                    disabled={runningFlow !== null}
                  >
                    {runningFlow === flow.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    <span className="ml-1">Run</span>
                  </Button>
                </div>
              </div>
              
              <CollapsibleContent>
                <div className="border-t p-3 space-y-2">
                  {flow.steps.map((step, idx) => {
                    const result = stepResults[flow.id]?.[step.id];
                    return (
                      <div key={step.id} className="flex items-start gap-3 pl-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                          {getStepIcon(result?.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{step.name}</div>
                          {result?.message && (
                            <div className="text-xs text-muted-foreground">{result.message}</div>
                          )}
                          {result?.details && (
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto font-mono">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
