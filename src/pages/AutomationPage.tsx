import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, AlertTriangle, Activity, FlaskConical } from "lucide-react";
import { AutomationRulesList } from "@/components/AutomationRulesList";
import { AlertsPanel } from "@/components/AlertsPanel";
import { CreateRuleDialog, CreateRuleData } from "@/components/automation/CreateRuleDialog";
import { AuditLogTab } from "@/components/automation/AuditLogTab";
import { ExperimentsTab } from "@/components/automation/ExperimentsTab";
import { useAutomationRules, useAlerts, AutomationRule } from "@/hooks/useAutomation";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useEntitlements } from "@/hooks/useEntitlements";
import { toast } from "sonner";

const STARTER_TYPES = ['budget_depletion', 'spend_spike', 'st_harvest', 'st_prune'];
const ALL_TYPES = [...STARTER_TYPES, 'bid_down', 'bid_up'];

const AutomationPage: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const { connections, loading: connectionsLoading } = useAmazonConnections();
  const { plan, checkLimit, getLimitValue } = useEntitlements();
  
  const {
    rules,
    loading: rulesLoading,
    error: rulesError,
    toggleRule,
    changeMode,
    runRule,
    initializeRules,
    createRule,
    updateRule,
    deleteRule,
  } = useAutomationRules(selectedProfile);

  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
    acknowledgeAlerts,
    refetch: refetchAlerts
  } = useAlerts(selectedProfile);

  const rulesLimit = getLimitValue('rules') ?? 0;
  const canCreateRule = rulesLimit === -1 || rules.length < rulesLimit;

  const allowedTypes = (() => {
    if (plan === 'pro' || plan === 'agency') return ALL_TYPES;
    if (plan === 'starter') return STARTER_TYPES;
    return [];
  })();

  const handleInitializeRules = async () => {
    if (!selectedProfile) { toast.error("Please select a profile first"); return; }
    try {
      await initializeRules(selectedProfile);
      toast.success("Default automation rules created successfully");
    } catch { toast.error("Failed to initialize rules"); }
  };

  const handleRunRule = async (ruleId: string) => {
    try {
      const result = await runRule(ruleId);
      toast.success(`Rule executed: ${result.total_alerts || 0} alerts, ${result.total_actions || 0} actions`);
    } catch { toast.error("Failed to run rule"); }
  };

  const handleAcknowledgeAlerts = async (alertIds: string[]) => {
    try {
      await acknowledgeAlerts(alertIds);
      toast.success(`${alertIds.length} alerts acknowledged`);
    } catch { toast.error("Failed to acknowledge alerts"); }
  };

  const handleCreateOrUpdate = async (data: CreateRuleData) => {
    if (editingRule) {
      await updateRule(editingRule.id, data);
      toast.success("Rule updated");
    } else {
      await createRule({ profile_id: selectedProfile, ...data });
      toast.success("Rule created");
    }
    setEditingRule(null);
  };

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setCreateDialogOpen(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRule(ruleId);
      toast.success("Rule deleted");
    } catch { toast.error("Failed to delete rule"); }
  };

  const getPlanInfo = () => {
    switch (plan) {
      case 'free': return { name: 'Free', color: 'bg-muted text-muted-foreground', desc: 'Upgrade to Starter to create automation rules' };
      case 'starter': return { name: 'Starter', color: 'bg-primary/10 text-primary', desc: `Up to 5 rules · Budget, Spend, Harvest, Prune` };
      case 'pro': return { name: 'Pro', color: 'bg-success/10 text-success', desc: 'Unlimited rules · All types including Bid optimization' };
      case 'agency': return { name: 'Agency', color: 'bg-success/10 text-success', desc: 'Unlimited rules · All types' };
      default: return { name: 'Free', color: 'bg-muted text-muted-foreground', desc: '' };
    }
  };

  const planInfo = getPlanInfo();
  const activeRules = rules.filter(r => r.enabled).length;
  const newAlerts = alerts.filter(a => a.state === 'new').length;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Automation
          </h1>
          <p className="text-muted-foreground">
            Automated rules and alerts for your Amazon advertising campaigns
          </p>
        </div>
        <div className="text-right">
          <Badge className={planInfo.color}>{planInfo.name} Plan</Badge>
          <p className="text-xs text-muted-foreground mt-1">{planInfo.desc}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium">Profile</label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile} disabled={connectionsLoading}>
              <SelectTrigger><SelectValue placeholder="Select profile" /></SelectTrigger>
              <SelectContent>
                {connections?.map((c) => (
                  <SelectItem key={c.id} value={c.profile_id}>
                    {c.profile_name || c.profile_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{activeRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">New Alerts</p>
                <p className="text-2xl font-bold">{newAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">
                  {rules.length}{rulesLimit > 0 ? ` / ${rulesLimit}` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedProfile ? (
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts ({alerts.length})
              {newAlerts > 0 && <Badge variant="destructive" className="ml-2 text-xs">{newAlerts}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="experiments">
              <FlaskConical className="h-3.5 w-3.5 mr-1" />
              Experiments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Automation Rules</h2>
              {rules.length === 0 ? (
                <Button onClick={handleInitializeRules}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Default Rules
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={!canCreateRule}
                  onClick={() => { setEditingRule(null); setCreateDialogOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Rule
                </Button>
              )}
            </div>

            {rulesError && (
              <Card className="border-destructive">
                <CardContent className="p-4">
                  <p className="text-destructive text-sm">Error: {rulesError}</p>
                </CardContent>
              </Card>
            )}

            <AutomationRulesList
              rules={rules}
              loading={rulesLoading}
              onToggleRule={toggleRule}
              onChangeMode={changeMode}
              onRunRule={handleRunRule}
              onEditRule={handleEditRule}
              onDeleteRule={handleDeleteRule}
            />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            {alertsError && (
              <Card className="border-destructive">
                <CardContent className="p-4">
                  <p className="text-destructive text-sm">Error: {alertsError}</p>
                </CardContent>
              </Card>
            )}
            <AlertsPanel
              alerts={alerts}
              loading={alertsLoading}
              onAcknowledgeAlerts={handleAcknowledgeAlerts}
              onFilterChange={refetchAlerts}
            />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <AuditLogTab profileId={selectedProfile} />
          </TabsContent>

          <TabsContent value="experiments" className="space-y-6">
            <ExperimentsTab profileId={selectedProfile} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Select a Profile</h3>
            <p className="text-muted-foreground">
              Choose an Amazon advertising profile to view and manage automation rules.
            </p>
          </CardContent>
        </Card>
      )}

      <CreateRuleDialog
        open={createDialogOpen}
        onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) setEditingRule(null); }}
        profileId={selectedProfile}
        editRule={editingRule}
        onSubmit={handleCreateOrUpdate}
        allowedTypes={allowedTypes}
      />
    </div>
  );
};

export default AutomationPage;
