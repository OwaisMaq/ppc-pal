import Header from "@/components/Header";
import AmazonAccountSetup from "@/components/AmazonAccountSetup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { RefreshCw, Settings as SettingsIcon, Info } from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  const { connections, loading, refreshConnections } = useAmazonConnections();

  // Basic SEO for the Settings page
  useEffect(() => {
    const title = "Settings – Amazon Sync & Debug";
    const description = "Manage Amazon connections, run syncs, and view debugging details.";

    document.title = title;

    // Meta description
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings: Amazon Sync & Debug</h1>
            <p className="text-gray-600">Connect accounts, trigger syncs, and inspect connection details.</p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </header>

        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Amazon Connections & Sync</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Reuse the existing setup/management component */}
              <AmazonAccountSetup />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Debug Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Review connection metadata to help diagnose sync issues.
                </p>
                <Button
                  onClick={refreshConnections}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Connections
                </Button>
              </div>

              {connections.length === 0 ? (
                <p className="text-gray-700 text-sm">No connections yet. Use the section above to connect your first account.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="py-2 pr-4">Profile</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Connection ID</th>
                        <th className="py-2 pr-4">Last Sync</th>
                        <th className="py-2 pr-4">Token Expires</th>
                        <th className="py-2 pr-4">Reporting API</th>
                      </tr>
                    </thead>
                    <tbody>
                      {connections.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="py-2 pr-4">{c.profile_name || 'Unknown'}</td>
                          <td className="py-2 pr-4 capitalize">{c.status}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{c.id}</td>
                          <td className="py-2 pr-4">{c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : '—'}</td>
                          <td className="py-2 pr-4">{c.token_expires_at ? new Date(c.token_expires_at).toLocaleString() : '—'}</td>
                          <td className="py-2 pr-4">{(c as any).reporting_api_version || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Settings;
