import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAmazonData } from "@/hooks/useAmazonData";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import Header from "@/components/Header";
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
  const { campaigns, adGroups, keywords, loading, syncAllData, lastSyncDiagnostics } = useAmazonData();
  const { connections } = useAmazonConnections();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("");
  const [dateRangeDays, setDateRangeDays] = useState<number>(90);
  const [diagnosticMode, setDiagnosticMode] = useState<boolean>(false);
  const [filterClicks, setFilterClicks] = useState<boolean>(false);

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
    let list = keywords.filter(k => k.adgroup_id === selectedAdGroupId);
    if (filterClicks) list = list.filter(k => (k.clicks || 0) > 0);
    return list;
  }, [keywords, selectedAdGroupId, filterClicks]);

  // Get selected entities for display
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const selectedAdGroup = adGroups.find(ag => ag.id === selectedAdGroupId);
  const selectedKeyword = keywords.find(k => k.id === selectedKeywordId);

  const handleSyncAll = async () => {
    for (const connection of activeConnections) {
      await syncAllData(connection.id, { dateRangeDays, diagnosticMode });
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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">Campaign Breakdown</h1>
              <p className="text-muted-foreground">
                Explore your Amazon advertising data with detailed breakdowns
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={String(dateRangeDays)} onValueChange={(v) => setDateRangeDays(parseInt(v))}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last 365 days</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch checked={diagnosticMode} onCheckedChange={setDiagnosticMode} />
                <span className="text-sm text-muted-foreground">Diagnostic</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={filterClicks} onCheckedChange={setFilterClicks} />
                <span className="text-sm text-muted-foreground">Clicks &gt; 0</span>
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
              {/* Diagnostics Status */}
              {lastSyncDiagnostics?.keyword && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Last Sync Diagnostics</CardTitle>
                    <CardDescription>Keyword scope and activity snapshot</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Total Keywords</div>
                        <div>{lastSyncDiagnostics.keyword.totalKeywords}</div>
                      </div>
                      <div>
                        <div className="font-medium">Filtered IDs Used</div>
                        <div>{lastSyncDiagnostics.keyword.filteredIdsUsed}</div>
                      </div>
                      <div>
                        <div className="font-medium">Report Rows</div>
                        <div>{lastSyncDiagnostics.keyword.reportRows}</div>
                      </div>
                      <div>
                        <div className="font-medium">Rows Clicks &gt; 0</div>
                        <div>{lastSyncDiagnostics.keyword.nonZeroClickRows}</div>
                      </div>
                      <div>
                        <div className="font-medium">Matched to DB</div>
                        <div>{lastSyncDiagnostics.keyword.matchedRows}</div>
                      </div>
                      <div>
                        <div className="font-medium">Time Unit / Range</div>
                        <div>{lastSyncDiagnostics.keyword.timeUnit} / {lastSyncDiagnostics.keyword.dateRangeDays}d</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* High-Level Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Campaign Summary
                  </CardTitle>
                  <CardDescription>
                    Total performance across all {summary.totalCampaigns} campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(summary.spend)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Spend</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(summary.sales)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Sales</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatNumber(summary.impressions)}
                      </div>
                      <div className="text-sm text-muted-foreground">Impressions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatNumber(summary.clicks)}
                      </div>
                      <div className="text-sm text-muted-foreground">Clicks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {summary.avgAcos.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg ACoS</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {summary.avgRoas.toFixed(1)}x
                      </div>
                      <div className="text-sm text-muted-foreground">Avg RoAS</div>
                    </div>
                  </div>
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

              {/* Keywords in Selected Ad Group */}
              {selectedAdGroupId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Keywords in Ad Group</CardTitle>
                    <CardDescription>Clicks, spend, and sales per keyword</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredKeywords.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No keywords found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-[640px]">
                          <div className="grid grid-cols-6 gap-2 px-2 py-2 text-xs text-muted-foreground">
                            <div className="col-span-2">Keyword</div>
                            <div>Match</div>
                            <div className="text-right">Clicks</div>
                            <div className="text-right">Spend</div>
                            <div className="text-right">Sales</div>
                          </div>
                          <div className="divide-y">
                            {filteredKeywords.map((k) => (
                              <div key={k.id} className="grid grid-cols-6 gap-2 px-2 py-2 items-center">
                                <div className="col-span-2 truncate">{k.keyword_text}</div>
                                <div>
                                  <Badge variant="outline" className="text-xs py-0 px-1">{k.match_type}</Badge>
                                </div>
                                <div className="text-right">{formatNumber(k.clicks || 0)}</div>
                                <div className="text-right">{formatCurrency(k.spend || 0)}</div>
                                <div className="text-right">{formatCurrency(k.sales || 0)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="font-medium">Spend</div>
                              <div>{formatCurrency(selectedCampaign.spend || 0)}</div>
                            </div>
                            <div>
                              <div className="font-medium">Sales</div>
                              <div>{formatCurrency(selectedCampaign.sales || 0)}</div>
                            </div>
                            <div>
                              <div className="font-medium">Clicks</div>
                              <div>{formatNumber(selectedCampaign.clicks || 0)}</div>
                            </div>
                            <div>
                              <div className="font-medium">ACoS</div>
                              <div>{selectedCampaign.acos ? `${selectedCampaign.acos.toFixed(1)}%` : 'N/A'}</div>
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
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="font-medium">Spend</div>
                              <div>{formatCurrency(selectedAdGroup.spend || 0)}</div>
                            </div>
                            <div>
                              <div className="font-medium">Sales</div>
                              <div>{formatCurrency(selectedAdGroup.sales || 0)}</div>
                            </div>
                            <div>
                              <div className="font-medium">Default Bid</div>
                              <div>{selectedAdGroup.default_bid ? formatCurrency(selectedAdGroup.default_bid) : 'N/A'}</div>
                            </div>
                            <div>
                              <div className="font-medium">ACoS</div>
                              <div>{selectedAdGroup.acos ? `${selectedAdGroup.acos.toFixed(1)}%` : 'N/A'}</div>
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
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <div className="font-medium">Spend</div>
                              <div>{formatCurrency(selectedKeyword.spend || 0)}</div>
                            </div>
                            <div>
                              <div className="font-medium">Sales</div>
                              <div>{formatCurrency(selectedKeyword.sales || 0)}</div>
                            </div>
                            <div>
                              <div className="font-medium">Bid</div>
                              <div>{selectedKeyword.bid ? formatCurrency(selectedKeyword.bid) : 'N/A'}</div>
                            </div>
                            <div>
                              <div className="font-medium">Clicks</div>
                              <div>{formatNumber(selectedKeyword.clicks || 0)}</div>
                            </div>
                            <div>
                              <div className="font-medium">CPC</div>
                              <div>{selectedKeyword.cpc ? formatCurrency(selectedKeyword.cpc) : 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Breakdown;