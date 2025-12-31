import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { subDays, differenceInDays, subYears } from "date-fns";

// Hooks
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useAmsMetrics } from "@/hooks/useAmsMetrics";
import { useSavingsMetric } from "@/hooks/useSavingsMetric";
import { useDataAvailability } from "@/hooks/useDataAvailability";
import { useAutomationRules, useAlerts } from "@/hooks/useAutomation";
import { useAnomalies } from "@/hooks/useAnomalies";
import { useActionQueue } from "@/hooks/useActionQueue";
import { useSearchStudio } from "@/hooks/useSearchStudio";
import { useActionsFeed } from "@/hooks/useActionsFeed";
import { useAccountHealth } from "@/hooks/useAccountHealth";

// Components

import { DateRangePicker } from "@/components/DateRangePicker";
import { ComparisonModeSelector, ComparisonMode } from "@/components/ComparisonModeSelector";
import { DataAvailabilityIndicator } from "@/components/DataAvailabilityIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { ASINFilter } from "@/components/ASINFilter";
import PendingApprovals from "@/components/PendingApprovals";
import ActionsFeed from "@/components/ActionsFeed";
import {
  AccountHealthCard,
  ActiveAlertsCard,
  OnboardingGuidanceCard,
  getDefaultSetupItems,
  getMarketplaceName,
  type HealthStatus,
  type AutomationStatus,
  type ActiveAlert,
  type DatePreset,
  type MarketplaceOption,
  type BrandOption
} from "@/components/overview";

import { DashboardKPIs as KPIData } from "@/hooks/useDashboardData";
import { Lightbulb, Activity } from "lucide-react";

const CommandCenter = () => {
  const { connections } = useAmazonConnections();
  
  const hasConnections = connections.length > 0;
  const hasExpiredTokens = connections.some(c => {
    const tokenOk = c?.token_expires_at ? new Date(c.token_expires_at) > new Date() : true;
    return !tokenOk;
  });
  
  const [selectedASIN, setSelectedASIN] = useState<string | null>(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('last_month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("previous");
  const [customComparisonRange, setCustomComparisonRange] = useState<DateRange | undefined>();
  
  const primaryConnection = connections[0];
  const profileId = primaryConnection?.profile_id;
  
  // Derive marketplaces from connections
  const marketplaceOptions: MarketplaceOption[] = useMemo(() => {
    const uniqueMarketplaces = new Map<string, string>();
    connections.forEach(conn => {
      if (conn.marketplace_id) {
        uniqueMarketplaces.set(conn.marketplace_id, getMarketplaceName(conn.marketplace_id));
      }
    });
    return Array.from(uniqueMarketplaces.entries()).map(([id, name]) => ({ id, name }));
  }, [connections]);
  
  // Fetch brand terms
  const { brandTerms, fetchBrandTerms } = useSearchStudio();
  const brandTermsFetchedRef = useRef(false);
  
  useEffect(() => {
    if (profileId && !brandTermsFetchedRef.current) {
      brandTermsFetchedRef.current = true;
      fetchBrandTerms(profileId);
    }
  }, [profileId, fetchBrandTerms]);
  
  const brandOptions: BrandOption[] = useMemo(() => {
    return brandTerms.map(bt => ({ id: bt.id, term: bt.term }));
  }, [brandTerms]);
  
  // Fetch metrics
  const { metrics, loading: metricsLoading, error: metricsError } = useAmsMetrics(
    primaryConnection?.id,
    dateRange?.from,
    dateRange?.to
  );
  
  // Calculate comparison period
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
  
  // Fetch savings
  const { savings, loading: savingsLoading } = useSavingsMetric(
    profileId,
    dateRange?.from,
    dateRange?.to
  );

  // Fetch data availability
  const { 
    minDate, 
    maxDate, 
    hasData, 
    loading: availabilityLoading, 
    importProgress
  } = useDataAvailability(profileId);
  
  // Fetch automation data
  const { rules, loading: rulesLoading } = useAutomationRules(profileId);
  const { alerts, loading: alertsLoading, refetch: refetchAlerts } = useAlerts(profileId);
  const { actions, loading: actionsLoading } = useActionQueue(profileId);
  const { actions: feedActions } = useActionsFeed(50);
  
  // Fetch anomalies
  const { anomalies, loading: anomaliesLoading, fetchAnomalies } = useAnomalies();
  const dataFetchedRef = useRef(false);
  
  useEffect(() => {
    if (profileId && !dataFetchedRef.current) {
      dataFetchedRef.current = true;
      refetchAlerts();
      fetchAnomalies({ profileId, state: 'new' });
    }
  }, [profileId]); // Only depend on profileId, use ref to prevent re-fetching

  // Pending actions count
  const pendingActionsCount = feedActions.filter(a => a.status === 'queued').length;

  // Map metrics to KPI format
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

  // Calculate account health using the new comprehensive hook
  const { 
    status: healthStatus, 
    score: healthScore,
    reasons: healthReasons,
    signals: healthSignals 
  } = useAccountHealth(profileId, {
    alerts: alerts?.map(a => ({ level: a.level, state: a.state })),
    rules: rules?.map(r => ({ enabled: r.enabled })),
    anomalies: anomalies?.map(a => ({ severity: a.severity, state: a.state })),
    lastSyncAt: primaryConnection?.last_sync_at,
    currentAcos: metrics?.acos,
    targetAcos: 25, // Default target, could be fetched from settings
    recentActionFailures: actions?.filter(a => a.status === 'failed').length,
  });

  // Automation status (derived from health signals for consistency)
  const automationStatus: AutomationStatus = useMemo(() => {
    if (healthSignals.automationPaused) return 'paused';
    if (healthSignals.totalRulesCount === 0) return 'paused';
    if (healthSignals.enabledRulesCount === 0) return 'paused';
    if (healthSignals.enabledRulesCount < healthSignals.totalRulesCount) return 'limited';
    return 'on';
  }, [healthSignals]);


  // Active alerts
  const activeAlerts: ActiveAlert[] = useMemo(() => {
    if (!alerts) return [];
    return alerts
      .filter(a => a.state === 'new')
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        type: a.title.toLowerCase().includes('acos') ? 'acos' as const :
              a.title.toLowerCase().includes('spend') ? 'spend' as const : 'other' as const,
        level: a.level as 'info' | 'warn' | 'critical',
        title: a.title,
        message: a.message,
        entityName: a.entity_id || undefined,
        createdAt: a.created_at
      }));
  }, [alerts]);


  // Confidence signals
  const confidenceSignals = useMemo(() => {
    const riskScore = healthStatus === 'healthy' ? 20 : healthStatus === 'watch' ? 50 : 80;
    const riskLevel = healthStatus === 'healthy' ? 'low' as const : 
                      healthStatus === 'watch' ? 'medium' as const : 'high' as const;
    
    const hasEnoughData = hasData && minDate;
    const dataAge = minDate ? differenceInDays(new Date(), new Date(minDate)) : 0;
    const confidenceScore = hasEnoughData ? Math.min(90, 50 + dataAge * 2) : 30;
    const daysSinceManualIntervention = actions?.some(a => a.status === 'reverted') ? 2 : null;
    
    return { riskLevel, riskScore, confidenceScore, daysSinceManualIntervention };
  }, [healthStatus, hasData, minDate, actions]);

  // Setup items
  const setupItems = useMemo(() => {
    return getDefaultSetupItems({
      hasConnection: hasConnections,
      hasRules: (rules?.filter(r => r.enabled).length || 0) > 0,
      hasTarget: true,
      hasHistoricalData: hasData
    });
  }, [hasConnections, rules, hasData]);

  // Automation explainer
  const automationExplainer = useMemo(() => {
    if (!rules || rules.length === 0) return undefined;
    const enabledRules = rules.filter(r => r.enabled);
    if (enabledRules.length === 0) return undefined;
    
    const ruleTypes = enabledRules.map(r => r.rule_type);
    const hasNegativeKw = ruleTypes.some(t => t.includes('negative'));
    const hasBidOpt = ruleTypes.some(t => t.includes('bid'));
    const hasPause = ruleTypes.some(t => t.includes('pause'));
    
    const descriptions: string[] = [];
    if (hasNegativeKw) descriptions.push('adding negative keywords to reduce wasted spend');
    if (hasBidOpt) descriptions.push('optimizing bids based on performance');
    if (hasPause) descriptions.push('pausing underperforming targets');
    
    if (descriptions.length === 0) return `Running ${enabledRules.length} automation rules`;
    return `PPC Pal is ${descriptions.join(', ')}.`;
  }, [rules]);

  const isLoading = metricsLoading || savingsLoading || rulesLoading || alertsLoading;
  const showOnboarding = !hasConnections || setupItems.some(i => !i.completed);

  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Top Bar: Filters + Data Availability */}
        {hasConnections && (
          <div className="flex items-center gap-3 pb-4 border-b overflow-x-auto">
            <DateRangePicker 
              value={dateRange}
              onChange={setDateRange}
            />
            <ASINFilter 
              selectedASIN={selectedASIN}
              onASINChange={setSelectedASIN}
            />
            <ComparisonModeSelector 
              mode={comparisonMode}
              onModeChange={setComparisonMode}
              customRange={customComparisonRange}
              onCustomRangeChange={setCustomComparisonRange}
            />
            <div className="ml-auto shrink-0">
              <DataAvailabilityIndicator
                minDate={minDate}
                maxDate={maxDate}
                hasData={hasData}
                loading={availabilityLoading}
                importProgress={importProgress}
              />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
            <p className="text-muted-foreground">Your Amazon Advertising control hub</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Confidence signals as subtle inline badges */}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${
                confidenceSignals.riskLevel === 'low' ? 'border-success/30 text-success' :
                confidenceSignals.riskLevel === 'medium' ? 'border-warning/30 text-warning' :
                'border-destructive/30 text-destructive'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  confidenceSignals.riskLevel === 'low' ? 'bg-success' :
                  confidenceSignals.riskLevel === 'medium' ? 'bg-warning' :
                  'bg-destructive'
                }`} />
                {confidenceSignals.riskLevel === 'low' ? 'Low Risk' : 
                 confidenceSignals.riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-muted-foreground">
                {confidenceSignals.confidenceScore}% confidence
              </span>
            </div>
            {pendingActionsCount > 0 && (
              <Badge variant="destructive" className="text-sm px-3 py-1">
                {pendingActionsCount} Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        {hasConnections ? (
          <div className="space-y-8">
            {/* Overview Section */}
            <div className="space-y-6">
              <AccountHealthCard
                healthStatus={healthStatus}
                healthReasons={healthReasons}
                savings={savings?.totalSavings || 0}
                spend={metrics?.totalSpend || 0}
                sales={metrics?.totalSales || 0}
                currentAcos={metrics?.acos || 0}
                targetAcos={20}
                automationStatus={automationStatus}
                loading={isLoading}
              />
              
              <div className="grid gap-6 md:grid-cols-2">
                <ActiveAlertsCard
                  alerts={activeAlerts}
                  loading={alertsLoading}
                />
                {showOnboarding && (
                  <OnboardingGuidanceCard
                    items={setupItems}
                    automationExplainer={automationExplainer}
                    loading={rulesLoading}
                  />
                )}
              </div>
            </div>

            {hasExpiredTokens && (
              <Card className="border-warning/20 bg-warning/5">
                <CardContent className="pt-6">
                  <p className="text-sm text-warning-foreground">
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

            {/* Suggestions Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">AI Suggestions</h2>
                  <p className="text-sm text-muted-foreground">
                    Review and approve optimization recommendations
                  </p>
                </div>
              </div>
              <PendingApprovals />
            </div>

            {/* Activity Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                  <p className="text-sm text-muted-foreground">
                    All automation actions and changes
                  </p>
                </div>
              </div>
              <ActionsFeed />
            </div>
          </div>
        ) : (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="pt-6">
              <p className="text-sm text-warning-foreground mb-4">
                No Amazon connections found. Please connect your account to get started.
              </p>
              <Button asChild>
                <Link to="/settings">Connect Amazon Account</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
};

export default CommandCenter;
