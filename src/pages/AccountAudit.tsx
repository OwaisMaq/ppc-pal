import { useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ClipboardList, AlertTriangle } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useHistoricalAudit } from "@/hooks/useHistoricalAudit";
import { AuditSummary } from "@/components/AuditSummary";
import { AuditMonthCard } from "@/components/AuditMonthCard";

export default function AccountAudit() {
  const { connections, loading: connectionsLoading } = useAmazonConnections();
  const activeConnection = connections?.[0];
  const profileId = activeConnection?.profile_id || null;

  const {
    audits,
    loading,
    error,
    fetchAudits,
    runAudit,
    getTotalSavings,
    getTotalInsightsCount,
    getCriticalIssuesCount,
    getAverageScore,
    getScoreTrend,
  } = useHistoricalAudit(profileId);

  useEffect(() => {
    if (profileId) {
      fetchAudits();
    }
  }, [profileId, fetchAudits]);

  const renderContent = () => {
    if (connectionsLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      );
    }

    if (!activeConnection) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              No Amazon Account Connected
            </CardTitle>
            <CardDescription>
              Connect your Amazon Ads account to run a historical audit of your PPC performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/settings">Connect Amazon Account</a>
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (loading) {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      );
    }

    if (error) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Audit
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runAudit}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (audits.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              No Audit Data Available
            </CardTitle>
            <CardDescription>
              Run an audit to analyze your historical campaign performance and identify optimization opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runAudit} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Run Account Audit
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
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
          <Button variant="outline" onClick={runAudit} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Re-run Audit
          </Button>
        </div>

        <div>
          {audits.map((audit) => (
            <AuditMonthCard key={audit.id} audit={audit} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Audit</h1>
          <p className="text-muted-foreground">
            AI-powered analysis of your historical PPC performance with actionable recommendations.
          </p>
        </div>

        {renderContent()}
      </div>
    </DashboardShell>
  );
}
