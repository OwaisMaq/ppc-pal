import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { 
  Search, 
  MoreVertical, 
  Play, 
  Pause, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  Target
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "react-router-dom";

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
}

const Campaigns = () => {
  const { user } = useAuth();
  const { connections } = useAmazonConnections();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
            });
          }
          
          const campaign = campaignMap.get(campaignId)!;
          campaign.daily_spend += row.spend || 0;
          campaign.impressions += row.impressions || 0;
          campaign.clicks += row.clicks || 0;
          campaign.sales += row.sales || 0;
        });

        // Calculate averages and ratios
        const campaignsArray = Array.from(campaignMap.values()).map(campaign => ({
          ...campaign,
          daily_spend: campaign.daily_spend / 30,
          acos: campaign.sales > 0 ? (campaign.daily_spend / campaign.sales) * 100 : 0,
          roas: campaign.daily_spend > 0 ? campaign.sales / campaign.daily_spend : 0,
        }));

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Campaigns
          </h1>
          <p className="text-gray-600">
            Manage and monitor your Amazon Advertising campaigns
          </p>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign List</CardTitle>
                  <CardDescription>
                    Performance metrics from the last 30 days
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns..."
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
                      <TableHead>Campaign</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Daily Spend</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">ACOS</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.campaign_id}>
                        <TableCell className="font-medium">
                          {campaign.campaign_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.campaign_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(campaign.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campaign.budget)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campaign.daily_spend)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.impressions)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.clicks)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campaign.sales)}
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
                        <TableCell className="text-right">
                          {campaign.roas.toFixed(2)}x
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Adjust Budget
                              </DropdownMenuItem>
                              {campaign.status.toLowerCase() === 'enabled' ? (
                                <DropdownMenuItem>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause Campaign
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem>
                                  <Play className="h-4 w-4 mr-2" />
                                  Enable Campaign
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
};

export default Campaigns;
