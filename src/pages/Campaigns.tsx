import { useState, useEffect, useMemo } from "react";
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
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Search, 
  Play, 
  Pause, 
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  Briefcase,
  Layers,
  Tags
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { DateRangePicker } from "@/components/DateRangePicker";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useDataAvailability } from "@/hooks/useDataAvailability";
import { DataAvailabilityIndicator } from "@/components/DataAvailabilityIndicator";
import { CampaignLevelSelector, CampaignLevel } from "@/components/campaigns/CampaignLevelSelector";

type DatePreset = '7D' | '14D' | '30D' | '90D' | 'custom';

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

interface AdGroup {
  id: string;
  name: string;
  campaign_name: string;
  status: string;
  default_bid: number;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  acos: number;
  roas: number;
}

interface Keyword {
  id: string;
  keyword_text: string;
  match_type: string;
  adgroup_name: string;
  campaign_name: string;
  status: string;
  bid: number;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  acos: number;
}

interface SearchTerm {
  id: string;
  search_term: string;
  keyword_text: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  acos: number;
}

interface Portfolio {
  id: string;
  name: string;
  budget: number;
  campaigns_count: number;
  spend: number;
  sales: number;
  acos: number;
}

const Campaigns = () => {
  const { user } = useAuth();
  const { connections } = useAmazonConnections();
  
  // Main data states
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  
  // Separate counts state for tab badges
  const [tabCounts, setTabCounts] = useState({
    portfolios: 0,
    campaigns: 0,
    adGroups: 0,
    targets: 0,
    searchTerms: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const [viewLevel, setViewLevel] = useState<CampaignLevel>('campaigns');
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('30D');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const hasConnections = connections.length > 0;
  const primaryConnection = connections[0];
  
  // Data availability hook
  const { 
    minDate, 
    maxDate, 
    hasData, 
    loading: availabilityLoading,
    importProgress 
  } = useDataAvailability(primaryConnection?.profile_id);

  // Calculate day count for dynamic labels and calculations
  const dayCount = dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 30;

  const handlePresetChange = (preset: DatePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const days = preset === '7D' ? 7 : preset === '14D' ? 14 : preset === '30D' ? 30 : 90;
      setDateRange({
        from: subDays(new Date(), days),
        to: new Date(),
      });
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
      setSelectedPreset('custom');
    }
  };

  // Fetch counts for all tabs on mount and when profile changes
  useEffect(() => {
    const fetchCounts = async () => {
      if (!primaryConnection) return;
      
      const profileId = primaryConnection.profile_id;
      
      try {
        const [campaignsRes, adGroupsRes, keywordsRes] = await Promise.all([
          supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('profile_id', profileId),
          supabase.from('ad_groups').select('id', { count: 'exact', head: true }).eq('profile_id', profileId),
          supabase.from('keywords').select('id', { count: 'exact', head: true }).eq('profile_id', profileId),
        ]);
        
        setTabCounts({
          portfolios: 0, // Not implemented yet
          campaigns: campaignsRes.count || 0,
          adGroups: adGroupsRes.count || 0,
          targets: keywordsRes.count || 0,
          searchTerms: 0, // Will be set when fetched
        });
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    
    fetchCounts();
  }, [primaryConnection]);

  // Fetch data based on current view level
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !primaryConnection) {
        setLoading(false);
        return;
      }

      if (!dateRange?.from || !dateRange?.to) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        const profileId = primaryConnection.profile_id;

        switch (viewLevel) {
          case 'campaigns':
            await fetchCampaigns(profileId);
            break;
          case 'ad-groups':
            await fetchAdGroups(profileId);
            break;
          case 'targets':
            await fetchKeywords(profileId);
            break;
          case 'search-terms':
            await fetchSearchTerms(profileId);
            break;
          case 'portfolios':
            // Portfolios not yet available - show placeholder
            setPortfolios([]);
            break;
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, primaryConnection, dateRange, viewLevel, dayCount]);

  const fetchCampaigns = async (profileId: string) => {
    const fromDate = dateRange!.from!.toISOString().split('T')[0];
    const toDate = dateRange!.to!.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('v_campaign_daily')
      .select('*')
      .eq('profile_id', profileId)
      .gte('date', fromDate)
      .lte('date', toDate);

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
      const totalSpend = campaign.daily_spend;
      const avgSpend = totalSpend / dayCount;
      
      return {
        ...campaign,
        daily_spend: avgSpend,
        acos: campaign.sales > 0 ? (totalSpend / campaign.sales) * 100 : 0,
        roas: totalSpend > 0 ? campaign.sales / totalSpend : 0,
        ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
        cpc: campaign.clicks > 0 ? avgSpend / campaign.clicks : 0,
        conversions: Math.floor(campaign.sales / 25),
      };
    });

    setCampaigns(campaignsArray);
  };

  const fetchAdGroups = async (profileId: string) => {
    const { data, error } = await supabase
      .from('ad_groups')
      .select(`
        id,
        name,
        status,
        default_bid,
        impressions,
        clicks,
        spend,
        sales,
        acos,
        roas,
        campaign_id,
        campaigns(name)
      `)
      .eq('profile_id', profileId);

    if (error) {
      console.error('fetchAdGroups error:', error);
      throw error;
    }

    console.log('fetchAdGroups data:', data?.length, 'for profile:', profileId);

    const adGroupsData: AdGroup[] = (data || []).map((ag: any) => ({
      id: ag.id,
      name: ag.name,
      campaign_name: ag.campaigns?.name || 'Unknown Campaign',
      status: ag.status || 'unknown',
      default_bid: ag.default_bid || 0,
      impressions: ag.impressions || 0,
      clicks: ag.clicks || 0,
      spend: ag.spend || 0,
      sales: ag.sales || 0,
      acos: ag.acos || 0,
      roas: ag.roas || 0,
    }));

    setAdGroups(adGroupsData);
  };

  const fetchKeywords = async (profileId: string) => {
    const { data, error } = await supabase
      .from('keywords')
      .select(`
        id,
        keyword_text,
        match_type,
        status,
        bid,
        impressions,
        clicks,
        spend,
        sales,
        acos,
        adgroup_id,
        ad_groups(name, campaign_id, campaigns(name))
      `)
      .eq('profile_id', profileId);

    if (error) {
      console.error('fetchKeywords error:', error);
      throw error;
    }

    console.log('fetchKeywords data:', data?.length, 'for profile:', profileId);

    const keywordsData: Keyword[] = (data || []).map((kw: any) => ({
      id: kw.id,
      keyword_text: kw.keyword_text || 'N/A',
      match_type: kw.match_type || 'N/A',
      adgroup_name: kw.ad_groups?.name || 'Unknown Ad Group',
      campaign_name: kw.ad_groups?.campaigns?.name || 'Unknown Campaign',
      status: kw.status || 'unknown',
      bid: kw.bid || 0,
      impressions: kw.impressions || 0,
      clicks: kw.clicks || 0,
      spend: kw.spend || 0,
      sales: kw.sales || 0,
      acos: kw.acos || 0,
    }));

    setKeywords(keywordsData);
  };

  const fetchSearchTerms = async (profileId: string) => {
    const { data, error } = await supabase
      .from('v_studio_search_terms')
      .select('*')
      .eq('profile_id', profileId)
      .limit(500);

    if (error) throw error;

    const searchTermsData: SearchTerm[] = (data || []).map((st: any) => ({
      id: st.id || `${st.search_term}-${st.campaign_id}`,
      search_term: st.search_term || 'N/A',
      keyword_text: st.keyword_text || 'N/A',
      campaign_name: st.campaign_name || 'Unknown Campaign',
      impressions: st.impressions || 0,
      clicks: st.clicks || 0,
      spend: st.spend || 0,
      sales: st.sales || 0,
      acos: st.acos || (st.spend && st.sales ? (st.spend / st.sales) * 100 : 0),
    }));

    setSearchTerms(searchTermsData);
  };

  // Filter functions
  const filteredCampaigns = useMemo(() => 
    campaigns.filter(c => c.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())),
    [campaigns, searchQuery]
  );

  const filteredAdGroups = useMemo(() =>
    adGroups.filter(ag => 
      ag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ag.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [adGroups, searchQuery]
  );

  const filteredKeywords = useMemo(() =>
    keywords.filter(kw => 
      kw.keyword_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kw.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [keywords, searchQuery]
  );

  const filteredSearchTerms = useMemo(() =>
    searchTerms.filter(st => 
      st.search_term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [searchTerms, searchQuery]
  );

  // Counts for tabs - use pre-fetched counts, but update with actual data when available
  const counts = {
    portfolios: tabCounts.portfolios,
    campaigns: tabCounts.campaigns || campaigns.length,
    adGroups: tabCounts.adGroups || adGroups.length,
    targets: tabCounts.targets || keywords.length,
    searchTerms: tabCounts.searchTerms || searchTerms.length,
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
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

  const renderEmptyState = (message: string, icon: React.ReactNode) => (
    <div className="text-center py-12">
      {icon}
      <p className="text-muted-foreground mt-4">{message}</p>
    </div>
  );

  const renderTable = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    switch (viewLevel) {
      case 'portfolios':
        return renderEmptyState(
          'Portfolios feature coming soon',
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground" />
        );

      case 'campaigns':
        if (filteredCampaigns.length === 0) {
          return renderEmptyState(
            searchQuery ? 'No campaigns match your search' : 'No campaigns found',
            <Layers className="h-12 w-12 mx-auto text-muted-foreground" />
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">ACOS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.campaign_id}>
                  <TableCell className="font-medium">{campaign.campaign_name}</TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.impressions)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(campaign.daily_spend * dayCount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(campaign.sales)}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'ad-groups':
        if (filteredAdGroups.length === 0) {
          return renderEmptyState(
            searchQuery ? 'No ad groups match your search' : 'No ad groups found',
            <Target className="h-12 w-12 mx-auto text-muted-foreground" />
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Group Name</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ACOS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdGroups.map((ag) => (
                <TableRow key={ag.id}>
                  <TableCell className="font-medium">{ag.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{ag.campaign_name}</TableCell>
                  <TableCell>{getStatusBadge(ag.status)}</TableCell>
                  <TableCell className="text-right">{formatNumber(ag.impressions)}</TableCell>
                  <TableCell className="text-right">{formatNumber(ag.clicks)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(ag.spend)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {ag.acos > 30 ? (
                        <TrendingUp className="h-3 w-3 text-destructive" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-success" />
                      )}
                      {ag.acos?.toFixed(1) || '0.0'}%
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'targets':
        if (filteredKeywords.length === 0) {
          return renderEmptyState(
            searchQuery ? 'No keywords match your search' : 'No keywords found',
            <Tags className="h-12 w-12 mx-auto text-muted-foreground" />
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Match Type</TableHead>
                <TableHead>Ad Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Bid</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ACOS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeywords.map((kw) => (
                <TableRow key={kw.id}>
                  <TableCell className="font-medium">{kw.keyword_text}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{kw.match_type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{kw.adgroup_name}</TableCell>
                  <TableCell>{getStatusBadge(kw.status)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(kw.bid)}</TableCell>
                  <TableCell className="text-right">{formatNumber(kw.clicks)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(kw.spend)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {kw.acos > 30 ? (
                        <TrendingUp className="h-3 w-3 text-destructive" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-success" />
                      )}
                      {kw.acos?.toFixed(1) || '0.0'}%
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'search-terms':
        if (filteredSearchTerms.length === 0) {
          return renderEmptyState(
            searchQuery ? 'No search terms match your search' : 'No search terms found',
            <Search className="h-12 w-12 mx-auto text-muted-foreground" />
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Search Term</TableHead>
                <TableHead>Matched Keyword</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ACOS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSearchTerms.map((st) => (
                <TableRow key={st.id}>
                  <TableCell className="font-medium">{st.search_term}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{st.keyword_text}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{st.campaign_name}</TableCell>
                  <TableCell className="text-right">{formatNumber(st.impressions)}</TableCell>
                  <TableCell className="text-right">{formatNumber(st.clicks)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(st.spend)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {st.acos > 30 ? (
                        <TrendingUp className="h-3 w-3 text-destructive" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-success" />
                      )}
                      {st.acos?.toFixed(1) || '0.0'}%
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
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
                
                {/* Campaign Level Selector Tabs */}
                <CampaignLevelSelector
                  value={viewLevel}
                  onChange={setViewLevel}
                  counts={counts}
                />
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {(['7D', '14D', '30D', '90D'] as DatePreset[]).map((preset) => (
                      <Button
                        key={preset}
                        variant={selectedPreset === preset ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePresetChange(preset)}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  <DateRangePicker
                    value={dateRange}
                    onChange={handleDateRangeChange}
                  />
                </div>
              </div>
            </CardHeader>
            
            {/* Data Availability Indicator */}
            <div className="px-6 pb-4">
              <DataAvailabilityIndicator
                minDate={minDate}
                maxDate={maxDate}
                hasData={hasData}
                loading={availabilityLoading}
                selectedFrom={dateRange?.from}
                selectedTo={dateRange?.to}
                importProgress={importProgress}
              />
            </div>
            
            <CardContent>
              {renderTable()}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
};

export default Campaigns;
