import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardShell from '@/components/DashboardShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Link2, Bell, CreditCard, Database } from 'lucide-react';
import {
  AccountSettings,
  ConnectionsSettings,
  NotificationsSettings,
  BillingSettings,
  DataSettings,
} from '@/components/settings';

const TABS = [
  { value: 'account', label: 'Account', icon: User },
  { value: 'connections', label: 'Connections', icon: Link2 },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'billing', label: 'Billing', icon: CreditCard },
  { value: 'data', label: 'Data', icon: Database },
];

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'account';

  useEffect(() => {
    document.title = 'Settings | PPC Pal';
    const meta = document.querySelector('meta[name="description"]');
    const desc = 'Manage your account, connections, and preferences.';
    if (meta) meta.setAttribute('content', desc);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your account and preferences
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid grid-cols-3 md:grid-cols-5 h-auto gap-1 p-1">
            {TABS.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs px-2 py-2"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="account">
            <AccountSettings />
          </TabsContent>

          <TabsContent value="connections">
            <ConnectionsSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsSettings />
          </TabsContent>

          <TabsContent value="billing">
            <BillingSettings />
          </TabsContent>

          <TabsContent value="data">
            <DataSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
};

export default Settings;
