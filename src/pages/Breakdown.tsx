import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAmazonData } from "@/hooks/useAmazonData";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import Header from "@/components/Header";
import ParetoChart from "@/components/ParetoChart";
import { 
  RefreshCw, 
  DollarSign, 
  Target,
  KeyRound,
  BarChart3
} from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};

const Breakdown = () => {
  const { campaigns, adGroups, keywords, loading, syncAllData } = useAmazonData();
  const { connections } = useAmazonConnections();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("");

  const activeConnections = connections.filter(c => c.status === 'active');

  // Calculate high-level summary
  const summary = useMemo(() => {
    const totals = campaigns.reduce((acc, campaign) => ({
      spend: acc.spend + (campaign.spend || 0),
      sales: acc.sales + (campaign.sales || 0),
      impressions: acc.impressions + (campaign.impressions || 0),
      clicks: acc.clicks + (campaign.clicks || 0),
      orders: acc.orders + (campaign.orders || 0),
    }), { spend: 0, sales: 0, impressions: 0, clicks: 0, orders: 0 });

    const avgAcos = totals.spend > 0 ? (totals.spend / totals.sales) * 100 : 0;
    const avgRoas = totals.spend > 0 ? totals.sales / totals.spend : 0;

    return {
      ...totals,
      avgAcos,
      avgRoas,
      totalCampaigns: campaigns.length
    };
  }, [campaigns]);

  // Filter ad groups based on selected campaign
  const filteredAdGroups = useMemo(() => {
    if (!selectedCampaignId) return [];
    return adGroups.filter(ag => ag.campaign_id === selectedCampaignId);
  }, [adGroups, selectedCampaignId]);

  // Filter keywords based on selected ad group
  const filteredKeywords = useMemo(() => {
    if (!selectedAdGroupId) return [];
    return keywords.filter(k => k.adgroup_id === selectedAdGroupId);
  }, [keywords, selectedAdGroupId]);

  // Get selected entities for display
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const selectedAdGroup = adGroups.find(ag => ag.id === selectedAdGroupId);
  const selectedKeyword = keywords.find(k => k.id === selectedKeywordId);

  const handleSyncAll = async () => {
    for (const connection of activeConnections) {
      await syncAllData(connection.id);
    }
  };

  const handleCampaignChange = (value: string) => {
    setSelectedCampaignId(value);
    setSelectedAdGroupId("");
    setSelectedKeywordId("");
  };

  const handleAdGroupChange = (value: string) => {
    setSelectedAdGroupId(value);
    setSelectedKeywordId("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Campaign Breakdown</h1>
              <p className="text-muted-foreground">
                Explore your Amazon advertising data with detailed breakdowns
              </p>
            </div>
            <Button
              onClick={handleSyncAll}
              disabled={loading || activeConnections.length === 0}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
          </div>

          {activeConnections.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Active Connections</CardTitle>
                <CardDescription>
                  Connect your Amazon account to view campaign breakdown data
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              {/* High-Level Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Campaign Summary
                  </CardTitle>
                  <CardDescription>
                    Total performance across all {summary.totalCampaigns} campaigns
                    {summary.totalCampaigns > 0 && summary.spend === 0 && (
                      <span className="block mt-1 text-amber-600">
                        ⚠️ No performance data available - try syncing your data
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {summary.totalCampaigns === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No campaigns found</p>
                      <p className="text-sm">Sync your Amazon data to get started</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${summary.spend > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {formatCurrency(summary.spend)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Spend</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${summary.sales > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {formatCurrency(summary.sales)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Sales</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${summary.impressions > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {formatNumber(summary.impressions)}
                        </div>
                        <div className="text-sm text-muted-foreground">Impressions</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${summary.clicks > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {formatNumber(summary.clicks)}
                        </div>
                        <div className="text-sm text-muted-foreground">Clicks</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${summary.avgAcos > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {summary.avgAcos > 0 ? `${summary.avgAcos.toFixed(1)}%` : 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg ACoS</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${summary.avgRoas > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {summary.avgRoas > 0 ? `${summary.avgRoas.toFixed(1)}x` : 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg RoAS</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dropdown Navigation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Campaign Dropdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      Select Campaign
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedCampaignId} onValueChange={handleCampaignChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a campaign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">{campaign.name}</span>
                              <Badge variant="secondary" className="ml-2">
                                {campaign.status}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Ad Group Dropdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-4 w-4 text-green-600" />
                      Select Ad Group
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select 
                      value={selectedAdGroupId} 
                      onValueChange={handleAdGroupChange}
                      disabled={!selectedCampaignId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedCampaignId ? "Choose an ad group..." : "Select campaign first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAdGroups.map((adGroup) => (
                          <SelectItem key={adGroup.id} value={adGroup.id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">{adGroup.name}</span>
                              <Badge variant="secondary" className="ml-2">
                                {adGroup.status}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Keyword Dropdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <KeyRound className="h-4 w-4 text-orange-600" />
                      Select Keyword
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select 
                      value={selectedKeywordId} 
                      onValueChange={setSelectedKeywordId}
                      disabled={!selectedAdGroupId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedAdGroupId ? "Choose a keyword..." : "Select ad group first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredKeywords.map((keyword) => (
                          <SelectItem key={keyword.id} value={keyword.id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">{keyword.keyword_text}</span>
                              <div className="flex gap-1 ml-2">
                                <Badge variant="outline" className="text-xs">
                                  {keyword.match_type}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {keyword.status}
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>

              {/* Selected Entity Details */}
              {(selectedCampaign || selectedAdGroup || selectedKeyword) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Entity Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedCampaign && (
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <h3 className="font-semibold">Campaign: {selectedCampaign.name}</h3>
                            <Badge variant="secondary">{selectedCampaign.status}</Badge>
                          </div>
                           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                             <div>
                               <div className="font-medium">Spend</div>
                               <div className="text-red-600 font-semibold">{formatCurrency(selectedCampaign.spend || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Sales</div>
                               <div className="text-green-600 font-semibold">{formatCurrency(selectedCampaign.sales || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Impressions</div>
                               <div className="font-semibold">{formatNumber(selectedCampaign.impressions || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Clicks</div>
                               <div className="font-semibold">{formatNumber(selectedCampaign.clicks || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Orders</div>
                               <div className="font-semibold">{formatNumber(selectedCampaign.orders || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">ACoS</div>
                               <div className={`font-semibold ${selectedCampaign.acos && selectedCampaign.acos > 30 ? 'text-red-600' : 'text-green-600'}`}>
                                 {selectedCampaign.acos ? `${selectedCampaign.acos.toFixed(1)}%` : 'N/A'}
                               </div>
                             </div>
                             <div>
                               <div className="font-medium">RoAS</div>
                               <div className={`font-semibold ${selectedCampaign.roas && selectedCampaign.roas < 2 ? 'text-red-600' : 'text-green-600'}`}>
                                 {selectedCampaign.roas ? `${selectedCampaign.roas.toFixed(2)}x` : 'N/A'}
                               </div>
                             </div>
                             <div>
                               <div className="font-medium">CTR</div>
                               <div className="font-semibold">
                                 {selectedCampaign.impressions && selectedCampaign.clicks 
                                   ? `${((selectedCampaign.clicks / selectedCampaign.impressions) * 100).toFixed(2)}%` 
                                   : 'N/A'}
                               </div>
                             </div>
                             <div>
                               <div className="font-medium">CPC</div>
                               <div className="font-semibold">
                                 {selectedCampaign.clicks && selectedCampaign.spend 
                                   ? formatCurrency(selectedCampaign.spend / selectedCampaign.clicks) 
                                   : 'N/A'}
                               </div>
                             </div>
                           </div>
                        </div>
                      )}

                      {selectedAdGroup && (
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-green-600" />
                            <h3 className="font-semibold">Ad Group: {selectedAdGroup.name}</h3>
                            <Badge variant="secondary">{selectedAdGroup.status}</Badge>
                          </div>
                           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                             <div>
                               <div className="font-medium">Spend</div>
                               <div className="text-red-600 font-semibold">{formatCurrency(selectedAdGroup.spend || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Sales</div>
                               <div className="text-green-600 font-semibold">{formatCurrency(selectedAdGroup.sales || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Impressions</div>
                               <div className="font-semibold">{formatNumber(selectedAdGroup.impressions || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Clicks</div>
                               <div className="font-semibold">{formatNumber(selectedAdGroup.clicks || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Orders</div>
                               <div className="font-semibold">{formatNumber(selectedAdGroup.orders || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Default Bid</div>
                               <div className="font-semibold">{selectedAdGroup.default_bid ? formatCurrency(selectedAdGroup.default_bid) : 'N/A'}</div>
                             </div>
                             <div>
                               <div className="font-medium">ACoS</div>
                               <div className={`font-semibold ${selectedAdGroup.acos && selectedAdGroup.acos > 30 ? 'text-red-600' : 'text-green-600'}`}>
                                 {selectedAdGroup.acos ? `${selectedAdGroup.acos.toFixed(1)}%` : 'N/A'}
                               </div>
                             </div>
                             <div>
                               <div className="font-medium">RoAS</div>
                               <div className={`font-semibold ${selectedAdGroup.roas && selectedAdGroup.roas < 2 ? 'text-red-600' : 'text-green-600'}`}>
                                 {selectedAdGroup.roas ? `${selectedAdGroup.roas.toFixed(2)}x` : 'N/A'}
                               </div>
                             </div>
                             <div>
                               <div className="font-medium">CTR</div>
                               <div className="font-semibold">
                                 {selectedAdGroup.impressions && selectedAdGroup.clicks 
                                   ? `${((selectedAdGroup.clicks / selectedAdGroup.impressions) * 100).toFixed(2)}%` 
                                   : 'N/A'}
                               </div>
                             </div>
                           </div>
                        </div>
                      )}

                      {selectedKeyword && (
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <KeyRound className="h-4 w-4 text-orange-600" />
                            <h3 className="font-semibold">Keyword: {selectedKeyword.keyword_text}</h3>
                            <Badge variant="outline">{selectedKeyword.match_type}</Badge>
                            <Badge variant="secondary">{selectedKeyword.status}</Badge>
                          </div>
                           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                             <div>
                               <div className="font-medium">Spend</div>
                               <div className="text-red-600 font-semibold">{formatCurrency(selectedKeyword.spend || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Sales</div>
                               <div className="text-green-600 font-semibold">{formatCurrency(selectedKeyword.sales || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Impressions</div>
                               <div className="font-semibold">{formatNumber(selectedKeyword.impressions || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Clicks</div>
                               <div className="font-semibold">{formatNumber(selectedKeyword.clicks || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Orders</div>
                               <div className="font-semibold">{formatNumber(selectedKeyword.orders || 0)}</div>
                             </div>
                             <div>
                               <div className="font-medium">Bid</div>
                               <div className="font-semibold">{selectedKeyword.bid ? formatCurrency(selectedKeyword.bid) : 'N/A'}</div>
                             </div>
                             <div>
                               <div className="font-medium">ACoS</div>
                               <div className={`font-semibold ${selectedKeyword.acos && selectedKeyword.acos > 30 ? 'text-red-600' : 'text-green-600'}`}>
                                 {selectedKeyword.acos ? `${selectedKeyword.acos.toFixed(1)}%` : 'N/A'}
                               </div>
                             </div>
                             <div>
                               <div className="font-medium">RoAS</div>
                               <div className={`font-semibold ${selectedKeyword.roas && selectedKeyword.roas < 2 ? 'text-red-600' : 'text-green-600'}`}>
                                 {selectedKeyword.roas ? `${selectedKeyword.roas.toFixed(2)}x` : 'N/A'}
                               </div>
                             </div>
                             <div>
                               <div className="font-medium">CTR</div>
                               <div className="font-semibold">
                                 {selectedKeyword.ctr ? `${selectedKeyword.ctr.toFixed(2)}%` : 
                                   (selectedKeyword.impressions && selectedKeyword.clicks 
                                     ? `${((selectedKeyword.clicks / selectedKeyword.impressions) * 100).toFixed(2)}%` 
                                     : 'N/A')}
                               </div>
                             </div>
                             <div>
                               <div className="font-medium">CPC</div>
                               <div className="font-semibold">
                                 {selectedKeyword.cpc ? formatCurrency(selectedKeyword.cpc) : 
                                   (selectedKeyword.clicks && selectedKeyword.spend 
                                     ? formatCurrency(selectedKeyword.spend / selectedKeyword.clicks) 
                                     : 'N/A')}
                               </div>
                             </div>
                             <div>
                               <div className="font-medium">Conv. Rate</div>
                               <div className="font-semibold">
                                 {selectedKeyword.conversion_rate ? `${selectedKeyword.conversion_rate.toFixed(2)}%` : 
                                   (selectedKeyword.clicks && selectedKeyword.orders 
                                     ? `${((selectedKeyword.orders / selectedKeyword.clicks) * 100).toFixed(2)}%` 
                                     : 'N/A')}
                               </div>
                             </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pareto Chart */}
              {keywords.length > 0 && (
                <ParetoChart keywords={keywords} adGroups={adGroups} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Breakdown;