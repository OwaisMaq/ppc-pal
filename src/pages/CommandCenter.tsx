import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { DashboardChart } from "@/components/DashboardChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ComparisonModeSelector, ComparisonMode } from "@/components/ComparisonModeSelector";
import { SavingsKPI } from "@/components/SavingsKPI";
import { DataAvailabilityIndicator } from "@/components/DataAvailabilityIndicator";
import { ASINFilter } from "@/components/ASINFilter";
import PendingApprovals from "@/components/PendingApprovals";
import ActionsFeed from "@/components/ActionsFeed";
import {
  AccountHealthCard,
  WhatMattersNow,
  ActiveAlertsCard,
  AutomationSummaryCard,
  ConfidenceSignalsCard,
  OnboardingGuidanceCard,
  OverviewFilters,
  getDefaultSetupItems,
  getMarketplaceName,
  type HealthStatus,
  type AutomationStatus,
  type MatterItem,
  type ActiveAlert,
  type DatePreset,
  type MarketplaceOption,
  type BrandOption
} from "@/components/overview";

import { DashboardKPIs as KPIData } from "@/hooks/useDashboardData";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Bell,
  Lightbulb,
  Activity
} from "lucide-react";

const CommandCenter = () => {
  const [activeTab, setActiveTab] = useState("overview");
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

  // What Matters Now items
  const whatMattersNowItems: MatterItem[] = useMemo(() => {
    const items: MatterItem[] = [];
    
    if (savings && savings.totalSavings > 0) {
      items.push({
        id: 'savings',
        type: 'positive',
        title: 'Savings Generated',
        description: `$${savings.totalSavings.toFixed(2)} saved through optimizations`,
        details: `From ${savings.actionCount} AI actions in this period`,
        link: { label: 'View details', to: '/analytics' }
      });
    }
    
    if (metrics && comparisonMetrics) {
      if (metrics.acos < comparisonMetrics.acos) {
        const improvement = ((comparisonMetrics.acos - metrics.acos) / comparisonMetrics.acos * 100).toFixed(0);
        items.push({
          id: 'acos-improved',
          type: 'positive',
          title: 'ACoS Improved',
          description: `Decreased ${improvement}% from ${comparisonMetrics.acos.toFixed(1)}% to ${metrics.acos.toFixed(1)}%`,
          link: { label: 'View trends', to: '/analytics' }
        });
      } else if (metrics.acos > comparisonMetrics.acos * 1.1) {
        items.push({
          id: 'acos-increased',
          type: 'attention',
          title: 'ACoS Increased',
          description: `Rose from ${comparisonMetrics.acos.toFixed(1)}% to ${metrics.acos.toFixed(1)}%`,
          details: 'Consider reviewing your targeting and bids',
          link: { label: 'Review campaigns', to: '/campaigns' }
        });
      }
      
      if (metrics.totalSales > comparisonMetrics.totalSales * 1.1) {
        const growth = ((metrics.totalSales - comparisonMetrics.totalSales) / comparisonMetrics.totalSales * 100).toFixed(0);
        items.push({
          id: 'sales-growing',
          type: 'positive',
          title: 'Sales Growing',
          description: `Up ${growth}% vs previous period`,
          link: { label: 'View report', to: '/analytics' }
        });
      }
    }
    
    const newAnomalies = anomalies?.filter(a => a.state === 'new' && a.severity !== 'info').slice(0, 2);
    newAnomalies?.forEach(anomaly => {
      items.push({
        id: `anomaly-${anomaly.id}`,
        type: 'attention',
        title: `${anomaly.metric} ${anomaly.direction === 'spike' ? 'Spike' : 'Dip'}`,
        description: `${anomaly.severity === 'critical' ? 'Critical' : 'Warning'}: ${anomaly.metric} ${anomaly.direction}`,
        details: `Current: ${anomaly.value.toFixed(2)}, Baseline: ${anomaly.baseline.toFixed(2)}`,
        link: { label: 'View anomalies', to: '/analytics' }
      });
    });
    
    return items;
  }, [savings, metrics, comparisonMetrics, anomalies]);

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

  // Automation summary
  const automationSummary = useMemo(() => {
    if (!actions || actions.length === 0) return null;
    
    const appliedActions = actions.filter(a => a.status === 'applied');
    const preventedActions = actions.filter(a => a.status === 'prevented' || a.status === 'rejected');
    const skippedActions = actions.filter(a => a.status === 'skipped');
    const lastRun = actions[0]?.created_at;
    
    return {
      lastRunAt: lastRun,
      rulesEvaluated: rules?.length || 0,
      actionsApplied: appliedActions.length,
      actionsPrevented: preventedActions.length,
      actionsSkipped: skippedActions.length,
      recentActions: actions.slice(0, 5).map(a => ({
        id: a.id,
        type: a.action_type,
        target: (a.payload as any)?.targetName || (a.payload as any)?.campaignName || 'Unknown',
        status: (a.status === 'applied' ? 'applied' : 
                a.status === 'prevented' || a.status === 'rejected' ? 'prevented' : 'skipped') as 'applied' | 'prevented' | 'skipped',
        reason: a.error || undefined
      }))
    };
  }, [actions, rules]);

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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
            <p className="text-muted-foreground">Your Amazon Advertising control hub</p>
          </div>
          {pendingActionsCount > 0 && (
            <Button 
              variant="default" 
              className="gap-2"
              onClick={() => setActiveTab("suggestions")}
            >
              <Lightbulb className="h-4 w-4" />
              {pendingActionsCount} Suggestions Pending
            </Button>
          )}
        </div>

        {/* Quick Stats Row */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'overview' ? 'border-primary ring-1 ring-primary/20' : 'hover:border-muted-foreground/50'}`}
            onClick={() => setActiveTab('overview')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">
                {healthStatus === 'healthy' ? '✓' : healthStatus === 'watch' ? '⚠' : '!'}
              </div>
              <p className="text-xs text-muted-foreground capitalize">{healthStatus.replace('_', ' ')}</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'metrics' ? 'border-primary ring-1 ring-primary/20' : 'hover:border-muted-foreground/50'}`}
            onClick={() => setActiveTab('metrics')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Metrics</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{metrics?.acos?.toFixed(1) || '0'}%</div>
              <p className="text-xs text-muted-foreground">Current ACoS</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'suggestions' ? 'border-primary ring-1 ring-primary/20' : 'hover:border-muted-foreground/50'}`}
            onClick={() => setActiveTab('suggestions')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Suggestions</CardTitle>
                <Lightbulb className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{pendingActionsCount}</div>
              <p className="text-xs text-muted-foreground">Pending actions</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'activity' ? 'border-primary ring-1 ring-primary/20' : 'hover:border-muted-foreground/50'}`}
            onClick={() => setActiveTab('activity')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{automationSummary?.actionsApplied || 0}</div>
              <p className="text-xs text-muted-foreground">Actions today</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {hasConnections && (
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex items-center gap-3">
              <DateRangePicker 
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
            <div className="flex items-center gap-3">
              <ASINFilter 
                selectedASIN={selectedASIN}
                onASINChange={setSelectedASIN}
              />
            </div>
            <ComparisonModeSelector 
              mode={comparisonMode}
              onModeChange={setComparisonMode}
              customRange={customComparisonRange}
              onCustomRangeChange={setCustomComparisonRange}
            />
          </div>
        )}

        {/* Data Availability */}
        {hasConnections && (
          <DataAvailabilityIndicator
            minDate={minDate}
            maxDate={maxDate}
            hasData={hasData}
            loading={availabilityLoading}
            importProgress={importProgress}
          />
        )}

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2 relative">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Suggestions</span>
              {pendingActionsCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-[10px] flex items-center justify-center">
                  {pendingActionsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {hasConnections ? (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
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
                  <WhatMattersNow 
                    items={whatMattersNowItems}
                    loading={isLoading}
                  />
                </div>
                <div className="space-y-6">
                  <ActiveAlertsCard
                    alerts={activeAlerts}
                    loading={alertsLoading}
                  />
                  <AutomationSummaryCard
                    summary={automationSummary}
                    loading={actionsLoading || rulesLoading}
                  />
                  <ConfidenceSignalsCard
                    riskLevel={confidenceSignals.riskLevel}
                    riskScore={confidenceSignals.riskScore}
                    confidenceScore={confidenceSignals.confidenceScore}
                    daysSinceManualIntervention={confidenceSignals.daysSinceManualIntervention}
                    loading={isLoading}
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
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            {hasConnections && savings && (
              <SavingsKPI
                totalSavings={savings.totalSavings}
                negativeKeywordsSavings={savings.negativeKeywordsSavings}
                pausedTargetsSavings={savings.pausedTargetsSavings}
                bidOptimizationSavings={savings.bidOptimizationSavings}
                acosImprovementSavings={savings.acosImprovementSavings}
                actionCount={savings.actionCount}
                loading={savingsLoading}
              />
            )}
            {hasConnections && (
              <DashboardKPIs 
                data={kpiData}
                loading={metricsLoading}
                error={metricsError}
                previousData={comparisonKpiData}
                timeseries={metrics?.timeseries}
              />
            )}
            {hasConnections && (
              <DashboardChart
                data={{ points: metrics?.timeseries || [] }}
                loading={metricsLoading}
                error={metricsError}
                granularity="day"
              />
            )}
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
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">AI Suggestions</h2>
                <p className="text-sm text-muted-foreground">
                  Review and approve optimization recommendations from PPC Pal
                </p>
              </div>
              <PendingApprovals />
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">Recent Activity</h2>
                <p className="text-sm text-muted-foreground">
                  All automation actions and changes
                </p>
              </div>
              <ActionsFeed />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
};

export default CommandCenter;
