import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { 
  Search, 
  Play, 
  Pause, 
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  campaign_type: string;
  targeting_type: string;
  status: string;
  budget: number;
  budget_type: string;
  daily_spend: number;
  impressions: number;
  clicks: number;
  sales: number;
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
  conversions: number;
}

interface CampaignDetails {
  campaign: Campaign;
  keywords: any[];
  adGroups: any[];
}

const Campaigns = () => {
  const { user } = useAuth();
  const { connections } = useAmazonConnections();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const [viewLevel, setViewLevel] = useState<'campaigns' | 'ad-groups'>('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const hasConnections = connections.length > 0;
  const primaryConnection = connections[0];

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!user || !primaryConnection) {
        setLoading(false);
        return;
      }

      try {
        // Fetch campaigns from campaign daily view
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('v_campaign_daily')
          .select('*')
          .eq('profile_id', primaryConnection.profile_id)
          .gte('date', thirtyDaysAgo);

        if (error) throw error;

        // Aggregate metrics by campaign
        const campaignMap = new Map<string, Campaign>();
        
        data?.forEach((row: any) => {
          const campaignId = row.campaign_id;
          
          if (!campaignMap.has(campaignId)) {
            campaignMap.set(campaignId, {
              campaign_id: campaignId,
              campaign_name: row.campaign_name || 'Unknown',
              campaign_type: row.campaign_type || 'N/A',
              targeting_type: row.targeting_type || 'N/A',
              status: row.status || 'unknown',
              budget: row.budget || 0,
              budget_type: row.budget_type || 'daily',
              daily_spend: 0,
              impressions: 0,
              clicks: 0,
              sales: 0,
              acos: 0,
              roas: 0,
              ctr: 0,
              cpc: 0,
              conversions: 0,
            });
          }
          
          const campaign = campaignMap.get(campaignId)!;
          campaign.daily_spend += row.spend || 0;
          campaign.impressions += row.impressions || 0;
          campaign.clicks += row.clicks || 0;
          campaign.sales += row.sales || 0;
        });

        // Calculate averages and ratios
        const campaignsArray = Array.from(campaignMap.values()).map(campaign => {
          const avgSpend = campaign.daily_spend / 30;
          const impressions = campaign.impressions;
          const clicks = campaign.clicks;
          
          return {
            ...campaign,
            daily_spend: avgSpend,
            acos: campaign.sales > 0 ? (campaign.daily_spend / campaign.sales) * 100 : 0,
            roas: campaign.daily_spend > 0 ? campaign.sales / campaign.daily_spend : 0,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpc: clicks > 0 ? avgSpend / clicks : 0,
            conversions: Math.floor(campaign.sales / 25), // Estimate conversions
          };
        });

        setCampaigns(campaignsArray);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        toast.error('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [user, primaryConnection]);

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCampaignClick = async (campaign: Campaign) => {
    setDetailsLoading(true);
    setSelectedCampaign({ campaign, keywords: [], adGroups: [] });
    
    try {
      // Fetch ad groups for this campaign
      const { data: adGroups } = await supabase
        .from('v_ad_group_daily')
        .select('*')
        .eq('campaign_id', campaign.campaign_id)
        .limit(10);

      setSelectedCampaign({
        campaign,
        keywords: [], // Keywords will be shown in ad group drill-down
        adGroups: adGroups || [],
      });
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      toast.error('Failed to load campaign details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'enabled') {
      return <Badge variant="default" className="gap-1"><Play className="h-3 w-3" />Active</Badge>;
    } else if (statusLower === 'paused') {
      return <Badge variant="secondary" className="gap-1"><Pause className="h-3 w-3" />Paused</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Campaigns
            </h1>
            <p className="text-muted-foreground">
              Manage and monitor your Amazon Advertising campaigns
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="auto-mode" className="text-sm font-medium">Auto-Mode</Label>
            <Switch
              id="auto-mode"
              checked={autoMode}
              onCheckedChange={setAutoMode}
            />
          </div>
        </div>

        {!hasConnections ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-800">
                No Amazon connections found. Please connect your account in Settings.
              </p>
              <div className="mt-3">
                <Button asChild>
                  <Link to="/settings">Go to Settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Campaign Performance</CardTitle>
                  <CardDescription>
                    {autoMode && (
                      <Badge variant="default" className="mt-1">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Optimization Active
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={viewLevel} onValueChange={(value: any) => setViewLevel(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campaigns">Campaigns</SelectItem>
                      <SelectItem value="ad-groups">Ad Groups</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No campaigns match your search' : 'No campaigns found'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Spend (30d)</TableHead>
                      <TableHead className="text-right">ACOS</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow 
                        key={campaign.campaign_id}
                        className="cursor-pointer"
                        onClick={() => handleCampaignClick(campaign)}
                      >
                        <TableCell className="font-medium">
                          {campaign.campaign_name}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(campaign.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campaign.daily_spend * 30)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {campaign.acos > 30 ? (
                              <TrendingUp className="h-3 w-3 text-destructive" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-success" />
                            )}
                            {campaign.acos.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info('AI suggestions coming soon!');
                            }}
                          >
                            <Sparkles className="h-4 w-4 text-brand-accent" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Campaign Details Dialog */}
        <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCampaign?.campaign.campaign_name}</DialogTitle>
            </DialogHeader>
            
            {detailsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : selectedCampaign && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">CTR</div>
                      <div className="text-2xl font-bold">
                        {selectedCampaign.campaign.ctr.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">CPC</div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(selectedCampaign.campaign.cpc)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Conversions</div>
                      <div className="text-2xl font-bold">
                        {selectedCampaign.campaign.conversions}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">ROAS</div>
                      <div className="text-2xl font-bold">
                        {selectedCampaign.campaign.roas.toFixed(2)}x
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs for Keywords and Ad Groups */}
                <Tabs defaultValue="keywords" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="keywords">Keywords ({selectedCampaign.keywords.length})</TabsTrigger>
                    <TabsTrigger value="adgroups">Ad Groups ({selectedCampaign.adGroups.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="keywords" className="mt-4">
                    {selectedCampaign.keywords.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No keywords found</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead className="text-right">Clicks</TableHead>
                            <TableHead className="text-right">Spend</TableHead>
                            <TableHead className="text-right">Sales</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedCampaign.keywords.map((kw: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{kw.keyword_text || 'N/A'}</TableCell>
                              <TableCell className="text-right">{kw.clicks || 0}</TableCell>
                              <TableCell className="text-right">{formatCurrency(kw.spend || 0)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(kw.sales || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                  <TabsContent value="adgroups" className="mt-4">
                    {selectedCampaign.adGroups.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No ad groups found</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ad Group</TableHead>
                            <TableHead className="text-right">Impressions</TableHead>
                            <TableHead className="text-right">Clicks</TableHead>
                            <TableHead className="text-right">Spend</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedCampaign.adGroups.map((ag: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{ag.adgroup_name || 'N/A'}</TableCell>
                              <TableCell className="text-right">{formatNumber(ag.impressions || 0)}</TableCell>
                              <TableCell className="text-right">{formatNumber(ag.clicks || 0)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(ag.spend || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
};

export default Campaigns;
