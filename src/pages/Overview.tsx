import DashboardShell from "@/components/DashboardShell";
import { DashboardChart } from "@/components/DashboardChart";
import { DataAvailabilityIndicator } from "@/components/DataAvailabilityIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useAmsMetrics } from "@/hooks/useAmsMetrics";
import { useSavingsMetric } from "@/hooks/useSavingsMetric";
import { useDataAvailability } from "@/hooks/useDataAvailability";
import { useAutomationRules, useAlerts } from "@/hooks/useAutomation";
import { useAnomalies } from "@/hooks/useAnomalies";
import { useActionQueue } from "@/hooks/useActionQueue";
import { useSearchStudio } from "@/hooks/useSearchStudio";

import { useState, useMemo, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { subDays, differenceInDays } from "date-fns";

// Import overview components
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

const Overview = () => {
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
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedFetchBrandTerms = useCallback(fetchBrandTerms, []);
  
  useEffect(() => {
    if (profileId) {
      memoizedFetchBrandTerms(profileId);
    }
  }, [profileId, memoizedFetchBrandTerms]);
  
  // Map brand terms to options
  const brandOptions: BrandOption[] = useMemo(() => {
    return brandTerms.map(bt => ({ id: bt.id, term: bt.term }));
  }, [brandTerms]);

  
  // Fetch metrics
  const { metrics, loading: metricsLoading, error: metricsError } = useAmsMetrics(
    primaryConnection?.id,
    dateRange?.from,
    dateRange?.to
  );
  
  // Fetch comparison metrics (previous period)
  const comparisonRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    return {
      from: subDays(dateRange.from, daysDiff + 1),
      to: subDays(dateRange.from, 1),
    };
  }, [dateRange]);
  
  const { metrics: comparisonMetrics } = useAmsMetrics(
    primaryConnection?.id,
    comparisonRange?.from,
    comparisonRange?.to
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
    importProgress, 
    importFullHistory, 
    isImportingFullHistory 
  } = useDataAvailability(profileId);
  
  // Fetch automation data
  const { rules, loading: rulesLoading } = useAutomationRules(profileId);
  const { alerts, loading: alertsLoading, refetch: refetchAlerts } = useAlerts(profileId);
  const { actions, loading: actionsLoading } = useActionQueue(profileId);
  
  
  // Fetch anomalies
  const { anomalies, loading: anomaliesLoading, fetchAnomalies } = useAnomalies();
  
  useEffect(() => {
    if (profileId) {
      refetchAlerts();
      fetchAnomalies({ profileId, state: 'new' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // Derive health status from metrics
  const healthStatus: HealthStatus = useMemo(() => {
    if (!metrics) return 'healthy';
    
    const acosHigh = metrics.acos > 40;
    const spendSpike = comparisonMetrics && metrics.totalSpend > comparisonMetrics.totalSpend * 1.5;
    const hasErrors = alerts?.filter(a => a.level === 'critical').length > 0;
    
    if (acosHigh || hasErrors) return 'at_risk';
    if (spendSpike || alerts?.filter(a => a.level === 'warn').length > 2) return 'watch';
    return 'healthy';
  }, [metrics, comparisonMetrics, alerts]);
  
  const healthReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!metrics) return reasons;
    
    if (metrics.acos > 40) reasons.push('ACoS is above 40%');
    if (comparisonMetrics && metrics.totalSpend > comparisonMetrics.totalSpend * 1.5) {
      reasons.push('Spend increased >50% vs previous period');
    }
    if (alerts?.filter(a => a.level === 'critical').length > 0) {
      reasons.push('Critical alerts detected');
    }
    return reasons;
  }, [metrics, comparisonMetrics, alerts]);

  // Derive automation status
  const automationStatus: AutomationStatus = useMemo(() => {
    if (!rules || rules.length === 0) return 'paused';
    const enabledRules = rules.filter(r => r.enabled);
    if (enabledRules.length === 0) return 'paused';
    if (enabledRules.length < rules.length) return 'limited';
    return 'on';
  }, [rules]);

  // Build What Matters Now items
  const whatMattersNowItems: MatterItem[] = useMemo(() => {
    const items: MatterItem[] = [];
    
    if (savings && savings.totalSavings > 0) {
      items.push({
        id: 'savings',
        type: 'positive',
        title: 'Savings Generated',
        description: `$${savings.totalSavings.toFixed(2)} saved through optimizations`,
        details: `From ${savings.actionCount} AI actions in this period`,
        link: { label: 'View details', to: '/reports' }
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
          link: { label: 'View trends', to: '/reports' }
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
          link: { label: 'View report', to: '/reports' }
        });
      }
      
      if (metrics.totalSpend > comparisonMetrics.totalSpend * 1.5) {
        items.push({
          id: 'spend-spike',
          type: 'attention',
          title: 'Spend Spike Detected',
          description: `Spend increased significantly vs previous period`,
          details: 'This may be intentional or indicate a bidding issue',
          link: { label: 'Check anomalies', to: '/reports' }
        });
      }
    }
    
    // Add anomaly alerts
    const newAnomalies = anomalies?.filter(a => a.state === 'new' && a.severity !== 'info').slice(0, 2);
    newAnomalies?.forEach(anomaly => {
      items.push({
        id: `anomaly-${anomaly.id}`,
        type: 'attention',
        title: `${anomaly.metric} ${anomaly.direction === 'spike' ? 'Spike' : 'Dip'}`,
        description: `${anomaly.severity === 'critical' ? 'Critical' : 'Warning'}: ${anomaly.metric} ${anomaly.direction}`,
        details: `Current: ${anomaly.value.toFixed(2)}, Baseline: ${anomaly.baseline.toFixed(2)}`,
        link: { label: 'View anomalies', to: '/reports' }
      });
    });
    
    return items;
  }, [savings, metrics, comparisonMetrics, anomalies]);

  // Build active alerts
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

  // Build automation summary
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

  // Calculate confidence signals
  const confidenceSignals = useMemo(() => {
    const riskScore = healthStatus === 'healthy' ? 20 : healthStatus === 'watch' ? 50 : 80;
    const riskLevel = healthStatus === 'healthy' ? 'low' as const : 
                      healthStatus === 'watch' ? 'medium' as const : 'high' as const;
    
    // Confidence based on data availability and consistency
    const hasEnoughData = hasData && minDate;
    const dataAge = minDate ? differenceInDays(new Date(), new Date(minDate)) : 0;
    const confidenceScore = hasEnoughData ? Math.min(90, 50 + dataAge * 2) : 30;
    
    // Days since manual intervention (placeholder - would need actual tracking)
    const daysSinceManualIntervention = actions?.some(a => a.status === 'reverted') 
      ? 2 
      : null;
    
    return { riskLevel, riskScore, confidenceScore, daysSinceManualIntervention };
  }, [healthStatus, hasData, minDate, actions]);

  // Setup items for onboarding
  const setupItems = useMemo(() => {
    return getDefaultSetupItems({
      hasConnection: hasConnections,
      hasRules: (rules?.filter(r => r.enabled).length || 0) > 0,
      hasTarget: true, // Would need actual target ACoS check
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
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Overview</h1>
          <p className="text-muted-foreground">Immediate situational awareness for your Amazon Advertising</p>
        </div>

        {/* Filters */}
        {hasConnections && (
          <OverviewFilters
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            selectedASIN={selectedASIN}
            onASINChange={setSelectedASIN}
            marketplaces={marketplaceOptions}
            selectedMarketplace={selectedMarketplace}
            onMarketplaceChange={setSelectedMarketplace}
            brands={brandOptions}
            selectedBrand={selectedBrand}
            onBrandChange={setSelectedBrand}
          />

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

        {/* Main Grid */}
        {hasConnections ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Account Health */}
              <AccountHealthCard
                healthStatus={healthStatus}
                healthReasons={healthReasons}
                savings={savings?.totalSavings || 0}
                spend={metrics?.totalSpend || 0}
                sales={metrics?.totalSales || 0}
                currentAcos={metrics?.acos || 0}
                targetAcos={30}
                automationStatus={automationStatus}
                loading={isLoading}
              />

              {/* What Matters Now */}
              <WhatMattersNow 
                items={whatMattersNowItems}
                loading={isLoading}
              />

              {/* Graphs/Trends */}
              <DashboardChart
                data={{ points: metrics?.timeseries || [] }}
                loading={metricsLoading}
                error={metricsError}
                granularity="day"
              />
            </div>

            {/* Right Column - Secondary Content */}
            <div className="space-y-6">
              {/* Active Alerts */}
              <ActiveAlertsCard
                alerts={activeAlerts}
                loading={alertsLoading}
              />

              {/* Automation Summary */}
              <AutomationSummaryCard
                summary={automationSummary}
                loading={actionsLoading || rulesLoading}
              />

              {/* Confidence Signals */}
              <ConfidenceSignalsCard
                riskLevel={confidenceSignals.riskLevel}
                riskScore={confidenceSignals.riskScore}
                confidenceScore={confidenceSignals.confidenceScore}
                daysSinceManualIntervention={confidenceSignals.daysSinceManualIntervention}
                loading={isLoading}
              />

              {/* Onboarding & Guidance */}
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
          /* No Connection State */
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

        {/* Expired Token Warning */}
        {hasConnections && hasExpiredTokens && (
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
      </div>
    </DashboardShell>
  );
};

export default Overview;