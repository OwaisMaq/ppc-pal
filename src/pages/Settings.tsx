import Header from "@/components/Header";
import AmazonAccountSetup from "@/components/AmazonAccountSetup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

const Settings = () => {
  useEffect(() => {
    document.title = "Settings | Amazon Connections";
    // Basic canonical tag for SEO
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = window.location.href;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <section className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your Amazon Advertising connections and data sync.</p>
        </section>

        <section aria-labelledby="amazon-settings">
          <Card>
            <CardHeader>
              <CardTitle id="amazon-settings">Amazon Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <AmazonAccountSetup />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Settings;
