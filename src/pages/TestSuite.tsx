import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, RefreshCw } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminRole } from '@/hooks/useAdminRole';
import { FeatureChecklist, EdgeFunctionTester, DataValidator, FlowSimulator } from '@/components/testing';

export default function TestSuite() {
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/command-center');
    }
  }, [isAdmin, adminLoading, navigate]);

  if (adminLoading) {
    return (
      <DashboardShell>
        <div className="min-h-[400px] flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Test Suite</h1>
            <p className="text-sm text-muted-foreground">
              Comprehensive testing and validation for PPC Pal
            </p>
          </div>
        </div>

        <Tabs defaultValue="features" className="space-y-4">
          <TabsList>
            <TabsTrigger value="features">Feature Checklist</TabsTrigger>
            <TabsTrigger value="functions">Edge Functions</TabsTrigger>
            <TabsTrigger value="data">Data Validation</TabsTrigger>
            <TabsTrigger value="flows">Flow Simulator</TabsTrigger>
          </TabsList>

          <TabsContent value="features">
            <FeatureChecklist />
          </TabsContent>

          <TabsContent value="functions">
            <EdgeFunctionTester />
          </TabsContent>

          <TabsContent value="data">
            <DataValidator />
          </TabsContent>

          <TabsContent value="flows">
            <FlowSimulator />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
