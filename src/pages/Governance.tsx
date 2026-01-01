import React, { useState, useMemo, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Shield, 
  Power, 
  Zap,
  Calendar,
  ChevronDown
} from "lucide-react";
import { AutomationRulesList } from "@/components/AutomationRulesList";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DaypartScheduler } from "@/components/dayparting";
import { GuardrailsSettings, ProtectedEntities } from "@/components/governance";
import { useAutomationRules } from "@/hooks/useAutomation";
import { useSubscription } from "@/hooks/useSubscription";
import { useGovernance } from "@/hooks/useGovernance";
import { useGlobalFilters } from "@/context/GlobalFiltersContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const Governance: React.FC = () => {
  const { activeConnection, selectedProfileId } = useGlobalFilters();
  const selectedProfile = selectedProfileId || '';
  
  const [globalAutomationEnabled, setGlobalAutomationEnabled] = useState(true);
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

  // Governance settings (guardrails, protected entities)
  const {
    settings: governanceSettings,
    protectedEntities,
    saving: governanceSaving,
    updateSettings,
    toggleAutomation,
    addProtectedEntity,
    removeProtectedEntity,
  } = useGovernance(selectedProfile || null);

  // Fetch campaigns for dayparting
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-for-dayparting', selectedProfile],
    queryFn: async () => {
      if (!selectedProfile) return [];
      const { data, error } = await supabase
        .from('campaigns')
        .select('amazon_campaign_id, name, status')
        .eq('profile_id', selectedProfile);
      if (error) throw error;
      return (data || []).map(c => ({
        campaign_id: c.amazon_campaign_id,
        campaign_name: c.name,
        status: c.status,
      }));
    },
    enabled: !!selectedProfile,
  });

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
  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Governance
            </h1>
            <p className="text-muted-foreground">
              Manage automation rules, guardrails, and safety controls
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
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleKillSwitch}
                  disabled={!globalAutomationEnabled}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Kill Switch
                </Button>
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
        </Card>

        {selectedProfile ? (
          <div className="space-y-8">
            {/* Guardrails Section - Collapsible */}
            <Collapsible defaultOpen={false}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Safety Guardrails
                        </CardTitle>
                        <CardDescription>
                          Bid limits, approval thresholds, and protected entities
                        </CardDescription>
                      </div>
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-6">
                    <GuardrailsSettings
                      settings={governanceSettings}
                      saving={governanceSaving}
                      onUpdate={updateSettings}
                      onToggleAutomation={toggleAutomation}
                    />
                    <Separator />
                    <ProtectedEntities
                      entities={protectedEntities}
                      saving={governanceSaving}
                      onAdd={addProtectedEntity}
                      onRemove={removeProtectedEntity}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Automation Rules Section */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Automation Rules</h2>
                  <Badge variant="secondary" className="text-xs">{rules.length}</Badge>
                </div>
                
                {rules.length === 0 ? (
                  <Button size="sm" onClick={handleInitializeRules}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Default Rules
                  </Button>
                ) : (
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
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
            </section>

            {/* Dayparting Section */}
            <Collapsible defaultOpen={false}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Dayparting</CardTitle>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <DaypartScheduler 
                      profileId={selectedProfile} 
                      campaigns={campaigns}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Select a Profile</h3>
              <p className="text-muted-foreground">
                Choose an Amazon advertising profile to view and manage governance.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
};

export default Governance;
