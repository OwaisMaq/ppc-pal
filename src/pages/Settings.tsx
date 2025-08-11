import Header from "@/components/Header";
import AmazonAccountSetup from "@/components/AmazonAccountSetup";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings as SettingsIcon } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <Button onClick={refreshConnections} variant="outline" disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Connections
          </Button>
        </header>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AmazonAccountSetup />
          </div>
          <aside>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6 text-sm">
                <p className="mb-2"><strong>Debug Info</strong></p>
                <p>Connections: {connections.length}</p>
                <p className="mt-1 text-muted-foreground">Manage connection status, re-auth, and sync from here.</p>
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default Settings;
