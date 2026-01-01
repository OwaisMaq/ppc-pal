import DashboardShell from "@/components/DashboardShell";
import AmazonAccountSetup from "@/components/AmazonAccountSetup";
import AmsSetup from "@/components/AmsSetup";
import { ASINLabelManager } from "@/components/ASINLabelManager";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ConnectionStatusAlert } from "@/components/ConnectionStatusAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings as SettingsIcon, Info, Tag, Bell, Shield, ChevronRight } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const Settings = () => {
  const { connections, refreshConnections, refreshConnection, initiateConnection, loading } = useAmazonConnections();

  useEffect(() => {
    document.title = "Settings - Amazon Connections | PPC Pal";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Manage Amazon connections and account preferences.";
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
              Manage your Amazon connections and account preferences
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

          {/* Governance Link Card */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-brand-primary" />
              <h2 className="text-xl font-semibold">Automation Guardrails</h2>
            </div>
            <Card className="border-primary/20 hover:bg-muted/50 transition-colors">
              <Link to="/governance?tab=guardrails" className="block">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Configure bid limits, protected entities, and safety controls</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Manage guardrails and automation settings in the Governance page
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Link>
            </Card>
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
