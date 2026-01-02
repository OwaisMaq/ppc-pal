import { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchStudio, SearchTerm as StudioSearchTerm, BulkKeywordPromotion, BulkNegative } from "@/hooks/useSearchStudio";
import { NegativesPanel } from "@/components/NegativesPanel";
import { BrandTermsManager } from "@/components/BrandTermsManager";
import { toast } from "sonner";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Sprout,
  Check,
  X,
  Loader2,
  ChevronDown,
  Filter,
  Download,
  Upload,
  Ban,
  Eye,
  EyeOff,
  Sparkles,
  DollarSign,
  MousePointer,
  ShoppingCart,
  BarChart3,
  Percent,
} from "lucide-react";

type MatchType = 'exact' | 'phrase';
type BulkAction = 'harvest' | 'negative' | 'ignore';
type NegativeScope = 'campaign' | 'ad_group';

interface SearchTermsViewProps {
  profileId: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface LocalSearchTerm {
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
  ctr: number;
  cvr: number;
  is_brand: boolean;
  is_ignored: boolean;
}

interface Filters {
  minClicks?: number;
  minSpend?: number;
  maxAcos?: number;
  actionable: 'all' | 'harvest' | 'negative';
  includeBrand: boolean;
  includeIgnored: boolean;
  query: string;
}

export const SearchTermsView = ({ profileId, dateFrom, dateTo }: SearchTermsViewProps) => {
  const {
    loading: hookLoading,
    fetchSearchTerms,
    bulkPromoteKeywords,
    bulkAddNegatives,
    addToIgnoreList,
    exportSearchTerms,
    importNegativesCSV,
  } = useSearchStudio();

  // Local state
  const [searchTerms, setSearchTerms] = useState<LocalSearchTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk action state
  const [bulkAction, setBulkAction] = useState<BulkAction>('harvest');
  const [bulkMatchType, setBulkMatchType] = useState<MatchType>('exact');
  const [negativeScope, setNegativeScope] = useState<NegativeScope>('ad_group');

  // Filters
  const [filters, setFilters] = useState<Filters>({
    actionable: 'all',
    includeBrand: true,
    includeIgnored: false,
    query: '',
  });

  // Fetch search terms
  const loadSearchTerms = useCallback(async () => {
    if (!profileId) return;
    
    setLoading(true);
    try {
      const data = await fetchSearchTerms({
        profileId,
        from: dateFrom?.toISOString().split('T')[0],
        to: dateTo?.toISOString().split('T')[0],
        minClicks: filters.minClicks,
        minSpend: filters.minSpend,
        maxACOS: filters.maxAcos,
        includeBrand: filters.includeBrand,
        includeIgnored: filters.includeIgnored,
        actionable: filters.actionable === 'all' ? undefined : filters.actionable,
        limit: 500,
      });

      const mapped: LocalSearchTerm[] = (data || []).map((st: StudioSearchTerm) => ({
        id: `${st.campaign_id}-${st.ad_group_id}-${st.search_term}`,
        search_term: st.search_term,
        keyword_text: '',
        campaign_name: '',
        campaign_id: st.campaign_id,
        ad_group_id: st.ad_group_id,
        profile_id: st.profile_id,
        impressions: st.impressions_14d || 0,
        clicks: st.clicks_14d || 0,
        spend: st.spend_14d || 0,
        sales: st.sales_14d || 0,
        acos: st.acos_14d || 0,
        conversions: st.conv_14d || 0,
        ctr: st.ctr_14d || 0,
        cvr: st.cvr_14d || 0,
        is_brand: st.is_brand || false,
        is_ignored: st.is_ignored || false,
      }));

      setSearchTerms(mapped);
      setSelectedTerms(new Set());
    } catch (err) {
      console.error('Failed to fetch search terms:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId, dateFrom, dateTo, filters, fetchSearchTerms]);

  // Initial load
  useState(() => {
    loadSearchTerms();
  });

  // Apply filters locally for text search
  const filteredSearchTerms = useMemo(() => {
    return searchTerms.filter(st => {
      if (filters.query && !st.search_term.toLowerCase().includes(filters.query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [searchTerms, filters.query]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalSpend = filteredSearchTerms.reduce((sum, st) => sum + st.spend, 0);
    const totalSales = filteredSearchTerms.reduce((sum, st) => sum + st.sales, 0);
    const totalClicks = filteredSearchTerms.reduce((sum, st) => sum + st.clicks, 0);
    const totalImpressions = filteredSearchTerms.reduce((sum, st) => sum + st.impressions, 0);
    const totalConversions = filteredSearchTerms.reduce((sum, st) => sum + st.conversions, 0);

    return {
      spend: totalSpend,
      sales: totalSales,
      acos: totalSales > 0 ? (totalSpend / totalSales) * 100 : 0,
      clicks: totalClicks,
      impressions: totalImpressions,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
    };
  }, [filteredSearchTerms]);

  // Check if a search term is a high performer (good for harvesting)
  const isHighPerformer = (st: LocalSearchTerm): boolean => {
    return st.conversions >= 1 && st.acos < 40;
  };

  // Check if a search term is a negative candidate
  const isNegativeCandidate = (st: LocalSearchTerm): boolean => {
    return st.clicks >= 10 && st.conversions === 0;
  };

  // Get recommended action
  const getRecommendedAction = (st: LocalSearchTerm): 'harvest' | 'negative' | null => {
    if (isHighPerformer(st)) return 'harvest';
    if (isNegativeCandidate(st)) return 'negative';
    return null;
  };

  // Toggle selection
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

  const toggleSelectAll = () => {
    if (selectedTerms.size === filteredSearchTerms.length) {
      setSelectedTerms(new Set());
    } else {
      setSelectedTerms(new Set(filteredSearchTerms.map(st => st.id)));
    }
  };

  // Bulk harvest
  const handleBulkHarvest = async () => {
    const selectedList = filteredSearchTerms.filter(st => selectedTerms.has(st.id));
    const validTerms = selectedList.filter(st => st.campaign_id && st.ad_group_id);

    if (validTerms.length === 0) {
      toast.error('Selected terms are missing campaign/ad group data');
      return;
    }

    setProcessingAction(true);
    try {
      const promotions: BulkKeywordPromotion[] = validTerms.map(st => ({
        profileId: st.profile_id,
        campaignId: st.campaign_id,
        adGroupId: st.ad_group_id,
        searchTerm: st.search_term,
        matchType: bulkMatchType,
      }));

      await bulkPromoteKeywords(promotions);
      setSelectedTerms(new Set());
    } finally {
      setProcessingAction(false);
    }
  };

  // Bulk negative
  const handleBulkNegative = async () => {
    const selectedList = filteredSearchTerms.filter(st => selectedTerms.has(st.id));
    const validTerms = selectedList.filter(st => st.campaign_id && st.ad_group_id);

    if (validTerms.length === 0) {
      toast.error('Selected terms are missing campaign/ad group data');
      return;
    }

    setProcessingAction(true);
    try {
      const negatives: BulkNegative[] = validTerms.map(st => ({
        profileId: st.profile_id,
        scope: negativeScope,
        campaignId: st.campaign_id,
        adGroupId: negativeScope === 'ad_group' ? st.ad_group_id : undefined,
        negativeType: 'keyword',
        matchType: bulkMatchType,
        value: st.search_term,
      }));

      await bulkAddNegatives(negatives);
      setSelectedTerms(new Set());
    } finally {
      setProcessingAction(false);
    }
  };

  // Bulk ignore
  const handleBulkIgnore = async () => {
    const selectedList = filteredSearchTerms.filter(st => selectedTerms.has(st.id));

    if (selectedList.length === 0) return;

    setProcessingAction(true);
    try {
      for (const st of selectedList) {
        await addToIgnoreList(st.profile_id, st.search_term);
      }
      toast.success(`${selectedList.length} terms added to ignore list`);
      setSelectedTerms(new Set());
      loadSearchTerms();
    } finally {
      setProcessingAction(false);
    }
  };

  // Execute bulk action
  const executeBulkAction = () => {
    switch (bulkAction) {
      case 'harvest':
        handleBulkHarvest();
        break;
      case 'negative':
        handleBulkNegative();
        break;
      case 'ignore':
        handleBulkIgnore();
        break;
    }
  };

  // Export
  const handleExport = async () => {
    try {
      await exportSearchTerms({
        profileId,
        from: dateFrom?.toISOString().split('T')[0],
        to: dateTo?.toISOString().split('T')[0],
        minClicks: filters.minClicks,
        minSpend: filters.minSpend,
        maxACOS: filters.maxAcos,
      });
    } catch (err) {
      // Error handled in hook
    }
  };

  // Import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importNegativesCSV(file);
    } catch (err) {
      // Error handled in hook
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Apply filters
  const handleApplyFilters = () => {
    loadSearchTerms();
    setFiltersOpen(false);
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

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Tabs defaultValue="terms" className="space-y-4">
      <TabsList>
        <TabsTrigger value="terms">Search Terms</TabsTrigger>
        <TabsTrigger value="negatives">Negatives</TabsTrigger>
        <TabsTrigger value="brand-terms">Brand Terms</TabsTrigger>
      </TabsList>

      <TabsContent value="terms" className="space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3 w-3" />
              <span>Spend</span>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(kpis.spend)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ShoppingCart className="h-3 w-3" />
              <span>Sales</span>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(kpis.sales)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Percent className="h-3 w-3" />
              <span>ACOS</span>
            </div>
            <p className={`text-lg font-semibold ${kpis.acos > 30 ? 'text-destructive' : 'text-success'}`}>
              {formatPercent(kpis.acos)}
            </p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <MousePointer className="h-3 w-3" />
              <span>Clicks</span>
            </div>
            <p className="text-lg font-semibold">{formatNumber(kpis.clicks)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Eye className="h-3 w-3" />
              <span>Impressions</span>
            </div>
            <p className="text-lg font-semibold">{formatNumber(kpis.impressions)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BarChart3 className="h-3 w-3" />
              <span>CPC</span>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(kpis.cpc)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Sparkles className="h-3 w-3" />
              <span>CVR</span>
            </div>
            <p className="text-lg font-semibold">{formatPercent(kpis.cvr)}</p>
          </Card>
        </div>

        {/* Filters & Actions Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search terms..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="pl-8 w-64"
              />
            </div>

            {/* Advanced Filters Toggle */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          {/* Export/Import */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Import Negatives
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <Collapsible open={filtersOpen}>
          <CollapsibleContent>
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Clicks</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minClicks || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minClicks: e.target.value ? parseInt(e.target.value) : undefined }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Spend</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={filters.minSpend || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minSpend: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max ACOS</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={filters.maxAcos || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxAcos: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Actionable</Label>
                  <Select
                    value={filters.actionable}
                    onValueChange={(v) => setFilters(prev => ({ ...prev, actionable: v as 'all' | 'harvest' | 'negative' }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="harvest">Harvest Candidates</SelectItem>
                      <SelectItem value="negative">Negative Candidates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4 col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeBrand"
                      checked={filters.includeBrand}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeBrand: checked === true }))}
                    />
                    <Label htmlFor="includeBrand" className="text-xs">Include Brand</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeIgnored"
                      checked={filters.includeIgnored}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeIgnored: checked === true }))}
                    />
                    <Label htmlFor="includeIgnored" className="text-xs">Include Ignored</Label>
                  </div>
                  <Button size="sm" onClick={handleApplyFilters}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Bulk Actions Bar */}
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
              {/* Action Type */}
              <Select value={bulkAction} onValueChange={(v) => setBulkAction(v as BulkAction)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="harvest">
                    <span className="flex items-center gap-1.5">
                      <Sprout className="h-3 w-3" />
                      Harvest
                    </span>
                  </SelectItem>
                  <SelectItem value="negative">
                    <span className="flex items-center gap-1.5">
                      <Ban className="h-3 w-3" />
                      Negative
                    </span>
                  </SelectItem>
                  <SelectItem value="ignore">
                    <span className="flex items-center gap-1.5">
                      <EyeOff className="h-3 w-3" />
                      Ignore
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Match Type (for harvest/negative) */}
              {bulkAction !== 'ignore' && (
                <Select value={bulkMatchType} onValueChange={(v) => setBulkMatchType(v as MatchType)}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Exact</SelectItem>
                    <SelectItem value="phrase">Phrase</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Negative Scope (for negative action) */}
              {bulkAction === 'negative' && (
                <Select value={negativeScope} onValueChange={(v) => setNegativeScope(v as NegativeScope)}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ad_group">Ad Group Level</SelectItem>
                    <SelectItem value="campaign">Campaign Level</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button
                size="sm"
                onClick={executeBulkAction}
                disabled={processingAction}
                className="gap-1.5"
              >
                {processingAction ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : bulkAction === 'harvest' ? (
                  <Sprout className="h-3.5 w-3.5" />
                ) : bulkAction === 'negative' ? (
                  <Ban className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                {bulkAction === 'harvest' ? 'Harvest' : bulkAction === 'negative' ? 'Add Negative' : 'Ignore'}
                {` (${selectedTerms.size})`}
              </Button>
            </div>
          </div>
        )}

        {/* Search Terms Table */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredSearchTerms.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-4">No search terms found</p>
            <p className="text-sm text-muted-foreground">Search terms will appear after your campaigns receive traffic</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
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
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Conv</TableHead>
                  <TableHead className="text-right">CVR</TableHead>
                  <TableHead className="text-right">ACOS</TableHead>
                  <TableHead className="text-center">Flags</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSearchTerms.map((st) => {
                  const isSelected = selectedTerms.has(st.id);
                  const recommendedAction = getRecommendedAction(st);

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
                        <span className="font-medium">{st.search_term}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatNumber(st.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(st.clicks)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatPercent(st.ctr)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(st.spend)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(st.sales)}</TableCell>
                      <TableCell className="text-right">{st.conversions}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatPercent(st.cvr)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {st.acos > 30 ? (
                            <TrendingUp className="h-3 w-3 text-destructive" />
                          ) : st.acos > 0 ? (
                            <TrendingDown className="h-3 w-3 text-success" />
                          ) : null}
                          <span className={st.acos > 30 ? 'text-destructive' : st.acos < 15 && st.acos > 0 ? 'text-success' : ''}>
                            {formatPercent(st.acos)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {st.is_brand && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">Brand</Badge>
                          )}
                          {st.is_ignored && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">Ignored</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {recommendedAction === 'harvest' && (
                          <Badge variant="outline" className="text-xs border-success/50 text-success bg-success/10 gap-1">
                            <Sprout className="h-3 w-3" />
                            Harvest
                          </Badge>
                        )}
                        {recommendedAction === 'negative' && (
                          <Badge variant="outline" className="text-xs border-destructive/50 text-destructive bg-destructive/10 gap-1">
                            <Ban className="h-3 w-3" />
                            Negative
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="negatives">
        <NegativesPanel profileId={profileId} />
      </TabsContent>

      <TabsContent value="brand-terms">
        <BrandTermsManager profileId={profileId} />
      </TabsContent>
    </Tabs>
  );
};
