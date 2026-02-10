import { useState, useMemo, useEffect, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { subDays, differenceInDays } from "date-fns";

// Hooks
import { useGlobalFilters } from "@/context/GlobalFiltersContext";
import { useAggregatedMetrics } from "@/hooks/useAggregatedMetrics";
import { useSavingsMetric } from "@/hooks/useSavingsMetric";
import { useAutomationRules, useAlerts } from "@/hooks/useAutomation";
import { useAnomalies } from "@/hooks/useAnomalies";
import { useActionQueue } from "@/hooks/useActionQueue";
import { useSearchStudio } from "@/hooks/useSearchStudio";
import { useActionsFeed } from "@/hooks/useActionsFeed";
import { useAccountHealth } from "@/hooks/useAccountHealth";
import { useAsinAutomationStats } from "@/hooks/useAsinAutomationStats";
import { useBidOptimizerStatus } from "@/hooks/useBidOptimizerStatus";

// Components
import { Skeleton } from "@/components/ui/skeleton";
import PendingApprovals from "@/components/PendingApprovals";
import ActionsFeed from "@/components/ActionsFeed";
import { ReportIssueButton } from "@/components/ui/ReportIssueButton";
import {
  AccountHealthCard,
  ActiveAlertsCard,
  OnboardingGuidanceCard,
  HistoricalPerformanceChart,
  getDefaultSetupItems,
  getMarketplaceName,
  type HealthStatus,
  type AutomationStatus,
  type ActiveAlert,
  type DatePreset,
  type MarketplaceOption,
  type BrandOption,
  MultiAccountBreakdown,
} from "@/components/overview";
import ConfidenceMeter from "@/components/ui/ConfidenceMeter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { DashboardKPIs as KPIData } from "@/hooks/useDashboardData";
import { ClipboardCheck, Activity } from "lucide-react";

const CommandCenter = () => {
  const { connections, activeConnection, selectedProfileId, isMultiAccountMode, baseCurrency } = useGlobalFilters();
  
  const hasConnections = connections.length > 0;
  const hasExpiredTokens = connections.some(c => {
    const tokenOk = c?.token_expires_at ? new Date(c.token_expires_at) > new Date() : true;
    return !tokenOk;
  });
  
  const [selectedASIN, setSelectedASIN] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [dateRangePreset, setDateRangePreset] = useState<'24h' | '7d' | '30d'>('30d');
  
  // Use the global profile instead of local marketplace selection
  const primaryConnection = activeConnection;
  const profileId = primaryConnection?.profile_id;
  
  // Derive date range from preset
  const dateRange = useMemo(() => {
    const to = new Date();
    const daysMap = { '24h': 1, '7d': 7, '30d': 30 };
    const from = subDays(to, daysMap[dateRangePreset]);
    return { from, to };
  }, [dateRangePreset]);
  
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
  
  // ASIN automation stats
  const { autoOptimizedAsins, totalAsins } = useAsinAutomationStats(profileId);
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
  
  // Fetch aggregated metrics across all (or filtered) connections
  const { metrics, loading: metricsLoading, error: metricsError, connectionCount } = useAggregatedMetrics(
    connections,
    activeConnection?.marketplace_id || null,
    dateRange?.from,
    dateRange?.to
  );
  
  
  // Fetch savings
  const { savings, loading: savingsLoading } = useSavingsMetric(
    profileId,
    dateRange?.from,
    dateRange?.to
  );

  // Fetch data availability
  // We still need hasData and minDate for confidence signals calculation
  const hasData = true; // Simplified since we're not showing the data availability indicator
  const minDate: string | null = primaryConnection?.created_at || null;
  
  // Fetch automation data
  const { rules, loading: rulesLoading } = useAutomationRules(profileId);
  const { alerts, loading: alertsLoading, refetch: refetchAlerts } = useAlerts(profileId);
  const { actions, loading: actionsLoading } = useActionQueue(profileId);
  const { actions: feedActions } = useActionsFeed(50);
  
  // Fetch bid optimizer status
  const { data: bidOptimizerStatus } = useBidOptimizerStatus(profileId);
  
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


  // Confidence signals with unified score
  const confidenceSignals = useMemo(() => {
    const riskScore = healthStatus === 'healthy' ? 20 : healthStatus === 'watch' ? 50 : 80;
    const riskLevel = healthStatus === 'healthy' ? 'low' as const : 
                      healthStatus === 'watch' ? 'medium' as const : 'high' as const;
    
    const hasEnoughData = hasData && minDate;
    // Data confidence based on actual data presence, not connection age
    const dataConfidence = hasEnoughData ? 75 : 30;
    const daysSinceManualIntervention = actions?.some(a => a.status === 'reverted') ? 2 : null;
    
    // Bid optimizer confidence
    const optimizerConfidence = bidOptimizerStatus?.averageConfidence || 0;
    
    // Combined score: weighted average (60% data confidence, 40% optimizer confidence)
    // If no optimizer data, use data confidence only
    const combinedScore = optimizerConfidence > 0
      ? Math.round(dataConfidence * 0.6 + optimizerConfidence * 0.4)
      : dataConfidence;
    
    return { 
      riskLevel, 
      riskScore, 
      dataConfidence,
      optimizerConfidence,
      combinedScore, 
      daysSinceManualIntervention 
    };
  }, [healthStatus, hasData, minDate, actions, bidOptimizerStatus]);

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
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
              <p className="text-muted-foreground">Your Amazon Advertising control hub</p>
            </div>
            
            <ReportIssueButton 
              featureId="command_center" 
              featureLabel="Command Center"
              variant="minimal"
              className="hidden md:flex"
            />
            
            {/* Unified Confidence Gauge */}
            {hasConnections && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden md:block cursor-help">
                      <ConfidenceMeter
                        score={confidenceSignals.combinedScore}
                        label="Automation Confidence"
                        variant="radial"
                        size="lg"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="w-64 p-4">
                    <div className="space-y-3">
                      <p className="font-medium text-sm">Confidence Breakdown</p>
                      
                      {/* Risk Level */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Risk Level</span>
                        <span className={cn(
                          "font-medium",
                          confidenceSignals.riskLevel === 'low' ? 'text-success' :
                          confidenceSignals.riskLevel === 'medium' ? 'text-warning' :
                          'text-destructive'
                        )}>
                          {confidenceSignals.riskLevel === 'low' ? 'Low' : 
                           confidenceSignals.riskLevel === 'medium' ? 'Medium' : 'High'}
                        </span>
                      </div>
                      
                      {/* Data Confidence */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Data Confidence</span>
                        <span className="font-medium">{confidenceSignals.dataConfidence}%</span>
                      </div>
                      
                      {/* Optimizer Confidence */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Bid Optimizer</span>
                        <span className="font-medium">
                          {confidenceSignals.optimizerConfidence > 0 
                            ? `${confidenceSignals.optimizerConfidence}%` 
                            : 'Learning...'}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground pt-1 border-t">
                        {confidenceSignals.optimizerConfidence === 0 
                          ? 'The optimizer needs campaign activity data (impressions, clicks) to build confidence.'
                          : 'Combined from data quality and bid optimization model strength'}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Compact Alerts Indicator */}
            <ActiveAlertsCard
              alerts={activeAlerts}
              loading={alertsLoading}
              compact
            />
            
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
                dateRangePreset={dateRangePreset}
                onDateRangePresetChange={setDateRangePreset}
                selectedASIN={selectedASIN}
                onASINChange={setSelectedASIN}
                marketplaceOptions={marketplaceOptions}
                connectionCount={connectionCount}
                autoOptimizedAsins={autoOptimizedAsins}
                totalAsins={totalAsins}
                currency={baseCurrency}
              />
              
              {/* Historical Performance Chart - Full Width */}
              <HistoricalPerformanceChart profileId={profileId} />
              
              {/* Multi-Account Breakdown - Show when in multi-account mode */}
              {isMultiAccountMode && (
                <MultiAccountBreakdown from={dateRange.from} to={dateRange.to} />
              )}
              
              {showOnboarding && (
                <OnboardingGuidanceCard
                  items={setupItems}
                  automationExplainer={automationExplainer}
                  loading={rulesLoading}
                />
              )}
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

            {/* Pending Approvals Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">Pending Approvals</h2>
                  <p className="text-sm text-muted-foreground">
                    Review and approve actions before they're applied
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
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Welcome to PPC Pal!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Connect your Amazon Advertising account to get started. Your campaign data will sync automatically and insights will appear here.
                </p>
              </div>
              <div className="flex justify-center">
                <Button asChild>
                  <Link to="/settings?tab=connections">Connect Amazon Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
};

export default CommandCenter;
