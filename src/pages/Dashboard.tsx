import DashboardShell from "@/components/DashboardShell";

import OptimizationDashboard from "@/components/OptimizationDashboard";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import AmazonDataDashboard from "@/components/AmazonDataDashboard";
import ConsolidatedDataView from "@/components/ConsolidatedDataView";
import { PerformanceMetricCards } from "@/components/PerformanceMetricCards";
import { CampaignDataTable } from "@/components/CampaignDataTable";
import { WeeklyPerformanceChart } from "@/components/WeeklyPerformanceChart";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useCampaignMetrics } from "@/hooks/useCampaignMetrics";
import { useAmsMetrics } from "@/hooks/useAmsMetrics";
import { useAMS } from "@/hooks/useAMS";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { Link } from "react-router-dom";
import { useAmazonData } from "@/hooks/useAmazonData";
import { formatDistanceToNow } from "date-fns";
import { useBudgetUsage } from "@/hooks/useBudgetUsage";
import { useDateRange } from "@/context/DateRangeContext";
import { DataFreshnessIndicator } from "@/components/DataFreshnessIndicator";
import { Loader2, RefreshCw, Activity, AlertTriangle, TrendingUp, DollarSign, MousePointer, Eye, Zap, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
// Map marketplace IDs to region labels and flags
const MARKETPLACE_INFO: Record<string, { code: string; label: string; flag: string }> = {
  // EU
  A1F83G8C2ARO7P: { code: "UK", label: "United Kingdom", flag: "🇬🇧" },
  A1PA6795UKMFR9: { code: "DE", label: "Germany", flag: "🇩🇪" },
  A13V1IB3VIYZZH: { code: "FR", label: "France", flag: "🇫🇷" },
  A1RKKUPIHCS9HS: { code: "ES", label: "Spain", flag: "🇪🇸" },
  APJ6JRA9NG5V4: { code: "IT", label: "Italy", flag: "🇮🇹" },
  A1805IZSGTT6HS: { code: "NL", label: "Netherlands", flag: "🇳🇱" },
  A2N6G2J0Z2T20O: { code: "SE", label: "Sweden", flag: "🇸🇪" },
  A1C3SOZRARQ6R3: { code: "SE", label: "Sweden", flag: "🇸🇪" }, // alt
  A1ZFFQZ3HTUKT9: { code: "PL", label: "Poland", flag: "🇵🇱" },
  // North America
  ATVPDKIKX0DER: { code: "US", label: "United States", flag: "🇺🇸" },
  A2EUQ1WTGCTBG2: { code: "CA", label: "Canada", flag: "🇨🇦" },
  A1AM78C64UM0Y8: { code: "MX", label: "Mexico", flag: "🇲🇽" },
  // Other common
  A39IBJ37TRP1C6: { code: "AU", label: "Australia", flag: "🇦🇺" },
  A1VC38T7YXB528: { code: "JP", label: "Japan", flag: "🇯🇵" },
  A21TJRUUN4KGV: { code: "IN", label: "India", flag: "🇮🇳" },
  A33AVAJ2PDY3EV: { code: "TR", label: "Turkey", flag: "🇹🇷" },
  A19VAU5U5O7RUS: { code: "SG", label: "Singapore", flag: "🇸🇬" },
  A17E79C6D8DWNP: { code: "SA", label: "Saudi Arabia", flag: "🇸🇦" },
  A2VIGQ35RCS4UG: { code: "AE", label: "United Arab Emirates", flag: "🇦🇪" },
  A2Q3Y263D00KWC: { code: "BR", label: "Brazil", flag: "🇧🇷" },
};
const getMarketplaceInfo = (id?: string) => (id && MARKETPLACE_INFO[id]) || { code: "", label: "", flag: "" };
const inferFlagFromName = (name?: string) => {
  const n = (name || '').toLowerCase();
  if (/uk|united kingdom|gb|britain/.test(n)) return '🇬🇧';
  if (/us|united states|usa/.test(n)) return '🇺🇸';
  if (/de|germany|deutschland/.test(n)) return '🇩🇪';
  if (/fr|france/.test(n)) return '🇫🇷';
  if (/es|spain|españa/.test(n)) return '🇪🇸';
  if (/it|italy|italia/.test(n)) return '🇮🇹';
  if (/nl|netherlands|holland/.test(n)) return '🇳🇱';
  if (/se|sweden/.test(n)) return '🇸🇪';
  if (/pl|poland|polska/.test(n)) return '🇵🇱';
  if (/ca|canada/.test(n)) return '🇨🇦';
  if (/mx|mexico/.test(n)) return '🇲🇽';
  if (/jp|japan/.test(n)) return '🇯🇵';
  if (/ae|uae|united arab emirates|dubai/.test(n)) return '🇦🇪';
  if (/au|australia/.test(n)) return '🇦🇺';
  if (/in|india/.test(n)) return '🇮🇳';
  return '🌐';
};
const getFlagForConnection = (c: { profile_name?: string; marketplace_id?: string }) => {
  const m = getMarketplaceInfo(c.marketplace_id);
  return m.flag || inferFlagFromName(c.profile_name);
};
const getConnectionLabel = (c: { profile_name?: string; profile_id: string; marketplace_id?: string }) => {
  const info = getMarketplaceInfo(c.marketplace_id);
  const name = c.profile_name || c.profile_id;
  const flag = info.flag || inferFlagFromName(name);
  return `${flag} ${name}${info.code ? ` (${info.code})` : ""}`;
};

const Dashboard = () => {
  const { connections } = useAmazonConnections();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | undefined>(undefined);
  const hasActiveConnections = connections.some(c => c.status === 'active');
  const activeConnections = connections.filter(c => c.status === 'active');
  
  // Date range context
  const { dateRangeDays } = useDateRange();
  const dateFrom = useMemo(() => new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000), [dateRangeDays]);
  const dateTo = useMemo(() => new Date(), []);
  
  // AMS streaming data (primary)
  const { metrics: amsMetrics, entityData: amsEntityData, loading: amsLoading, error: amsError, refetch: refetchAms } = useAmsMetrics(selectedConnectionId, dateFrom, dateTo);
  
  // Fallback to campaign metrics from reports (if no AMS data)
  const { metrics: campaignMetrics, campaigns, loading: campaignLoading, error: campaignError, refetch: refetchCampaigns } = useCampaignMetrics(selectedConnectionId);
  
  // Smart data prioritization: Use AMS if available and recent
  const hasRecentAmsData = amsMetrics && (
    amsMetrics.totalSpend > 0 || 
    amsMetrics.totalImpressions > 0 ||
    (amsMetrics.messageCount24h && amsMetrics.messageCount24h > 0)
  );
  
  const metrics = hasRecentAmsData ? amsMetrics : campaignMetrics;
  const entityData = amsEntityData.length > 0 ? amsEntityData : campaigns;
  const loading = amsLoading || campaignLoading;
  const error = amsError || campaignError;
  const isUsingAmsData = hasRecentAmsData;
  const dataSource = isUsingAmsData ? "AMS Streaming" : "Campaign Reports";
  
  const selectedConnection = useMemo(() => activeConnections.find(c => c.id === selectedConnectionId), [activeConnections, selectedConnectionId]);
  const { syncAllData, loading: syncLoading } = useAmazonData();
  const { processStreamData, loading: processLoading } = useAMS();
  const [autoSynced, setAutoSynced] = useState(false);

  const campaignIds = useMemo(() => campaigns.map(c => c.id), [campaigns]);
  const { data: budgetUsage } = useBudgetUsage(campaignIds);
  
  // Check if AMS aggregation is needed (data older than 90 minutes)
  const needsAggregation = useMemo(() => {
    if (!amsMetrics?.lastMessageAt) return false;
    const lastMessage = new Date(amsMetrics.lastMessageAt);
    const ninetyMinutesAgo = new Date(Date.now() - 90 * 60 * 1000);
    return lastMessage < ninetyMinutesAgo;
  }, [amsMetrics?.lastMessageAt]);

  useEffect(() => {
    if (activeConnections.length > 0) {
      const uk = activeConnections.find(c => (c.profile_name || '').toLowerCase().includes('uk') || c.marketplace_id === 'A1F83G8C2ARO7P');
      setSelectedConnectionId(prev => prev ?? (uk?.id || activeConnections[0].id));
    }
  }, [connections]);

  useEffect(() => {
    if (!autoSynced && selectedConnectionId && hasActiveConnections) {
      const zeroSpend = (metrics?.totalSpend ?? 0) === 0;
      const hasCampaigns = campaigns.length > 0;
      if (zeroSpend && hasCampaigns && !isUsingAmsData) {
        setAutoSynced(true);
        syncAllData(selectedConnectionId);
      }
    }
  }, [autoSynced, selectedConnectionId, hasActiveConnections, metrics?.totalSpend, campaigns.length, syncAllData, isUsingAmsData]);
  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              PPC Automation Dashboard
            </h1>
            <p className="text-gray-600">
              Connect your Amazon Advertising accounts and let AI optimize your campaigns automatically
            </p>
          </div>
          
          {hasActiveConnections && (
            <div className="flex gap-3 items-center">
              <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background border shadow-md">
                  {activeConnections.map((c) => (
                    <SelectItem key={c.id} value={c.id} textValue={getConnectionLabel(c)}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getFlagForConnection(c)}</span>
                        <span>
                          {(c.profile_name || c.profile_id)}
                          {getMarketplaceInfo(c.marketplace_id).code ? ` (${getMarketplaceInfo(c.marketplace_id).code})` : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date range selector */}
              <DateRangeSelector />

              <div className="flex items-center gap-2">
                {isUsingAmsData ? (
                  <>
                    <Button 
                      onClick={() => selectedConnectionId && processStreamData(selectedConnectionId)} 
                      variant="default" 
                      className="flex items-center gap-2"
                      disabled={processLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${processLoading ? 'animate-spin' : ''}`} />
                      Process Stream Data
                    </Button>
                    {needsAggregation && (
                      <Button 
                        onClick={() => selectedConnectionId && processStreamData(selectedConnectionId)} 
                        variant="outline" 
                        className="flex items-center gap-2"
                        disabled={processLoading}
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Refresh Aggregates
                      </Button>
                    )}
                  </>
                ) : (
                  <Button 
                    onClick={() => selectedConnectionId && syncAllData(selectedConnectionId, { dateRangeDays })} 
                    variant="default" 
                    className="flex items-center gap-2"
                    disabled={syncLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
                    Sync Reports
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    if (isUsingAmsData) {
                      refetchAms();
                    } else {
                      refetchCampaigns();
                    }
                  }}
                  variant="outline" 
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
              </div>
              <div className="flex flex-col items-end text-xs text-muted-foreground">
                {isUsingAmsData && amsMetrics?.lastMessageAt && (
                  <span>Stream: {formatDistanceToNow(new Date(amsMetrics.lastMessageAt), { addSuffix: true })}</span>
                )}
                {selectedConnection?.last_sync_at && (
                  <span>Reports: {formatDistanceToNow(new Date(selectedConnection.last_sync_at), { addSuffix: true })}</span>
                )}
                {isUsingAmsData && (
                  <span className="text-green-600 font-medium">Live streaming data</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {!hasActiveConnections && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-800">
                  No active Amazon connections. Please connect your account in Settings.
                </p>
                <div className="mt-3">
                  <Button asChild>
                    <Link to="/settings">Go to Settings</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Overview Section */}
          {hasActiveConnections && (
            <>
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-red-800">Error loading campaign data: {error}</p>
                  </CardContent>
                </Card>
              )}

              {/* KPI Cards */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Performance Overview</h2>
                </div>
                <PerformanceMetricCards metrics={metrics} loading={loading} />
              </div>

              {/* Charts and Tables */}
              <div className="grid lg:grid-cols-2 gap-6">
                <WeeklyPerformanceChart campaigns={campaigns} loading={loading} />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Campaigns</span>
                        <span className="font-semibold">
                          {campaigns.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data Source</span>
                        <span className={`font-semibold text-xs ${isUsingAmsData ? 'text-green-600' : 'text-amber-600'}`}>
                          {isUsingAmsData ? 'Streaming' : 'Reports'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Best ACOS</span>
                        <span className="font-semibold text-green-600">
                          {campaigns.length > 0 
                            ? `${Math.min(...campaigns.map(c => c.acos || 100)).toFixed(2)}%`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Best ROAS</span>
                        <span className="font-semibold text-blue-600">
                          {campaigns.length > 0 
                            ? `${Math.max(...campaigns.map(c => c.roas || 0)).toFixed(2)}x`
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Data Table */}
              <CampaignDataTable campaigns={campaigns} loading={loading} budgetUsage={budgetUsage} />

              {/* Consolidated Data View - Full Width */}
              <div className="lg:col-span-3">
                <ConsolidatedDataView />
              </div>

              {/* Amazon Data Dashboard - Full Width */}
              <div className="lg:col-span-3">
                <AmazonDataDashboard />
              </div>

              {/* Optimization Dashboard - Full Width */}
              <div className="lg:col-span-3">
                <OptimizationDashboard />
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default Dashboard;