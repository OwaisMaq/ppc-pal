import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAmazonData } from "@/hooks/useAmazonData";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { BarChart3, TrendingUp, TrendingDown, RefreshCw, DollarSign, MousePointer, Eye } from "lucide-react";
import { useDateRange } from "@/context/DateRangeContext";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};

const AmazonDataDashboard = () => {
  const { campaigns, adGroups, keywords, loading, dataSummary, syncAllData, lastSyncDiagnostics } = useAmazonData();
  const { connections } = useAmazonConnections();

  const activeConnections = connections.filter(c => c.status === 'active');

  const handleSyncAll = async () => {
    for (const connection of activeConnections) {
      await syncAllData(connection.id, { dateRangeDays: 14, diagnosticMode: true });
    }
  };

  if (activeConnections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Campaign Data Preview
          </CardTitle>
          <CardDescription>
            Connect your Amazon account to view campaign data
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dataSummary.totalSpend)}</div>
            <p className="text-xs text-muted-foreground">
              Across {dataSummary.totalCampaigns} campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dataSummary.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              ROAS: {dataSummary.avgRoas.toFixed(2)}x
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dataSummary.totalClicks)}</div>
            <p className="text-xs text-muted-foreground">
              From {formatNumber(dataSummary.totalImpressions)} impressions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ACoS</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataSummary.avgAcos.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {dataSummary.totalKeywords} active keywords
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Campaign Data
              </CardTitle>
              <CardDescription>
                View and manage your Amazon advertising data
              </CardDescription>
            </div>
            <Button
              onClick={handleSyncAll}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="campaigns" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
              <TabsTrigger value="adgroups">Ad Groups ({adGroups.length})</TabsTrigger>
              <TabsTrigger value="keywords">Keywords ({keywords.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="space-y-4">
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No campaigns found. Sync your Amazon data to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 10).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{campaign.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Badge variant="secondary">{campaign.campaign_type}</Badge>
                          <Badge 
                            variant={campaign.status === 'enabled' ? 'default' : 'secondary'}
                          >
                            {campaign.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Spend: {formatCurrency((campaign as any).cost_legacy || (campaign as any).cost_14d || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Sales: {formatCurrency((campaign as any).attributed_sales_legacy || (campaign as any).attributed_sales_14d || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="adgroups" className="space-y-4">
              {adGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No ad groups found. Sync your Amazon data to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {adGroups.slice(0, 10).map((adGroup) => (
                    <div key={adGroup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{adGroup.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Badge 
                            variant={adGroup.status === 'enabled' ? 'default' : 'secondary'}
                          >
                            {adGroup.status}
                          </Badge>
                          {adGroup.default_bid && (
                            <span>Bid: {formatCurrency(adGroup.default_bid)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Spend: {formatCurrency((adGroup as any).cost_legacy || (adGroup as any).cost_14d || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Sales: {formatCurrency((adGroup as any).attributed_sales_legacy || (adGroup as any).attributed_sales_14d || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="keywords" className="space-y-4">
              {keywords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No keywords found. Sync your Amazon data to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {keywords.slice(0, 10).map((keyword) => (
                    <div key={keyword.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{keyword.keyword_text}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Badge variant="outline">{keyword.match_type}</Badge>
                          <Badge 
                            variant={keyword.status === 'enabled' ? 'default' : 'secondary'}
                          >
                            {keyword.status}
                          </Badge>
                          {keyword.bid && (
                            <span>Bid: {formatCurrency(keyword.bid)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Spend: {formatCurrency((keyword as any).cost_legacy || (keyword as any).cost_14d || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Sales: {formatCurrency((keyword as any).attributed_sales_legacy || (keyword as any).attributed_sales_14d || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Clicks: {formatNumber(keyword.clicks || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AmazonDataDashboard;