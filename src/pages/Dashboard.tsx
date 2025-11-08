import DashboardShell from "@/components/DashboardShell";
import { ASINFilter } from "@/components/ASINFilter";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { DashboardChart } from "@/components/DashboardChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ComparisonModeSelector, ComparisonMode } from "@/components/ComparisonModeSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useAmsMetrics } from "@/hooks/useAmsMetrics";
import { useState, useMemo } from "react";
import { DashboardKPIs as KPIData } from "@/hooks/useDashboardData";
import { DateRange } from "react-day-picker";
import { subDays, differenceInDays, subYears } from "date-fns";
const Dashboard = () => {
  const { connections } = useAmazonConnections();
  
  // Check if there are ANY connections (even expired ones)
  const hasConnections = connections.length > 0;
  
  // Check if tokens are healthy (not expired)
  const hasHealthyTokens = connections.some(c => {
    const status = typeof c?.status === 'string' ? c.status.toLowerCase().trim() : String(c?.status ?? '');
    const tokenOk = c?.token_expires_at ? new Date(c.token_expires_at) > new Date() : true;
    return tokenOk && (status === 'active' || status === 'setup_required' || status === 'pending');
  });
  
  // Check if any tokens are expired
  const hasExpiredTokens = connections.some(c => {
    const tokenOk = c?.token_expires_at ? new Date(c.token_expires_at) > new Date() : true;
    return !tokenOk;
  });
  
  const [selectedASIN, setSelectedASIN] = useState<string | null>(null);
  
  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("previous");
  const [customComparisonRange, setCustomComparisonRange] = useState<DateRange | undefined>();
  
  // Get first connection for metrics
  const primaryConnection = connections[0];
  
  // Fetch current period metrics
  const { metrics, loading: metricsLoading, error: metricsError } = useAmsMetrics(
    primaryConnection?.id,
    dateRange?.from,
    dateRange?.to
  );
  
  // Calculate comparison period based on mode
  const comparisonPeriodRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    
    switch (comparisonMode) {
      case "previous":
        // Previous period (existing behavior)
        return {
          from: subDays(dateRange.from, daysDiff + 1),
          to: subDays(dateRange.from, 1),
        };
      
      case "last-year":
        // Same period last year
        return {
          from: subYears(dateRange.from, 1),
          to: subYears(dateRange.to, 1),
        };
      
      case "custom":
        // User-defined custom range
        return customComparisonRange;
      
      default:
        return undefined;
    }
  }, [dateRange, comparisonMode, customComparisonRange]);
  
  // Fetch comparison period metrics
  const { metrics: comparisonMetrics } = useAmsMetrics(
    primaryConnection?.id,
    comparisonPeriodRange?.from,
    comparisonPeriodRange?.to
  );
  
  // Map AMS metrics to KPI format
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
  
  // Map comparison period metrics
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
  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              PPC Automation Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor and manage your Amazon Advertising campaigns
            </p>
          </div>
          
          {/* Filters Row */}
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
        </div>

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

export default Dashboard;