import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, AlertTriangle, Activity } from "lucide-react";
import { AutomationRulesList } from "@/components/AutomationRulesList";
import { AlertsPanel } from "@/components/AlertsPanel";
import { useAutomationRules, useAlerts } from "@/hooks/useAutomation";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const AutomationPage: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<string>("");
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

  const plan = subscription?.plan_type || 'free';

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
        return {
          name: 'Free',
          features: ['Alerts only', 'Budget depletion monitoring', 'Spend spike detection'],
          color: 'bg-gray-100 text-gray-800'
        };
      case 'pro':
        return {
          name: 'Pro',
          features: ['All Starter features', 'Bid optimization', 'Placement automation', 'Full auto-apply'],
          color: 'bg-green-100 text-green-800'
        };
      default:
        return {
          name: 'Starter',
          features: ['All Free features', 'Search term automation', 'Keyword harvesting'],
          color: 'bg-blue-100 text-blue-800'
        };
    }
  };

  const planInfo = getPlanFeatures();
  const activeRules = rules.filter(r => r.enabled).length;
  const newAlerts = alerts.filter(a => a.state === 'new').length;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="space-y-2">
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
          
          <Badge className={planInfo.color}>
            {planInfo.name} Plan
          </Badge>
        </div>
      </div>

      {/* Profile Selection & Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium">Profile</label>
            <Select 
              value={selectedProfile} 
              onValueChange={setSelectedProfile}
              disabled={connectionsLoading}
            >
              <SelectTrigger>
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
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
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
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
              <Bot className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {planInfo.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedProfile ? (
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules">
              Automation Rules ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts ({alerts.length})
              {newAlerts > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {newAlerts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit">
              Audit Log
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
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Audit log functionality coming soon</p>
                  <p className="text-sm">Track all automation actions and changes</p>
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
};

export default AutomationPage;