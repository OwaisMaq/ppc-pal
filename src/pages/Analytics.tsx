import { useState, useMemo, useEffect } from "react";
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
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { DashboardChart } from "@/components/DashboardChart";
import { PerformanceFilters, TimePeriod, ACOSTrendChart, CampaignTypeMixChart } from "@/components/analytics";
import { TrustReportCard } from "@/components/overview/TrustReportCard";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useHistoricalAudit } from "@/hooks/useHistoricalAudit";
import { useAmsMetrics } from "@/hooks/useAmsMetrics";
import { useActionOutcomes } from "@/hooks/useActionOutcomes";
import { useSavingsMetric } from "@/hooks/useSavingsMetric";
import { 
  AlertTriangle, 
  ClipboardList,
  RefreshCw 
} from "lucide-react";
import { subDays, subHours, format } from "date-fns";


const Analytics = () => {
  const [activeTab, setActiveTab] = useState("performance");
  const { connections, loading: connectionsLoading } = useAmazonConnections();
  const activeConnection = connections?.[0];
  const profileId = activeConnection?.profile_id || null;

  // Performance tab state
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const [selectedASIN, setSelectedASIN] = useState<string | null>(null);

  // Calculate date range based on period - memoize Date objects to prevent re-renders
  const { fromDate, toDate, from, to } = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '24h':
        startDate = subHours(now, 24);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subDays(now, 7);
    }
    
    return {
      fromDate: startDate,
      toDate: now,
      from: format(startDate, 'yyyy-MM-dd'),
      to: format(now, 'yyyy-MM-dd'),
    };
  }, [period]);

  // Fetch AMS metrics for performance tab
  const { 
    metrics: amsMetrics, 
    entityData: campaignData,
    loading: amsLoading, 
    error: amsError 
  } = useAmsMetrics(activeConnection?.id, fromDate, toDate);

  // Derive chart granularity from period
  const granularity = period === '30d' ? 'week' : 'day';

  // Transform AMS metrics to DashboardKPIs format
  const kpiData = useMemo(() => {
    if (!amsMetrics) return null;
    return {
      spend: amsMetrics.totalSpend,
      sales: amsMetrics.totalSales,
      acos: amsMetrics.acos,
      roas: amsMetrics.roas,
      clicks: amsMetrics.totalClicks,
      impressions: amsMetrics.totalImpressions,
      cpc: amsMetrics.cpc,
      ctr: amsMetrics.ctr,
      cvr: amsMetrics.conversionRate,
      conversions: amsMetrics.totalOrders,
    };
  }, [amsMetrics]);

  // Transform timeseries for chart
  const chartData = useMemo(() => {
    if (!amsMetrics?.timeseries) return { points: [] };
    return {
      points: amsMetrics.timeseries.map(point => ({
        date: point.date,
        spend: point.spend,
        sales: point.sales,
        clicks: point.clicks,
        impressions: point.impressions,
      })),
    };
  }, [amsMetrics?.timeseries]);

  // Calculate campaign type mix from entity data
  const campaignTypeMix = useMemo(() => {
    if (!campaignData || campaignData.length === 0) return null;
    
    const typeMap: Record<string, number> = {};
    campaignData.forEach(entity => {
      if (entity.entityType === 'campaign') {
        const campaignType = entity.campaign_type || 'sponsoredProducts';
        typeMap[campaignType] = (typeMap[campaignType] || 0) + (entity.spend || 0);
      }
    });
    
    return Object.entries(typeMap).map(([type, spend]) => ({ type, spend }));
  }, [campaignData]);

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

  // Automation tab data
  const { stats: outcomeStats, loading: outcomesLoading } = useActionOutcomes();
  const { savings, loading: savingsLoading } = useSavingsMetric(profileId, fromDate, toDate);

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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            {/* Filters */}
            <PerformanceFilters
              period={period}
              onPeriodChange={setPeriod}
              selectedASIN={selectedASIN}
              onASINChange={setSelectedASIN}
            />

            {/* KPI Cards */}
            <DashboardKPIs
              data={kpiData}
              loading={amsLoading}
              error={amsError}
              previousData={null}
              timeseries={amsMetrics?.timeseries}
            />

            {/* Main Trend Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Spend vs Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardChart 
                  data={chartData} 
                  loading={amsLoading} 
                  error={amsError}
                  granularity={granularity}
                />
              </CardContent>
            </Card>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ACOSTrendChart 
                data={amsMetrics?.timeseries || null} 
                loading={amsLoading} 
              />
              <CampaignTypeMixChart 
                data={campaignTypeMix} 
                loading={amsLoading} 
              />
            </div>
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <TrustReportCard
              stats={outcomeStats}
              totalSavings={savings?.totalSavings || 0}
              actionCount={savings?.actionCount || 0}
              loading={outcomesLoading || savingsLoading}
            />
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
