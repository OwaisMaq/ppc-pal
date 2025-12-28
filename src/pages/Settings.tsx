import DashboardShell from "@/components/DashboardShell";
import AmazonAccountSetup from "@/components/AmazonAccountSetup";
import AmsSetup from "@/components/AmsSetup";
import { ASINLabelManager } from "@/components/ASINLabelManager";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ConnectionStatusAlert } from "@/components/ConnectionStatusAlert";
import { GuardrailsSettings, ProtectedEntities } from "@/components/governance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Settings as SettingsIcon, Info, Tag, Bell, Shield } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useGovernance } from "@/hooks/useGovernance";
import { useEffect, useState } from "react";

const Settings = () => {
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const { connections, refreshConnections, refreshConnection, initiateConnection, loading } = useAmazonConnections();
  
  const {
    settings: governanceSettings,
    protectedEntities,
    saving: governanceSaving,
    updateSettings,
    toggleAutomation,
    addProtectedEntity,
    removeProtectedEntity,
  } = useGovernance(selectedProfile || null);

  // Set default profile when connections load
  useEffect(() => {
    if (connections.length > 0 && !selectedProfile) {
      setSelectedProfile(connections[0].profile_id);
    }
  }, [connections, selectedProfile]);

  useEffect(() => {
    document.title = "Settings - Amazon Connections | PPC Pal";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Manage Amazon connections, guardrails, and account preferences.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your Amazon connections, guardrails, and account preferences
            </p>
          </div>
          <Button onClick={refreshConnections} variant="outline" disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Connections
          </Button>
        </div>

        <div className="space-y-8">
          {/* Amazon Connections Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="h-5 w-5 text-brand-primary" />
              <h2 className="text-xl font-semibold">Amazon Connections</h2>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Connection Status Alerts */}
                {connections.map(connection => (
                  <ConnectionStatusAlert 
                    key={connection.id}
                    connection={connection}
                    onRefresh={async () => {
                      await refreshConnection(connection.id);
                      await refreshConnections();
                    }}
                    onReconnect={async () => {
                      await initiateConnection();
                    }}
                    loading={loading}
                  />
                ))}
                <AmazonAccountSetup />
                <AmsSetup />
              </div>
              <aside>
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Info className="h-4 w-4" />
                      Connection Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Connections</span>
                        <span className="font-semibold">{connections.length}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Manage connection status, re-authenticate, and configure data sync from this panel.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </section>

          {/* Governance Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand-primary" />
                <h2 className="text-xl font-semibold">Automation Guardrails</h2>
              </div>
              {connections.length > 1 && (
                <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.profile_id}>
                        {connection.profile_name || connection.profile_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {connections.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    Connect an Amazon Ads account to configure guardrails
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <GuardrailsSettings
                  settings={governanceSettings}
                  saving={governanceSaving}
                  onUpdate={updateSettings}
                  onToggleAutomation={toggleAutomation}
                />
                <ProtectedEntities
                  entities={protectedEntities}
                  saving={governanceSaving}
                  onAdd={addProtectedEntity}
                  onRemove={removeProtectedEntity}
                />
              </div>
            )}
          </section>

          {/* ASIN Labels Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-success" />
              <h2 className="text-xl font-semibold">ASIN Labels</h2>
            </div>
            <ASINLabelManager />
          </section>

          {/* Notification Settings Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-brand-primary" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>
            <NotificationSettings />
          </section>
        </div>
      </div>
    </DashboardShell>
  );
};

export default Settings;
