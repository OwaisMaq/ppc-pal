import DashboardShell from "@/components/DashboardShell";
import AmazonAccountSetup from "@/components/AmazonAccountSetup";
import AmsSetup from "@/components/AmsSetup";
import { ASINLabelManager } from "@/components/ASINLabelManager";
import { NotificationSettings } from "@/components/NotificationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings as SettingsIcon, Info, Tag, Bell } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useEffect } from "react";

const Settings = () => {
  const { connections, refreshConnections, loading } = useAmazonConnections();

  useEffect(() => {
    document.title = "Settings - Amazon Connections | PPC Pal";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Manage Amazon connections, permissions, and debug tools.";
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Settings
            </h1>
            <p className="text-gray-600">
              Manage your Amazon connections and account preferences
            </p>
          </div>
          <Button onClick={refreshConnections} variant="outline" disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Connections
          </Button>
        </div>

        <div className="space-y-6">
          {/* Amazon Connections Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Amazon Connections</h2>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <AmazonAccountSetup />
                <AmsSetup />
              </div>
              <aside>
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
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
          </div>

          {/* ASIN Labels Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold">ASIN Labels</h2>
            </div>
            <ASINLabelManager />
          </div>

          {/* Notification Settings Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-brand-primary" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>
            <NotificationSettings />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default Settings;
