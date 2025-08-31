import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardFilters, DateRange, DatePreset } from "@/components/DashboardFilters";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { DashboardTable } from "@/components/DashboardTable";
import { DashboardChart } from "@/components/DashboardChart";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { subDays, format } from "date-fns";
import { 
  useDashboardKPIs, 
  useDashboardTable, 
  useDashboardTimeseries,
  DashboardLevel,
  DashboardTableRow 
} from "@/hooks/useDashboardData";
import { useSubscription } from "@/hooks/useSubscription";

const PerformanceDashboard: React.FC = () => {
  // Filter states
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('30D');
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [selectedLevel, setSelectedLevel] = useState<DashboardLevel>('campaign');
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");

  // Get subscription for entitlements
  const { subscription } = useSubscription();
  const plan = subscription?.plan_type || 'free';

  // Data hooks
  const dashboardParams = {
    profileId: selectedProfile,
    from: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    level: selectedLevel
  };

  const { data: kpisData, loading: kpisLoading, error: kpisError } = useDashboardKPIs(dashboardParams);
  const { data: tableData, loading: tableLoading, error: tableError } = useDashboardTable(dashboardParams);
  const { data: chartData, loading: chartLoading, error: chartError } = useDashboardTimeseries({
    ...dashboardParams,
    entityId: selectedEntityId
  });

  // Handle row click for drill-down
  const handleRowClick = (row: DashboardTableRow) => {
    if (selectedLevel === 'campaign') {
      setSelectedLevel('ad_group');
      setSelectedEntityId(row.id);
    } else if (selectedLevel === 'ad_group') {
      setSelectedLevel('target');
      setSelectedEntityId(row.id);
    }
  };

  // Check if level is available based on plan
  const isLevelAvailable = (level: DashboardLevel) => {
    switch (level) {
      case 'campaign':
      case 'ad_group':
        return true;
      case 'target':
        return ['starter', 'pro'].includes(plan);
      case 'search_term':
        return ['starter', 'pro'].includes(plan);
      case 'placement':
        return plan === 'pro';
      default:
        return false;
    }
  };

  const TabTriggerWithGating = ({ value, children, level }: { 
    value: string; 
    children: React.ReactNode; 
    level: DashboardLevel;
  }) => {
    const available = isLevelAvailable(level);
    
    return (
      <TabsTrigger 
        value={value} 
        disabled={!available}
        className="flex items-center gap-2"
      >
        {children}
        {!available && <Lock className="h-3 w-3" />}
      </TabsTrigger>
    );
  };

  const UpgradeBanner = ({ feature }: { feature: string }) => (
    <div className="p-6 text-center bg-muted/50 border border-dashed rounded-lg">
      <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      <h3 className="font-semibold mb-2">Upgrade to see {feature}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        This feature is available with higher tier plans.
      </p>
      <Badge variant="outline">
        Current plan: {plan}
      </Badge>
    </div>
  );

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <p className="text-muted-foreground">
          Analyze your Amazon advertising performance with detailed metrics and insights
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters
        selectedProfile={selectedProfile}
        onProfileChange={setSelectedProfile}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />

      {/* Only show content if profile and dates are selected */}
      {selectedProfile && dateRange.from && dateRange.to ? (
        <>
          {/* KPIs */}
          <DashboardKPIs
            data={kpisData}
            loading={kpisLoading}
            error={kpisError}
          />

          {/* Tabs for different data levels */}
          <Tabs 
            value={selectedLevel} 
            onValueChange={(value) => {
              setSelectedLevel(value as DashboardLevel);
              setSelectedEntityId(""); // Reset entity selection when switching levels
            }}
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabTriggerWithGating value="campaign" level="campaign">
                Campaigns
              </TabTriggerWithGating>
              <TabTriggerWithGating value="ad_group" level="ad_group">
                Ad Groups
              </TabTriggerWithGating>
              <TabTriggerWithGating value="target" level="target">
                Targets
              </TabTriggerWithGating>
              <TabTriggerWithGating value="search_term" level="search_term">
                Search Terms
              </TabTriggerWithGating>
              <TabTriggerWithGating value="placement" level="placement">
                Placements
              </TabTriggerWithGating>
            </TabsList>

            <TabsContent value="campaign" className="space-y-6">
              {isLevelAvailable('campaign') ? (
                <>
                  <DashboardTable
                    data={tableData}
                    loading={tableLoading}
                    error={tableError}
                    level="campaign"
                    onRowClick={handleRowClick}
                  />
                  {selectedEntityId && (
                    <DashboardChart
                      data={chartData}
                      loading={chartLoading}
                      error={chartError}
                      granularity={granularity}
                    />
                  )}
                </>
              ) : (
                <UpgradeBanner feature="campaign data" />
              )}
            </TabsContent>

            <TabsContent value="ad_group" className="space-y-6">
              {isLevelAvailable('ad_group') ? (
                <>
                  <DashboardTable
                    data={tableData}
                    loading={tableLoading}
                    error={tableError}
                    level="ad_group"
                    onRowClick={handleRowClick}
                  />
                  {selectedEntityId && (
                    <DashboardChart
                      data={chartData}
                      loading={chartLoading}
                      error={chartError}
                      granularity={granularity}
                    />
                  )}
                </>
              ) : (
                <UpgradeBanner feature="ad group data" />
              )}
            </TabsContent>

            <TabsContent value="target" className="space-y-6">
              {isLevelAvailable('target') ? (
                <>
                  <DashboardTable
                    data={tableData}
                    loading={tableLoading}
                    error={tableError}
                    level="target"
                    onRowClick={handleRowClick}
                  />
                  {selectedEntityId && (
                    <DashboardChart
                      data={chartData}
                      loading={chartLoading}
                      error={chartError}
                      granularity={granularity}
                    />
                  )}
                </>
              ) : (
                <UpgradeBanner feature="target data" />
              )}
            </TabsContent>

            <TabsContent value="search_term" className="space-y-6">
              {isLevelAvailable('search_term') ? (
                <DashboardTable
                  data={tableData}
                  loading={tableLoading}
                  error={tableError}
                  level="search_term"
                />
              ) : (
                <UpgradeBanner feature="search term data" />
              )}
            </TabsContent>

            <TabsContent value="placement" className="space-y-6">
              {isLevelAvailable('placement') ? (
                <DashboardTable
                  data={tableData}
                  loading={tableLoading}
                  error={tableError}
                  level="placement"
                />
              ) : (
                <UpgradeBanner feature="placement data" />
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="p-8 text-center bg-muted/50 border rounded-lg">
          <p className="text-muted-foreground">
            Please select a profile and date range to view performance data.
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;