import { useState, useEffect, useMemo } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { useSearchStudio, BulkKeywordPromotion } from "@/hooks/useSearchStudio";
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
  Tags,
  Sprout,
  Check,
  X,
  Loader2,
  Wand2,
  LayoutGrid,
  List
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { DateRangePicker } from "@/components/DateRangePicker";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useDataAvailability } from "@/hooks/useDataAvailability";
import { DataAvailabilityIndicator } from "@/components/DataAvailabilityIndicator";
import { CampaignLevelSelector, CampaignLevel, BulkActionsBar, ProductSection, PerformanceCharts } from "@/components/campaigns";
import { useAmsMetrics } from "@/hooks/useAmsMetrics";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useProductGroupedCampaigns } from "@/hooks/useProductGroupedCampaigns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEntityOptimization } from "@/hooks/useEntityOptimization";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DatePreset = '24h' | '7d' | '30d' | 'custom';
type MatchType = 'exact' | 'phrase';

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
  campaign_id: string;
  ad_group_id: string;
  profile_id: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  acos: number;
  conversions: number;
}

interface Portfolio {
  id: string;
  portfolio_id: string;
  name: string;
  state: string;
  budget_amount_micros: number | null;
  budget_currency: string | null;
  budget_policy: string | null;
  in_budget: boolean;
  campaign_count: number;
  total_spend: number;
  total_sales: number;
  total_clicks: number;
  total_impressions: number;
  acos: number;
  roas: number;
}

const Campaigns = () => {
  const { user } = useAuth();
  const { connections } = useAmazonConnections();
  const { bulkPromoteKeywords, loading: harvestLoading } = useSearchStudio();
  
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
  
  // Harvest selection state
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [bulkMatchType, setBulkMatchType] = useState<MatchType>('exact');
  const [harvestingTermId, setHarvestingTermId] = useState<string | null>(null);
  
  // Bulk selection state for campaigns/ad groups/keywords
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedAdGroups, setSelectedAdGroups] = useState<Set<string>>(new Set());
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const [viewLevel, setViewLevel] = useState<CampaignLevel>('campaigns');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('30d');
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

  // Detailed metrics hook
  const { metrics, loading: metricsLoading } = useAmsMetrics(
    primaryConnection?.id,
    dateRange?.from,
    dateRange?.to
  );

  // Calculate day count for dynamic labels and calculations
  const dayCount = dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 30;

  // Product grouped campaigns hook
  const { 
    productGroups, 
    loading: productGroupsLoading 
  } = useProductGroupedCampaigns(
    primaryConnection?.profile_id,
    dateRange,
    dayCount
  );

  // Entity optimization hook for auto-opt toggles
  const { 
    optimizationMap, 
    toggleOptimization, 
    loading: optLoading 
  } = useEntityOptimization(primaryConnection?.profile_id);

  const handlePresetChange = (preset: DatePreset) => {
    if (!preset) return;
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const days = preset === '24h' ? 1 : preset === '7d' ? 7 : 30;
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
        const [campaignsRes, adGroupsRes, keywordsRes, portfoliosRes] = await Promise.all([
          supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('profile_id', profileId),
          supabase.from('ad_groups').select('id', { count: 'exact', head: true }).eq('profile_id', profileId),
          supabase.from('keywords').select('id', { count: 'exact', head: true }).eq('profile_id', profileId),
          supabase.from('portfolios').select('id', { count: 'exact', head: true }).eq('profile_id', profileId),
        ]);
        
        setTabCounts({
          portfolios: portfoliosRes.count || 0,
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
            await fetchPortfolios(profileId);
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
      id: st.id || `${st.search_term}-${st.campaign_id}-${st.ad_group_id}`,
      search_term: st.search_term || 'N/A',
      keyword_text: st.keyword_text || 'N/A',
      campaign_name: st.campaign_name || 'Unknown Campaign',
      campaign_id: st.campaign_id || '',
      ad_group_id: st.ad_group_id || '',
      profile_id: st.profile_id || profileId,
      impressions: st.impressions || 0,
      clicks: st.clicks || 0,
      spend: st.spend || 0,
      sales: st.sales || 0,
      acos: st.acos || (st.spend && st.sales ? (st.spend / st.sales) * 100 : 0),
      conversions: st.conversions || st.conv_14d || Math.floor((st.sales || 0) / 25),
    }));

    setSearchTerms(searchTermsData);
    // Clear selection when data changes
    setSelectedTerms(new Set());
  };

  const fetchPortfolios = async (profileId: string) => {
    const { data, error } = await supabase
      .from('v_portfolio_metrics')
      .select('*')
      .eq('profile_id', profileId);

    if (error) {
      console.error('fetchPortfolios error:', error);
      throw error;
    }

    console.log('fetchPortfolios data:', data?.length, 'for profile:', profileId);

    const portfoliosData: Portfolio[] = (data || []).map((p: any) => ({
      id: p.portfolio_uuid,
      portfolio_id: p.portfolio_id,
      name: p.portfolio_name || 'Unnamed Portfolio',
      state: p.state || 'enabled',
      budget_amount_micros: p.budget_amount_micros,
      budget_currency: p.budget_currency,
      budget_policy: p.budget_policy,
      in_budget: p.in_budget !== false,
      campaign_count: p.campaign_count || 0,
      total_spend: p.total_spend || 0,
      total_sales: p.total_sales || 0,
      total_clicks: p.total_clicks || 0,
      total_impressions: p.total_impressions || 0,
      acos: p.acos || 0,
      roas: p.roas || 0,
    }));

    setPortfolios(portfoliosData);
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

  const filteredPortfolios = useMemo(() =>
    portfolios.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [portfolios, searchQuery]
  );

  // Counts for tabs - use pre-fetched counts, but update with actual data when available
  const counts = {
    portfolios: tabCounts.portfolios,
    campaigns: tabCounts.campaigns || campaigns.length,
    adGroups: tabCounts.adGroups || adGroups.length,
    targets: tabCounts.targets || keywords.length,
    searchTerms: tabCounts.searchTerms || searchTerms.length,
  };

  // Check if a search term is a high performer (good for harvesting)
  const isHighPerformer = (st: SearchTerm): boolean => {
    return st.conversions >= 1 && st.acos < 40;
  };

  // Toggle selection for a single term
  const toggleTermSelection = (termId: string) => {
    setSelectedTerms(prev => {
      const next = new Set(prev);
      if (next.has(termId)) {
        next.delete(termId);
      } else {
        next.add(termId);
      }
      return next;
    });
  };

  // Toggle select all filtered terms
  const toggleSelectAll = () => {
    if (selectedTerms.size === filteredSearchTerms.length) {
      setSelectedTerms(new Set());
    } else {
      setSelectedTerms(new Set(filteredSearchTerms.map(st => st.id)));
    }
  };

  // Harvest a single search term
  const handleHarvestSingle = async (term: SearchTerm, matchType: MatchType) => {
    if (!term.campaign_id || !term.ad_group_id) {
      toast.error('Missing campaign or ad group information');
      return;
    }
    
    setHarvestingTermId(term.id);
    
    try {
      const promotion: BulkKeywordPromotion = {
        profileId: term.profile_id,
        campaignId: term.campaign_id,
        adGroupId: term.ad_group_id,
        searchTerm: term.search_term,
        matchType,
      };
      
      await bulkPromoteKeywords([promotion]);
      toast.success(`"${term.search_term}" queued as ${matchType} keyword`);
    } catch (err) {
      // Error already handled by the hook
    } finally {
      setHarvestingTermId(null);
    }
  };

  // Harvest multiple selected search terms
  const handleBulkHarvest = async () => {
    const selectedList = filteredSearchTerms.filter(st => selectedTerms.has(st.id));
    
    // Filter out terms without proper IDs
    const validTerms = selectedList.filter(st => st.campaign_id && st.ad_group_id);
    
    if (validTerms.length === 0) {
      toast.error('Selected terms are missing campaign/ad group data');
      return;
    }
    
    const promotions: BulkKeywordPromotion[] = validTerms.map(st => ({
      profileId: st.profile_id,
      campaignId: st.campaign_id,
      adGroupId: st.ad_group_id,
      searchTerm: st.search_term,
      matchType: bulkMatchType,
    }));
    
    try {
      await bulkPromoteKeywords(promotions);
      setSelectedTerms(new Set());
    } catch (err) {
      // Error already handled by the hook
    }
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
        if (filteredPortfolios.length === 0) {
          return renderEmptyState(
            searchQuery ? 'No portfolios match your search' : 'No portfolios found. Sync your Amazon account to load portfolios.',
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground" />
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Portfolio Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Campaigns</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">ACOS</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPortfolios.map((portfolio) => {
                const budgetAmount = portfolio.budget_amount_micros 
                  ? portfolio.budget_amount_micros / 1000000 
                  : null;
                const budgetUtilization = budgetAmount && portfolio.total_spend > 0
                  ? Math.min((portfolio.total_spend / budgetAmount) * 100, 100)
                  : 0;
                
                return (
                  <TableRow key={portfolio.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        {portfolio.name}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(portfolio.state)}</TableCell>
                    <TableCell className="text-right">
                      {budgetAmount ? (
                        <div className="space-y-1">
                          <span className="text-sm">{formatCurrency(budgetAmount)}</span>
                          {portfolio.budget_policy && (
                            <div className="flex items-center gap-1 justify-end">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    portfolio.in_budget ? 'bg-success' : 'bg-destructive'
                                  }`}
                                  style={{ width: `${budgetUtilization}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{budgetUtilization.toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-mono">
                        {portfolio.campaign_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(portfolio.total_spend)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(portfolio.total_sales)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {portfolio.acos > 30 ? (
                          <TrendingUp className="h-3 w-3 text-destructive" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-success" />
                        )}
                        {portfolio.acos.toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{portfolio.roas.toFixed(2)}x</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        );

      case 'campaigns':
        if (filteredCampaigns.length === 0) {
          return renderEmptyState(
            searchQuery ? 'No campaigns match your search' : 'No campaigns found',
            <Layers className="h-12 w-12 mx-auto text-muted-foreground" />
          );
        }
        const allCampaignsSelected = filteredCampaigns.length > 0 && 
          filteredCampaigns.every(c => selectedCampaigns.has(c.campaign_id));
        return (
          <div className="space-y-4">
            {selectedCampaigns.size > 0 && primaryConnection && (
              <BulkActionsBar
                profileId={primaryConnection.profile_id}
                selectedIds={Array.from(selectedCampaigns)}
                entityType="campaign"
                onClear={() => setSelectedCampaigns(new Set())}
                onComplete={() => {
                  setSelectedCampaigns(new Set());
                  // Refetch data
                }}
              />
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allCampaignsSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCampaigns(new Set(filteredCampaigns.map(c => c.campaign_id)));
                        } else {
                          setSelectedCampaigns(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            Auto-Opt
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enable Bayesian auto-optimization</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">ACOS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow 
                    key={campaign.campaign_id}
                    className={selectedCampaigns.has(campaign.campaign_id) ? 'bg-muted/30' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedCampaigns.has(campaign.campaign_id)}
                        onCheckedChange={(checked) => {
                          setSelectedCampaigns(prev => {
                            const next = new Set(prev);
                            if (checked) {
                              next.add(campaign.campaign_id);
                            } else {
                              next.delete(campaign.campaign_id);
                            }
                            return next;
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{campaign.campaign_name}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={optimizationMap.get(campaign.campaign_id) ?? true}
                        onCheckedChange={(checked) => 
                          toggleOptimization(campaign.campaign_id, 'campaign', checked)
                        }
                        disabled={optLoading}
                      />
                    </TableCell>
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
          </div>
        );

      case 'ad-groups':
        if (filteredAdGroups.length === 0) {
          return renderEmptyState(
            searchQuery ? 'No ad groups match your search' : 'No ad groups found',
            <Target className="h-12 w-12 mx-auto text-muted-foreground" />
          );
        }
        const allAdGroupsSelected = filteredAdGroups.length > 0 && 
          filteredAdGroups.every(ag => selectedAdGroups.has(ag.id));
        return (
          <div className="space-y-4">
            {selectedAdGroups.size > 0 && primaryConnection && (
              <BulkActionsBar
                profileId={primaryConnection.profile_id}
                selectedIds={Array.from(selectedAdGroups)}
                entityType="ad_group"
                onClear={() => setSelectedAdGroups(new Set())}
              />
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allAdGroupsSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAdGroups(new Set(filteredAdGroups.map(ag => ag.id)));
                        } else {
                          setSelectedAdGroups(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Ad Group Name</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center w-20">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            Auto-Opt
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enable Bayesian auto-optimization</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">ACOS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdGroups.map((ag) => (
                  <TableRow 
                    key={ag.id}
                    className={selectedAdGroups.has(ag.id) ? 'bg-muted/30' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedAdGroups.has(ag.id)}
                        onCheckedChange={(checked) => {
                          setSelectedAdGroups(prev => {
                            const next = new Set(prev);
                            if (checked) {
                              next.add(ag.id);
                            } else {
                              next.delete(ag.id);
                            }
                            return next;
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{ag.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{ag.campaign_name}</TableCell>
                    <TableCell>{getStatusBadge(ag.status)}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={optimizationMap.get(ag.id) ?? true}
                        onCheckedChange={(checked) => 
                          toggleOptimization(ag.id, 'adgroup', checked)
                        }
                        disabled={optLoading}
                      />
                    </TableCell>
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
          </div>
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
                <TableHead className="text-center w-20">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          Auto-Opt
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enable Bayesian auto-optimization</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
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
                  <TableCell className="text-center">
                    <Switch
                      checked={optimizationMap.get(kw.id) ?? true}
                      onCheckedChange={(checked) => 
                        toggleOptimization(kw.id, 'keyword', checked)
                      }
                      disabled={optLoading}
                    />
                  </TableCell>
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
          <div className="space-y-4">
            {/* Bulk action bar */}
            {selectedTerms.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {selectedTerms.size} term{selectedTerms.size > 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTerms(new Set())}
                    className="h-7 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={bulkMatchType} onValueChange={(v) => setBulkMatchType(v as MatchType)}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">Exact</SelectItem>
                      <SelectItem value="phrase">Phrase</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleBulkHarvest}
                    disabled={harvestLoading}
                    className="gap-1.5"
                  >
                    {harvestLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sprout className="h-3.5 w-3.5" />
                    )}
                    Harvest {selectedTerms.size} Keyword{selectedTerms.size > 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedTerms.size === filteredSearchTerms.length && filteredSearchTerms.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Search Term</TableHead>
                  <TableHead>Matched Keyword</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">ACOS</TableHead>
                  <TableHead className="text-right w-28">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSearchTerms.map((st) => {
                  const isSelected = selectedTerms.has(st.id);
                  const highPerformer = isHighPerformer(st);
                  const isHarvesting = harvestingTermId === st.id;
                  
                  return (
                    <TableRow 
                      key={st.id}
                      className={isSelected ? 'bg-primary/5' : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTermSelection(st.id)}
                          aria-label={`Select ${st.search_term}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{st.search_term}</span>
                          {highPerformer && (
                            <Badge variant="outline" className="text-xs border-success/50 text-success bg-success/10">
                              <Sprout className="h-3 w-3 mr-1" />
                              Harvest
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{st.keyword_text}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{st.campaign_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(st.clicks)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(st.sales)}</TableCell>
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
                      <TableCell className="text-right">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 gap-1"
                              disabled={isHarvesting || !st.campaign_id || !st.ad_group_id}
                            >
                              {isHarvesting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sprout className="h-3 w-3" />
                              )}
                              Harvest
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-2" align="end">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground mb-2">Match type:</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8"
                                onClick={() => handleHarvestSingle(st, 'exact')}
                              >
                                <Check className="h-3 w-3 mr-2" />
                                Exact
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8"
                                onClick={() => handleHarvestSingle(st, 'phrase')}
                              >
                                <Check className="h-3 w-3 mr-2" />
                                Phrase
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
          <div className="space-y-4">
            {/* Filters and Data Availability - Top of Page */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <ToggleGroup
                  type="single"
                  value={selectedPreset}
                  onValueChange={(value) => value && handlePresetChange(value as DatePreset)}
                  className="h-8"
                >
                  <ToggleGroupItem value="24h" className="text-xs px-3 h-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    24h
                  </ToggleGroupItem>
                  <ToggleGroupItem value="7d" className="text-xs px-3 h-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    7d
                  </ToggleGroupItem>
                  <ToggleGroupItem value="30d" className="text-xs px-3 h-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    30d
                  </ToggleGroupItem>
                </ToggleGroup>
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                />
              </div>
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

            {/* Performance Charts - Top/Bottom Performers */}
            <PerformanceCharts
              productGroups={productGroups}
              campaigns={campaigns}
              adGroups={adGroups}
              loading={loading || productGroupsLoading}
            />

            {/* Detailed Metrics Row */}
            <Collapsible defaultOpen>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Detailed Metrics</CardTitle>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {metricsLoading ? (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Clicks</p>
                          <p className="text-lg font-semibold">{metrics?.totalClicks?.toLocaleString() || 0}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Impressions</p>
                          <p className="text-lg font-semibold">{metrics?.totalImpressions?.toLocaleString() || 0}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">CPC</p>
                          <p className="text-lg font-semibold">${metrics?.cpc?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">CTR</p>
                          <p className="text-lg font-semibold">{metrics?.ctr?.toFixed(2) || 0}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">CVR</p>
                          <p className="text-lg font-semibold">{metrics?.conversionRate?.toFixed(2) || 0}%</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* View Mode Toggle and Main Content */}
            <div className="space-y-4">
              {/* Header with View Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Campaign Performance</h2>
                  {autoMode && (
                    <Badge variant="default" className="mt-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Optimization Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grouped' | 'flat')}>
                    <TabsList className="h-9">
                      <TabsTrigger value="grouped" className="gap-1.5 px-3">
                        <LayoutGrid className="h-4 w-4" />
                        By Product
                      </TabsTrigger>
                      <TabsTrigger value="flat" className="gap-1.5 px-3">
                        <List className="h-4 w-4" />
                        All
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Product Grouped View */}
              {viewMode === 'grouped' && (
                <div className="space-y-4">
                  {productGroupsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : productGroups.length === 0 ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <Layers className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground mt-4">No campaigns found</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    productGroups
                      .filter(p => 
                        !searchQuery || 
                        p.asin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.campaigns.some(c => c.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map(product => (
                        <ProductSection
                          key={product.asin}
                          product={product}
                          dayCount={dayCount}
                          selectedCampaigns={selectedCampaigns}
                          optimizationMap={optimizationMap}
                          toggleOptimization={toggleOptimization}
                          optLoading={optLoading}
                          onCampaignSelect={(campaignId, selected) => {
                            setSelectedCampaigns(prev => {
                              const next = new Set(prev);
                              if (selected) {
                                next.add(campaignId);
                              } else {
                                next.delete(campaignId);
                              }
                              return next;
                            });
                          }}
                          onSelectAllInProduct={(campaignIds, selected) => {
                            setSelectedCampaigns(prev => {
                              const next = new Set(prev);
                              campaignIds.forEach(id => {
                                if (selected) {
                                  next.add(id);
                                } else {
                                  next.delete(id);
                                }
                              });
                              return next;
                            });
                          }}
                        />
                      ))
                  )}
                </div>
              )}

              {/* Flat View (Original) */}
              {viewMode === 'flat' && (
                <Card>
                  <CardHeader>
                    <CampaignLevelSelector
                      value={viewLevel}
                      onChange={setViewLevel}
                      counts={counts}
                    />
                  </CardHeader>
                  <CardContent>
                    {renderTable()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
};

export default Campaigns;
