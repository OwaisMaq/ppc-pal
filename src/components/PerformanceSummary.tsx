import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePerformanceSummary } from '@/hooks/usePerformanceSummary';
import CampaignDataTable from './performance/CampaignDataTable';
import ConnectionSummaryTable from './performance/ConnectionSummaryTable';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';

const PerformanceSummary = () => {
  const navigate = useNavigate();
  const { 
    connections, 
    syncConnection, 
    deleteConnection,
    refreshConnections
  } = useAmazonConnections();
  
  const {
    campaigns,
    metrics,
    loading,
    hasData,
    hasRealData,
    dataQuality,
    formatCurrency,
    formatPercentage
  } = usePerformanceSummary();

  console.log('=== PerformanceSummary Component Debug ===');
  console.log('Connections:', connections.length);
  console.log('Campaigns:', campaigns.length);
  console.log('Has data:', hasData);
  console.log('Has real data:', hasRealData);
  console.log('Loading:', loading);
  console.log('Metrics:', metrics);

  // Add periodic refresh to ensure fresh data
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Periodic refresh of Amazon connections...');
      refreshConnections();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [refreshConnections]);

  const handleAddConnection = () => {
    navigate('/settings');
  };

  const handleForceSync = async (connectionId: string) => {
    console.log('Force syncing connection:', connectionId);
    // Enhanced force sync - will be implemented by the enhanced sync system
    await syncConnection(connectionId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
          <p className="text-gray-600">Loading Amazon campaign data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show connection status and setup if no connections
  if (connections.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
          <p className="text-gray-600">Connect your Amazon account to view performance data</p>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            You haven't connected any Amazon accounts yet. Connect your account to start viewing campaign performance data in detailed tables.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>Connect your Amazon Ads account to see your campaign data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAddConnection} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Connect Amazon Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show performance metrics if we have data
  const mockMetrics = [
    {
      title: 'Total Revenue',
      value: metrics?.totalSales ? formatCurrency(metrics.totalSales) : '$0',
      change: '+8.2%',
      trend: 'up',
      icon: DollarSign
    },
    {
      title: 'Ad Spend',
      value: metrics?.totalSpend ? formatCurrency(metrics.totalSpend) : '$0',
      change: '+12.1%',
      trend: 'up',
      icon: Target
    },
    {
      title: 'ROAS',
      value: metrics?.averageRoas ? `${metrics.averageRoas.toFixed(2)}x` : '0.00x',
      change: '-2.1%',
      trend: 'down',
      icon: TrendingUp
    },
    {
      title: 'Total Orders',
      value: metrics?.totalOrders ? metrics.totalOrders.toString() : '0',
      change: '+0.8%',
      trend: 'up',
      icon: Target
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Summary</h2>
        <p className="text-gray-600">
          {hasData 
            ? `Overview of your Amazon campaign performance - showing ${campaigns.length} campaigns`
            : 'Connect and sync your Amazon account to view performance data'
          }
        </p>
      </div>

      {/* Key Performance Metrics */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Enhanced Connection Summary Table */}
      <ConnectionSummaryTable 
        connections={connections}
        onSync={syncConnection}
        onDelete={deleteConnection}
        onForceSync={handleForceSync}
      />

      {/* Campaign Data Table */}
      {hasData ? (
        <CampaignDataTable 
          campaigns={campaigns}
          title="Campaign Performance Data"
          description={hasRealData 
            ? "Real-time data from Amazon Ads API" 
            : "Campaign data (some may be simulated for demonstration)"
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Data</CardTitle>
            <CardDescription>No campaign data available</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {connections.length > 0 
                  ? "Your Amazon connection is active but no campaign data has been synced yet. Try the 'Enhanced Sync' option for advanced profile detection and troubleshooting."
                  : "Connect your Amazon account to start viewing campaign data."
                }
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button 
                onClick={handleAddConnection}
                variant="outline"
              >
                Go to Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Information */}
      {hasData && dataQuality && (
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Information</CardTitle>
            <CardDescription>Details about your campaign data sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">{campaigns.length}</div>
                <div className="text-sm text-gray-600">Total Campaigns</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {dataQuality.realDataCampaigns || 0}
                </div>
                <div className="text-sm text-gray-600">API Data</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {dataQuality.simulatedCampaigns || 0}
                </div>
                <div className="text-sm text-gray-600">Simulated Data</div>
              </div>
              <div>
                <Badge variant={hasRealData ? 'default' : 'secondary'}>
                  {hasRealData ? 'Real Data Available' : 'Demo Data Only'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceSummary;
