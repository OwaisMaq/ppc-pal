import Header from "@/components/Header";
import AmazonAccountManager from "@/components/AmazonAccountManager";
import SyncControls from "@/components/SyncControls";
import SyncMonitoring from "@/components/SyncMonitoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Zap, Activity } from "lucide-react";

const Settings = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <Header />
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage your Amazon account connections, sync settings, and monitor performance
          </p>
        </div>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Account Management
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Sync Controls
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Monitoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-6 mt-6">
            <AmazonAccountManager />
          </TabsContent>

          <TabsContent value="sync" className="space-y-6 mt-6">
            <SyncControls />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6 mt-6">
            <SyncMonitoring />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;