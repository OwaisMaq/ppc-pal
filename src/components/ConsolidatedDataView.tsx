import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAmazonData } from "@/hooks/useAmazonData";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { 
  ChevronDown, 
  ChevronRight, 
  BarChart3, 
  RefreshCw, 
  DollarSign, 
  Target,
  KeyRound
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

const ConsolidatedDataView = () => {
  const { campaigns, adGroups, keywords, loading, syncAllData } = useAmazonData();
  const { connections } = useAmazonConnections();
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set());

  const activeConnections = connections.filter(c => c.status === 'active');

  const handleSyncAll = async () => {
    for (const connection of activeConnections) {
      await syncAllData(connection.id);
    }
  };

  const toggleCampaign = (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId);
    } else {
      newExpanded.add(campaignId);
    }
    setExpandedCampaigns(newExpanded);
  };

  const toggleAdGroup = (adGroupId: string) => {
    const newExpanded = new Set(expandedAdGroups);
    if (newExpanded.has(adGroupId)) {
      newExpanded.delete(adGroupId);
    } else {
      newExpanded.add(adGroupId);
    }
    setExpandedAdGroups(newExpanded);
  };

  const getCampaignAdGroups = (campaignId: string) => {
    return adGroups.filter(ag => ag.campaign_id === campaignId);
  };

  const getAdGroupKeywords = (adGroupId: string) => {
    return keywords.filter(k => k.adgroup_id === adGroupId);
  };

  if (activeConnections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Consolidated Campaign View
          </CardTitle>
          <CardDescription>
            Connect your Amazon account to view consolidated campaign data
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Consolidated Campaign View
            </CardTitle>
            <CardDescription>
              Hierarchical view of campaigns, ad groups, and keywords
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
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No campaigns found. Sync your Amazon data to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign) => {
              const campaignAdGroups = getCampaignAdGroups(campaign.id);
              const isExpanded = expandedCampaigns.has(campaign.id);
              
              return (
                <Collapsible
                  key={campaign.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCampaign(campaign.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <div>
                          <h4 className="font-medium">{campaign.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">{campaign.campaign_type || 'Unknown'}</Badge>
                            <Badge 
                              variant={campaign.status === 'enabled' ? 'default' : 'secondary'}
                            >
                              {campaign.status}
                            </Badge>
                            <span>{campaignAdGroups.length} ad groups</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Spend: {formatCurrency(campaign.spend || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sales: {formatCurrency(campaign.sales || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {campaign.acos ? `ACoS: ${campaign.acos.toFixed(1)}%` : ''}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="ml-7 mt-2 space-y-2">
                      {campaignAdGroups.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-4">
                          No ad groups found for this campaign
                        </div>
                      ) : (
                        campaignAdGroups.map((adGroup) => {
                          const adGroupKeywords = getAdGroupKeywords(adGroup.id);
                          const isAdGroupExpanded = expandedAdGroups.has(adGroup.id);
                          
                          return (
                            <Collapsible
                              key={adGroup.id}
                              open={isAdGroupExpanded}
                              onOpenChange={() => toggleAdGroup(adGroup.id)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/30 cursor-pointer bg-muted/10">
                                  <div className="flex items-center gap-3">
                                    {isAdGroupExpanded ? (
                                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <Target className="h-3 w-3 text-green-600" />
                                    <div>
                                      <h5 className="text-sm font-medium">{adGroup.name}</h5>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Badge 
                                          variant={adGroup.status === 'enabled' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {adGroup.status}
                                        </Badge>
                                        <span>{adGroupKeywords.length} keywords</span>
                                        {adGroup.default_bid && (
                                          <span>Bid: {formatCurrency(adGroup.default_bid)}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-medium">
                                      Spend: {formatCurrency(adGroup.spend || 0)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Sales: {formatCurrency(adGroup.sales || 0)}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="ml-6 mt-2 space-y-1">
                                  {adGroupKeywords.length === 0 ? (
                                    <div className="text-xs text-muted-foreground p-3">
                                      No keywords found for this ad group
                                    </div>
                                  ) : (
                                    adGroupKeywords.map((keyword) => (
                                      <div 
                                        key={keyword.id} 
                                        className="flex items-center justify-between p-2 border rounded-sm bg-background"
                                      >
                                        <div className="flex items-center gap-2">
                                          <KeyRound className="h-3 w-3 text-orange-600" />
                                          <div>
                                            <span className="text-xs font-medium">{keyword.keyword_text}</span>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                              <Badge variant="outline" className="text-xs py-0 px-1">
                                                {keyword.match_type}
                                              </Badge>
                                              <Badge 
                                                variant={keyword.status === 'enabled' ? 'default' : 'secondary'}
                                                className="text-xs py-0 px-1"
                                              >
                                                {keyword.status}
                                              </Badge>
                                              {keyword.bid && (
                                                <span>Bid: {formatCurrency(keyword.bid)}</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs">
                                            {formatCurrency(keyword.spend || 0)}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {formatCurrency(keyword.sales || 0)}
                                          </div>
                                          {keyword.clicks > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                              {formatNumber(keyword.clicks)} clicks
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsolidatedDataView;