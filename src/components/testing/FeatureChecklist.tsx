import { useState } from 'react';
import { Check, X, Minus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useTestResults } from '@/hooks/useTestResults';

interface FeatureItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

const features: FeatureItem[] = [
  // Authentication
  { id: 'auth_signup', name: 'Sign Up', category: 'Authentication', description: 'User can create a new account' },
  { id: 'auth_signin', name: 'Sign In', category: 'Authentication', description: 'User can log in with credentials' },
  { id: 'auth_reset', name: 'Password Reset', category: 'Authentication', description: 'User can reset password via email' },
  { id: 'auth_signout', name: 'Sign Out', category: 'Authentication', description: 'User can log out' },
  
  // Onboarding
  { id: 'onboard_wizard', name: 'Onboarding Wizard', category: 'Onboarding', description: 'Multi-step wizard loads correctly' },
  { id: 'onboard_goals', name: 'Goal Selection', category: 'Onboarding', description: 'User can select optimization goals' },
  { id: 'onboard_oauth', name: 'Amazon OAuth', category: 'Onboarding', description: 'Amazon connection flow works' },
  
  // Data Sync
  { id: 'sync_initial', name: 'Initial Data Sync', category: 'Data Sync', description: 'First sync pulls campaigns, keywords, etc.' },
  { id: 'sync_refresh', name: 'Manual Refresh', category: 'Data Sync', description: 'Refresh button triggers new sync' },
  { id: 'sync_historical', name: 'Historical Import', category: 'Data Sync', description: '60-day historical data import' },
  
  // Dashboard
  { id: 'dash_kpis', name: 'KPI Display', category: 'Dashboard', description: 'KPIs show correct data' },
  { id: 'dash_charts', name: 'Charts Rendering', category: 'Dashboard', description: 'Charts display performance trends' },
  { id: 'dash_filters', name: 'Date Filtering', category: 'Dashboard', description: 'Date range picker works' },
  
  // Campaigns
  { id: 'camp_list', name: 'Campaign List', category: 'Campaigns', description: 'All campaigns display in table' },
  { id: 'camp_filter', name: 'Campaign Filtering', category: 'Campaigns', description: 'Status/type filters work' },
  { id: 'camp_search', name: 'Search Terms View', category: 'Campaigns', description: 'Search terms load for campaigns' },
  
  // Automation
  { id: 'auto_create', name: 'Rule Creation', category: 'Automation', description: 'Can create new automation rules' },
  { id: 'auto_execute', name: 'Rule Execution', category: 'Automation', description: 'Rules evaluate and trigger actions' },
  { id: 'auto_alerts', name: 'Alert Generation', category: 'Automation', description: 'Alerts created from rules' },
  
  // Governance
  { id: 'gov_protected', name: 'Protected Entities', category: 'Governance', description: 'Can mark entities as protected' },
  { id: 'gov_guardrails', name: 'Guardrails', category: 'Governance', description: 'Guardrail settings save correctly' },
  
  // Settings
  { id: 'set_account', name: 'Account Settings', category: 'Settings', description: 'Profile updates save' },
  { id: 'set_notifications', name: 'Notification Prefs', category: 'Settings', description: 'Notification settings work' },
  { id: 'set_connections', name: 'Connection Management', category: 'Settings', description: 'Can view/manage Amazon connections' },
];

export function FeatureChecklist() {
  const { results, loading, saveResult } = useTestResults('feature');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const getStatus = (id: string) => {
    const result = results.find(r => r.test_name === id);
    return result?.status || 'untested';
  };

  const getLastTested = (id: string) => {
    const result = results.find(r => r.test_name === id);
    return result?.updated_at;
  };

  const getNotes = (id: string) => {
    const result = results.find(r => r.test_name === id);
    return notes[id] ?? result?.notes ?? '';
  };

  const handleStatusChange = async (id: string, status: 'pass' | 'fail' | 'untested') => {
    setSaving(id);
    await saveResult({
      test_name: id,
      status,
      notes: notes[id] || getNotes(id),
    });
    setSaving(null);
  };

  const categories = [...new Set(features.map(f => f.category))];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-success text-success-foreground">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive">Fail</Badge>;
      default:
        return <Badge variant="secondary">Untested</Badge>;
    }
  };

  const getCategoryStats = (category: string) => {
    const categoryFeatures = features.filter(f => f.category === category);
    const passed = categoryFeatures.filter(f => getStatus(f.id) === 'pass').length;
    const failed = categoryFeatures.filter(f => getStatus(f.id) === 'fail').length;
    return { total: categoryFeatures.length, passed, failed };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading test results...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Checklist</CardTitle>
        <CardDescription>
          Manually test each feature and mark as pass/fail
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map(category => {
          const stats = getCategoryStats(category);
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">{category}</h3>
                <span className="text-sm text-muted-foreground">
                  {stats.passed}/{stats.total} passed
                  {stats.failed > 0 && <span className="text-destructive ml-2">({stats.failed} failed)</span>}
                </span>
              </div>
              <div className="space-y-2">
                {features.filter(f => f.category === category).map(feature => (
                  <div 
                    key={feature.id}
                    className="border rounded-lg p-3 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{feature.name}</span>
                          {getStatusBadge(getStatus(feature.id))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {feature.description}
                        </p>
                        {getLastTested(feature.id) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last tested: {new Date(getLastTested(feature.id)!).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={getStatus(feature.id) === 'pass' ? 'default' : 'outline'}
                          className="h-8 w-8 p-0"
                          onClick={() => handleStatusChange(feature.id, 'pass')}
                          disabled={saving === feature.id}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={getStatus(feature.id) === 'fail' ? 'destructive' : 'outline'}
                          className="h-8 w-8 p-0"
                          onClick={() => handleStatusChange(feature.id, 'fail')}
                          disabled={saving === feature.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleStatusChange(feature.id, 'untested')}
                          disabled={saving === feature.id}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(expandedId === feature.id ? null : feature.id)}
                        >
                          Notes
                        </Button>
                      </div>
                    </div>
                    {expandedId === feature.id && (
                      <div className="mt-3 pt-3 border-t">
                        <Textarea
                          placeholder="Add notes about this test..."
                          value={getNotes(feature.id)}
                          onChange={(e) => setNotes({ ...notes, [feature.id]: e.target.value })}
                          className="text-sm"
                          rows={2}
                        />
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => handleStatusChange(feature.id, getStatus(feature.id) as 'pass' | 'fail' | 'untested')}
                          disabled={saving === feature.id}
                        >
                          Save Notes
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
