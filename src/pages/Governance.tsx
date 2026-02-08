import React, { useState } from "react";
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
  ChevronDown,
  BookOpen,
  Play,
  Settings2
} from "lucide-react";
import { AutomationRulesList } from "@/components/AutomationRulesList";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DaypartScheduler } from "@/components/dayparting";
import { GuardrailsSettings, ProtectedEntities, AIAutoApplyCard, ProductTargetsCard } from "@/components/governance";
import { ReportIssueButton } from "@/components/ui/ReportIssueButton";
import { useAutomationRules } from "@/hooks/useAutomation";
import { useSubscription } from "@/hooks/useSubscription";
import { useGovernance } from "@/hooks/useGovernance";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import { useGlobalFilters } from "@/context/GlobalFiltersContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Governance: React.FC = () => {
  const { activeConnection, selectedProfileId } = useGlobalFilters();
  const selectedProfile = selectedProfileId || '';
  
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [playbookParams, setPlaybookParams] = useState<Record<string, any>>({});
  const [playbookMode, setPlaybookMode] = useState<'dry_run' | 'auto'>('dry_run');
  
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
    templates,
    playbooks,
    runs,
    loading: playbooksLoading,
    createPlaybook,
    runPlaybook,
    fetchRuns
  } = usePlaybooks();

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

  const globalAutomationEnabled = !(governanceSettings?.automation_paused);

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

  const handleKillSwitch = async () => {
    try {
      await toggleAutomation(true, 'Kill switch activated');
      toast.warning("Kill Switch activated - All automation paused", {
        description: "No automatic changes will be applied until you re-enable automation."
      });
    } catch {
      toast.error("Failed to activate kill switch");
    }
  };

  const handleToggleAutomation = async (enabled: boolean) => {
    try {
      await toggleAutomation(!enabled);
    } catch {
      toast.error("Failed to toggle automation");
    }
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

  const handleConfigurePlaybook = (templateKey: string) => {
    const template = templates.find(t => t.key === templateKey);
    if (template) {
      setSelectedTemplate(templateKey);
      setPlaybookParams(template.defaultParams || {});
      setPlaybookMode('dry_run');
      setConfigDialogOpen(true);
    }
  };

  const handleRunPlaybook = async (templateKey: string) => {
    if (!selectedProfile) {
      toast.error("Please select a profile first");
      return;
    }
    
    const existingPlaybook = playbooks.find(p => p.template_key === templateKey);
    
    if (existingPlaybook) {
      try {
        await runPlaybook(existingPlaybook.id, selectedProfile, existingPlaybook.mode);
        toast.success("Playbook executed successfully");
      } catch (error) {
        toast.error("Failed to run playbook");
      }
    } else {
      handleConfigurePlaybook(templateKey);
    }
  };

  const handleSaveAndRunPlaybook = async () => {
    if (!selectedProfile || !selectedTemplate) return;
    
    const template = templates.find(t => t.key === selectedTemplate);
    if (!template) return;
    
    try {
      const playbook = await createPlaybook({
        name: template.name,
        description: template.description,
        templateKey: selectedTemplate,
        params: playbookParams,
        mode: playbookMode
      });
      
      if (playbook) {
        await runPlaybook(playbook.id, selectedProfile, playbookMode);
      }
      
      setConfigDialogOpen(false);
    } catch (error) {
      console.error('Error saving/running playbook:', error);
    }
  };

  const getLastRun = (templateKey: string) => {
    const playbook = playbooks.find(p => p.template_key === templateKey);
    if (!playbook) return null;
    return runs.find(r => r.playbook_id === playbook.id);
  };
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
          
          <div className="flex items-center gap-3">
            <ReportIssueButton 
              featureId="governance_page" 
              featureLabel="Governance Page"
              variant="text"
            />
            <Badge className={planInfo.color}>
              {planInfo.name} Plan
            </Badge>
          </div>
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
                    onCheckedChange={handleToggleAutomation}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {selectedProfile ? (
          <div className="space-y-6">
            {/* AI Auto-Apply Settings */}
            <AIAutoApplyCard />

            {/* Safety Guardrails - Compact Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Safety Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
            </Card>

            {/* Product-Level Targets */}
            <ProductTargetsCard 
              profileId={selectedProfile} 
              globalTargetAcos={30} 
            />

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

            {/* Saved Playbooks Section */}
            <Collapsible defaultOpen={false}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Saved Playbooks</CardTitle>
                        <Badge variant="secondary" className="text-xs">{templates.length}</Badge>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-3">
                    {templates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No playbook templates available
                      </p>
                    ) : (
                      templates.map((template) => {
                        const savedPlaybook = playbooks.find(p => p.template_key === template.key);
                        const lastRun = getLastRun(template.key);
                        
                        return (
                          <div 
                            key={template.key} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{template.name}</h4>
                                {savedPlaybook && (
                                  <Badge variant="outline" className="text-xs">
                                    {savedPlaybook.mode === 'auto' ? 'Auto' : 'Dry Run'}
                                  </Badge>
                                )}
                                {lastRun && (
                                  <Badge 
                                    variant={lastRun.status === 'success' ? 'default' : lastRun.status === 'failed' ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {lastRun.status}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {template.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleConfigurePlaybook(template.key)}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRunPlaybook(template.key)}
                                disabled={playbooksLoading}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Run
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

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

            {/* Playbook Configuration Dialog */}
            <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Configure Playbook
                  </DialogTitle>
                </DialogHeader>
                
                {selectedTemplate && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Mode</Label>
                      <Select value={playbookMode} onValueChange={(v) => setPlaybookMode(v as 'dry_run' | 'auto')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dry_run">Dry Run (Preview Only)</SelectItem>
                          <SelectItem value="auto">Auto (Apply Changes)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {Object.entries(playbookParams).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                        <Input
                          type={typeof value === 'number' ? 'number' : 'text'}
                          value={value as string | number}
                          onChange={(e) => setPlaybookParams(prev => ({
                            ...prev,
                            [key]: typeof value === 'number' ? Number(e.target.value) : e.target.value
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAndRunPlaybook}>
                    Save & Run
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
