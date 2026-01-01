import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AttributionAnalytics } from "@/components/AttributionAnalytics";
import { AnomaliesPanel } from "@/components/AnomaliesPanel";
import { BudgetCopilotPanel } from "@/components/BudgetCopilotPanel";
import { BudgetForecastPanel } from "@/components/BudgetForecastPanel";
import { AuditSummary } from "@/components/AuditSummary";
import { AuditMonthCard } from "@/components/AuditMonthCard";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useHistoricalAudit } from "@/hooks/useHistoricalAudit";
import { 
  BarChart3, 
  AlertTriangle, 
  ClipboardList,
  RefreshCw 
} from "lucide-react";
import { useEffect } from "react";


const Analytics = () => {
  const [activeTab, setActiveTab] = useState("performance");
  const { connections, loading: connectionsLoading } = useAmazonConnections();
  const activeConnection = connections?.[0];
  const profileId = activeConnection?.profile_id || null;

  // For attribution
  const [dateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo] = useState(new Date().toISOString().split('T')[0]);

  // For audit
  const {
    audits,
    loading: auditLoading,
    error: auditError,
    fetchAudits,
    runAudit,
    getTotalSavings,
    getTotalInsightsCount,
    getCriticalIssuesCount,
    getAverageScore,
    getScoreTrend,
  } = useHistoricalAudit(profileId);

  useEffect(() => {
    if (profileId && activeTab === 'audit') {
      fetchAudits();
    }
  }, [profileId, activeTab, fetchAudits]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Performance insights, attribution, anomalies, and budget analysis
          </p>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          </TabsList>



          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  Daily, weekly, and monthly performance trends across your campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Performance dashboard coming soon</p>
                  <p className="text-sm">View detailed campaign and marketplace rollups</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attribution">
            <AttributionAnalytics dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>

          <TabsContent value="anomalies">
            <AnomaliesPanel />
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <Tabs defaultValue="pacing">
              <TabsList>
                <TabsTrigger value="pacing">Budget Pacing</TabsTrigger>
                <TabsTrigger value="forecast">AI Forecast</TabsTrigger>
              </TabsList>

              <TabsContent value="pacing" className="pt-4">
                <BudgetCopilotPanel />
              </TabsContent>

              <TabsContent value="forecast" className="pt-4">
                <BudgetForecastPanel profileId={profileId || undefined} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="audit">
            {connectionsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : !activeConnection ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    No Amazon Account Connected
                  </CardTitle>
                  <CardDescription>
                    Connect your Amazon Ads account to run a historical audit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <a href="/settings">Connect Amazon Account</a>
                  </Button>
                </CardContent>
              </Card>
            ) : auditLoading ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
                <Skeleton className="h-48" />
              </div>
            ) : auditError ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Error Loading Audit
                  </CardTitle>
                  <CardDescription>{auditError}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={runAudit}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : audits.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    No Audit Data Available
                  </CardTitle>
                  <CardDescription>
                    Run an audit to analyze your historical campaign performance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={runAudit} disabled={auditLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${auditLoading ? "animate-spin" : ""}`} />
                    Run Account Audit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <AuditSummary
                  totalSavings={getTotalSavings()}
                  totalInsights={getTotalInsightsCount()}
                  criticalIssues={getCriticalIssuesCount()}
                  monthsAnalyzed={audits.length}
                  averageScore={getAverageScore()}
                  scoreTrend={getScoreTrend()}
                />

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Monthly Breakdown</h2>
                  <Button variant="outline" onClick={runAudit} disabled={auditLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${auditLoading ? "animate-spin" : ""}`} />
                    Re-run Audit
                  </Button>
                </div>

                <div>
                  {audits.map((audit) => (
                    <AuditMonthCard key={audit.id} audit={audit} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-insights">
            <AIInsightsPanel />
          </TabsContent>

        </Tabs>
      </div>
    </DashboardShell>
  );
};

export default Analytics;
