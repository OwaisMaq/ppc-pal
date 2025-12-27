import DashboardShell from "@/components/DashboardShell";
import { ASINFilter } from "@/components/ASINFilter";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { DashboardChart } from "@/components/DashboardChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ComparisonModeSelector, ComparisonMode } from "@/components/ComparisonModeSelector";
import { SavingsKPI } from "@/components/SavingsKPI";
import { DataAvailabilityIndicator } from "@/components/DataAvailabilityIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useAmsMetrics } from "@/hooks/useAmsMetrics";
import { useSavingsMetric } from "@/hooks/useSavingsMetric";
import { useDataAvailability } from "@/hooks/useDataAvailability";
import { useState, useMemo } from "react";
import { DashboardKPIs as KPIData } from "@/hooks/useDashboardData";
import { DateRange } from "react-day-picker";
import { subDays, differenceInDays, subYears } from "date-fns";
import { CheckCircle, AlertTriangle, Bot, TrendingUp, TrendingDown } from "lucide-react";

const Overview = () => {
  const { connections } = useAmazonConnections();
  
  const hasConnections = connections.length > 0;
  
  const hasHealthyTokens = connections.some(c => {
    const status = typeof c?.status === 'string' ? c.status.toLowerCase().trim() : String(c?.status ?? '');
    const tokenOk = c?.token_expires_at ? new Date(c.token_expires_at) > new Date() : true;
    return tokenOk && (status === 'active' || status === 'setup_required' || status === 'pending');
  });
  
  const hasExpiredTokens = connections.some(c => {
    const tokenOk = c?.token_expires_at ? new Date(c.token_expires_at) > new Date() : true;
    return !tokenOk;
  });
  
  const [selectedASIN, setSelectedASIN] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("previous");
  const [customComparisonRange, setCustomComparisonRange] = useState<DateRange | undefined>();
  
  const primaryConnection = connections[0];
  
  const { metrics, loading: metricsLoading, error: metricsError } = useAmsMetrics(
    primaryConnection?.id,
    dateRange?.from,
    dateRange?.to
  );
  
  const { savings, loading: savingsLoading } = useSavingsMetric(
    primaryConnection?.profile_id,
    dateRange?.from,
    dateRange?.to
  );

  const { 
    minDate, 
    maxDate, 
    hasData, 
    loading: availabilityLoading, 
    importProgress, 
    importFullHistory, 
    isImportingFullHistory 
  } = useDataAvailability(primaryConnection?.profile_id);
  
  const comparisonPeriodRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    
    switch (comparisonMode) {
      case "previous":
        return {
          from: subDays(dateRange.from, daysDiff + 1),
          to: subDays(dateRange.from, 1),
        };
      
      case "last-year":
        return {
          from: subYears(dateRange.from, 1),
          to: subYears(dateRange.to, 1),
        };
      
      case "custom":
        return customComparisonRange;
      
      default:
        return undefined;
    }
  }, [dateRange, comparisonMode, customComparisonRange]);
  
  const { metrics: comparisonMetrics } = useAmsMetrics(
    primaryConnection?.id,
    comparisonPeriodRange?.from,
    comparisonPeriodRange?.to
  );
  
  const kpiData: KPIData | null = useMemo(() => {
    if (!metrics) return null;
    return {
      spend: metrics.totalSpend || 0,
      sales: metrics.totalSales || 0,
      acos: metrics.acos || 0,
      roas: metrics.roas || 0,
      clicks: metrics.totalClicks || 0,
      impressions: metrics.totalImpressions || 0,
      cpc: metrics.cpc || 0,
      ctr: metrics.ctr || 0,
      cvr: metrics.conversionRate || 0,
      conversions: metrics.totalOrders || 0
    };
  }, [metrics]);
  
  const comparisonKpiData: KPIData | null = useMemo(() => {
    if (!comparisonMetrics) return null;
    return {
      spend: comparisonMetrics.totalSpend || 0,
      sales: comparisonMetrics.totalSales || 0,
      acos: comparisonMetrics.acos || 0,
      roas: comparisonMetrics.roas || 0,
      clicks: comparisonMetrics.totalClicks || 0,
      impressions: comparisonMetrics.totalImpressions || 0,
      cpc: comparisonMetrics.cpc || 0,
      ctr: comparisonMetrics.ctr || 0,
      cvr: comparisonMetrics.conversionRate || 0,
      conversions: comparisonMetrics.totalOrders || 0
    };
  }, [comparisonMetrics]);

  // Determine what matters now based on metrics
  const getWhatMattersNow = () => {
    const items: { type: 'positive' | 'attention'; title: string; description: string }[] = [];
    
    if (savings && savings.totalSavings > 0) {
      items.push({
        type: 'positive',
        title: 'Savings Generated',
        description: `$${savings.totalSavings.toFixed(2)} saved through optimizations`
      });
    }
    
    if (kpiData && comparisonKpiData) {
      if (kpiData.acos < comparisonKpiData.acos) {
        items.push({
          type: 'positive',
          title: 'ACoS Improved',
          description: `ACoS decreased from ${comparisonKpiData.acos.toFixed(1)}% to ${kpiData.acos.toFixed(1)}%`
        });
      } else if (kpiData.acos > comparisonKpiData.acos * 1.1) {
        items.push({
          type: 'attention',
          title: 'ACoS Increased',
          description: `ACoS rose from ${comparisonKpiData.acos.toFixed(1)}% to ${kpiData.acos.toFixed(1)}%`
        });
      }
      
      if (kpiData.sales > comparisonKpiData.sales * 1.1) {
        items.push({
          type: 'positive',
          title: 'Sales Growing',
          description: `Sales up ${(((kpiData.sales - comparisonKpiData.sales) / comparisonKpiData.sales) * 100).toFixed(0)}% vs previous period`
        });
      }
    }
    
    return items;
  };

  const whatMattersNow = getWhatMattersNow();
  const positiveItems = whatMattersNow.filter(i => i.type === 'positive').slice(0, 3);
  const attentionItems = whatMattersNow.filter(i => i.type === 'attention').slice(0, 3);

  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Overview
            </h1>
            <p className="text-muted-foreground">
              Your Amazon Advertising performance at a glance
            </p>
          </div>
          
          {hasConnections && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
                  <DateRangePicker 
                    value={dateRange}
                    onChange={setDateRange}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Filter by ASIN:</span>
                  <ASINFilter 
                    selectedASIN={selectedASIN}
                    onASINChange={setSelectedASIN}
                  />
                </div>
              </div>
              
              <ComparisonModeSelector 
                mode={comparisonMode}
                onModeChange={setComparisonMode}
                customRange={customComparisonRange}
                onCustomRangeChange={setCustomComparisonRange}
              />
            </div>
          )}

          <DataAvailabilityIndicator
            minDate={minDate}
            maxDate={maxDate}
            hasData={hasData}
            loading={availabilityLoading}
            selectedFrom={dateRange?.from}
            selectedTo={dateRange?.to}
            importProgress={importProgress}
            onImportFullHistory={importFullHistory}
            isImportingFullHistory={isImportingFullHistory}
          />
        </div>

        {/* What Matters Now */}
        {hasConnections && (positiveItems.length > 0 || attentionItems.length > 0) && (
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">What Matters Now</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {positiveItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <TrendingUp className="h-4 w-4 text-success" />
                        Positive Outcomes
                      </div>
                      {positiveItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-success/10 border border-success/20">
                          <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {attentionItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <TrendingDown className="h-4 w-4 text-warning" />
                        Requires Attention
                      </div>
                      {attentionItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
                          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {positiveItems.length === 0 && attentionItems.length === 0 && (
                    <div className="col-span-2 flex items-center gap-2 p-4 rounded-md bg-muted/50 text-center justify-center">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm text-muted-foreground">Everything looks good! No action required.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Automation Status */}
        {hasConnections && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Automation Status</p>
                      <p className="text-sm text-muted-foreground">Manage your automation rules and actions</p>
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link to="/automate">Manage Automation</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Savings KPI */}
        {hasConnections && savings && (
          <div className="mb-6">
            <SavingsKPI
              totalSavings={savings.totalSavings}
              negativeKeywordsSavings={savings.negativeKeywordsSavings}
              pausedTargetsSavings={savings.pausedTargetsSavings}
              bidOptimizationSavings={savings.bidOptimizationSavings}
              acosImprovementSavings={savings.acosImprovementSavings}
              actionCount={savings.actionCount}
              loading={savingsLoading}
            />
          </div>
        )}

        {/* KPI Summary Cards */}
        {hasConnections && (
          <div className="mb-6">
            <DashboardKPIs 
              data={kpiData}
              loading={metricsLoading}
              error={metricsError}
              previousData={comparisonKpiData}
              timeseries={metrics?.timeseries}
            />
          </div>
        )}

        {/* Trend Charts */}
        {hasConnections && (
          <div className="mb-6">
            <DashboardChart
              data={{ points: metrics?.timeseries || [] }}
              loading={metricsLoading}
              error={metricsError}
              granularity="day"
            />
          </div>
        )}

        <div className="space-y-6">
          {!hasConnections && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-800">
                  No Amazon connections found. Please connect your account in Settings.
                </p>
                <div className="mt-3">
                  <Button asChild>
                    <Link to="/settings">Go to Settings</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {hasConnections && hasExpiredTokens && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-800">
                  Your Amazon connection has expired. You can still view historical data, but you'll need to refresh your connection to sync new data.
                </p>
                <div className="mt-3">
                  <Button asChild variant="outline">
                    <Link to="/settings">Refresh Connection</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default Overview;
