import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Bot, 
  AlertTriangle, 
  Activity, 
  Power, 
  Shield,
  Zap,
  Clock,
  History,
  ListChecks
} from "lucide-react";
import { AutomationRulesList } from "@/components/AutomationRulesList";
import { AlertsPanel } from "@/components/AlertsPanel";
import PendingApprovals from "@/components/PendingApprovals";
import ActionsFeed from "@/components/ActionsFeed";
import { TrustReportCard, OutcomeAttributionPanel } from "@/components/overview";
import { useAutomationRules, useAlerts } from "@/hooks/useAutomation";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useSubscription } from "@/hooks/useSubscription";
import { useActionOutcomes } from "@/hooks/useActionOutcomes";
import { useSavingsMetric } from "@/hooks/useSavingsMetric";
import { toast } from "sonner";

const Automate: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [globalAutomationEnabled, setGlobalAutomationEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("rules");
  const { connections, loading: connectionsLoading } = useAmazonConnections();
  const { subscription } = useSubscription();
  
  const {
    rules,
    loading: rulesLoading,
    error: rulesError,
    toggleRule,
    changeMode,
    runRule,
    initializeRules
  } = useAutomationRules(selectedProfile);

  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
    acknowledgeAlerts,
    refetch: refetchAlerts
  } = useAlerts(selectedProfile);

  // Fetch action outcomes and savings for trust report
  const { outcomes, stats: outcomeStats, loading: outcomesLoading } = useActionOutcomes();
  const { savings, loading: savingsLoading } = useSavingsMetric(selectedProfile);

  const plan = subscription?.plan_type || 'free';

  const handleKillSwitch = () => {
    setGlobalAutomationEnabled(false);
    toast.warning("Kill Switch activated - All automation paused", {
      description: "No automatic changes will be applied until you re-enable automation."
    });
  };

  const handleInitializeRules = async () => {
    if (!selectedProfile) {
      toast.error("Please select a profile first");
      return;
    }

    try {
      await initializeRules(selectedProfile);
      toast.success("Default automation rules created successfully");
    } catch (error) {
      toast.error("Failed to initialize rules");
    }
  };

  const handleRunRule = async (ruleId: string) => {
    try {
      const result = await runRule(ruleId);
      toast.success(`Rule executed: ${result.total_alerts || 0} alerts, ${result.total_actions || 0} actions`);
    } catch (error) {
      toast.error("Failed to run rule");
    }
  };

  const handleAcknowledgeAlerts = async (alertIds: string[]) => {
    try {
      await acknowledgeAlerts(alertIds);
      toast.success(`${alertIds.length} alerts acknowledged`);
    } catch (error) {
      toast.error("Failed to acknowledge alerts");
    }
  };

  const getPlanFeatures = () => {
    switch (plan) {
      case 'free':
        return { name: 'Free', color: 'bg-muted text-muted-foreground' };
      case 'pro':
        return { name: 'Pro', color: 'bg-success/10 text-success' };
      default:
        return { name: 'Starter', color: 'bg-primary/10 text-primary' };
    }
  };

  const planInfo = getPlanFeatures();
  const activeRules = rules.filter(r => r.enabled).length;
  const newAlerts = alerts.filter(a => a.state === 'new').length;

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bot className="h-8 w-8" />
              Automate
            </h1>
            <p className="text-muted-foreground">
              Manage automation rules, approvals, and safety controls
            </p>
          </div>
          
          <Badge className={planInfo.color}>
            {planInfo.name} Plan
          </Badge>
        </div>

        {/* Global Controls */}
        <Card className={!globalAutomationEnabled ? "border-destructive" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${globalAutomationEnabled ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  <Power className={`h-5 w-5 ${globalAutomationEnabled ? 'text-success' : 'text-destructive'}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">Global Automation</CardTitle>
                  <CardDescription>
                    {globalAutomationEnabled 
                      ? "Automation is active and running" 
                      : "All automation is paused"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {globalAutomationEnabled ? "Active" : "Paused"}
                  </span>
                  <Switch
                    checked={globalAutomationEnabled}
                    onCheckedChange={setGlobalAutomationEnabled}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{activeRules}</p>
                  <p className="text-xs text-muted-foreground">Active Rules</p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <p className="text-2xl font-bold">{newAlerts}</p>
                  <p className="text-xs text-muted-foreground">New Alerts</p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <p className="text-2xl font-bold">{rules.length}</p>
                  <p className="text-xs text-muted-foreground">Total Rules</p>
                </div>
              </div>
              
              {/* Kill Switch */}
              <Button 
                variant="destructive" 
                size="lg"
                onClick={handleKillSwitch}
                disabled={!globalAutomationEnabled}
                className="gap-2"
              >
                <Shield className="h-5 w-5" />
                Kill Switch
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium whitespace-nowrap">Select Profile:</label>
              <Select 
                value={selectedProfile} 
                onValueChange={setSelectedProfile}
                disabled={connectionsLoading}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  {connections?.map((connection) => (
                    <SelectItem key={connection.id} value={connection.profile_id}>
                      {connection.profile_name || connection.profile_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedProfile ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="rules" className="gap-2">
                <Zap className="h-4 w-4" />
                Rules ({rules.length})
              </TabsTrigger>
              <TabsTrigger value="queue" className="gap-2">
                <ListChecks className="h-4 w-4" />
                Queue
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alerts
                {newAlerts > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {newAlerts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="trust" className="gap-2">
                <Shield className="h-4 w-4" />
                Trust Report
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
                  <Button variant="outline">
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
              />
            </TabsContent>

            <TabsContent value="queue" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Actions Queue</h2>
                <p className="text-muted-foreground text-sm">
                  Review and approve pending automation actions before they're applied
                </p>
              </div>
              <PendingApprovals />
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

            <TabsContent value="history" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Automation History</h2>
                <p className="text-muted-foreground text-sm">
                  Track all automation actions and changes
                </p>
              </div>
              <ActionsFeed />
            </TabsContent>

            <TabsContent value="trust" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Automation Trust Report</h2>
                <p className="text-muted-foreground text-sm">
                  See how automation is performing and track outcome attribution
                </p>
              </div>
              
              <div className="grid gap-6 lg:grid-cols-2">
                <TrustReportCard
                  stats={outcomeStats}
                  totalSavings={savings?.totalSavings || 0}
                  actionCount={savings?.actionCount || 0}
                  loading={outcomesLoading || savingsLoading}
                />
                <OutcomeAttributionPanel
                  outcomes={outcomes}
                  loading={outcomesLoading}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Select a Profile</h3>
              <p className="text-muted-foreground">
                Choose an Amazon advertising profile to view and manage automation.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
};

export default Automate;
