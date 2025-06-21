
import Header from "@/components/Header";
import AmazonAccountSetup from "@/components/AmazonAccountSetup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-blue-600" />
            Settings
          </h1>
          <p className="text-gray-600">
            Manage your account settings and integrations
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Amazon Integration */}
          <div className="lg:col-span-2">
            <AmazonAccountSetup />
          </div>

          {/* Additional Settings Placeholder */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Account Preferences</CardTitle>
                <CardDescription>
                  Additional settings will be available here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">
                  More account settings coming soon...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
