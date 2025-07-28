import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useEnhancedAmazonData } from '@/hooks/useEnhancedAmazonData';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { AttributionWindowSelector } from './AttributionWindowSelector';
import { DateRangeSelector } from './DateRangeSelector';
import { PerformanceMetricCards } from './PerformanceMetricCards';
import { CampaignDataTable } from './CampaignDataTable';
import { RefreshCw, TrendingUp, DollarSign, MousePointer, Eye, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const EnhancedAmazonDashboard = () => {
  const {
    campaigns,
    adGroups,
    keywords,
    loading,
    selectedAttributionWindow,
    setSelectedAttributionWindow,
    attributionWindows,
    dateRange,
    setDateRange,
    syncWithEnhancedOptions,
    dataSummary
  } = useEnhancedAmazonData();
  
  const { connections } = useAmazonConnections();
  const [syncing, setSyncing] = useState(false);

  const activeConnections = connections.filter(conn => conn.status === 'active');

  const handleSyncAll = async () => {
    if (activeConnections.length === 0) {
      return;
    }
    
    setSyncing(true);
    try {
      // Sync all active connections with enhanced options
      await Promise.all(
        activeConnections.map(connection =>
          syncWithEnhancedOptions(connection.id, {
            dateRange,
            attributionWindows: ['7d', '14d'],
            campaignTypes: ['sponsoredProducts']
          })
        )
      );
    } finally {
      setSyncing(false);
    }
  };

  if (activeConnections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Amazon Data Dashboard</CardTitle>
          <CardDescription>
            Connect your Amazon Advertising account to view enhanced performance metrics with flexible attribution windows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No active Amazon connections found. Please connect your Amazon account first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-end lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enhanced Amazon Dashboard</h1>
          <p className="text-muted-foreground">
            Advanced Amazon Ads performance metrics with flexible attribution windows and historical data.
          </p>
        </div>
        
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-end lg:space-x-4 lg:space-y-0">
          <AttributionWindowSelector
            selectedWindow={selectedAttributionWindow}
            onWindowChange={setSelectedAttributionWindow}
            attributionWindows={attributionWindows}
          />
          
          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          
          <Button 
            onClick={handleSyncAll} 
            disabled={loading || syncing}
            className="lg:mb-2"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${(loading || syncing) ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Enhanced Data'}
          </Button>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dataSummary.totalSpend)}</div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{dataSummary.attributionWindow}</Badge>
              <p className="text-xs text-muted-foreground">attribution</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dataSummary.totalSales)}</div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">ROAS: {dataSummary.avgRoas.toFixed(2)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Performance</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dataSummary.totalClicks)}</div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">CTR: {formatPercentage(dataSummary.avgCtr)}</Badge>
              <Badge variant="outline">CPC: {formatCurrency(dataSummary.avgCpc)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Metrics</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dataSummary.totalOrders)}</div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">CR: {formatPercentage(dataSummary.avgConversionRate)}</Badge>
              <Badge variant={dataSummary.avgAcos < 20 ? 'default' : 'destructive'}>
                ACoS: {formatPercentage(dataSummary.avgAcos)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">
            Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="adgroups">
            Ad Groups ({adGroups.length})
          </TabsTrigger>
          <TabsTrigger value="keywords">
            Keywords ({keywords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Enhanced campaign metrics with {selectedAttributionWindow} attribution window
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Enhanced campaign table coming soon...
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No campaigns found. Try syncing your data first.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adgroups">
          <Card>
            <CardHeader>
              <CardTitle>Ad Group Performance</CardTitle>
              <CardDescription>
                Ad group metrics with enhanced attribution windows
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adGroups.length > 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Enhanced ad group table coming soon...
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No ad groups found. Try syncing your data first.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Performance</CardTitle>
              <CardDescription>
                Keyword metrics with enhanced attribution and granular performance data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keywords.length > 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Enhanced keyword table coming soon...
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No keywords found. Try syncing your data first.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};