import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SearchTermsTable } from '@/components/SearchTermsTable';
import { NegativesPanel } from '@/components/NegativesPanel';
import { BrandTermsManager } from '@/components/BrandTermsManager';
import { useSearchStudio, SearchTermsFilters } from '@/hooks/useSearchStudio';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Download, Upload, Filter, Search } from 'lucide-react';

export const SearchStudio = () => {
  const { connections } = useAmazonConnections();
  const { 
    searchTerms, 
    loading, 
    fetchSearchTerms, 
    exportSearchTerms, 
    importNegativesCSV 
  } = useSearchStudio();

  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [filters, setFilters] = useState<SearchTermsFilters>({
    profileId: '',
    includeBrand: false,
    includeIgnored: false,
    actionable: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (connections.length > 0 && !selectedProfile) {
      setSelectedProfile(connections[0].profile_id);
      setFilters(prev => ({ ...prev, profileId: connections[0].profile_id }));
    }
  }, [connections, selectedProfile]);

  useEffect(() => {
    if (filters.profileId) {
      fetchSearchTerms(filters);
    }
  }, [filters, fetchSearchTerms]);

  const handleProfileChange = (profileId: string) => {
    setSelectedProfile(profileId);
    setFilters(prev => ({ ...prev, profileId }));
  };

  const handleFilterChange = (key: keyof SearchTermsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    if (filters.profileId) {
      exportSearchTerms(filters);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importNegativesCSV(file);
    }
  };

  // Calculate KPIs for current filters
  const kpis = searchTerms.reduce((acc, term) => {
    acc.spend += term.spend_14d || 0;
    acc.sales += term.sales_14d || 0;
    acc.clicks += term.clicks_14d || 0;
    acc.impressions += term.impressions_14d || 0;
    acc.conversions += term.conv_14d || 0;
    return acc;
  }, { spend: 0, sales: 0, clicks: 0, impressions: 0, conversions: 0 });

  const avgAcos = kpis.sales > 0 ? (kpis.spend / kpis.sales) : 0;
  const avgCpc = kpis.clicks > 0 ? (kpis.spend / kpis.clicks) : 0;
  const avgCvr = kpis.clicks > 0 ? (kpis.conversions / kpis.clicks) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Search Term Studio</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedProfile} onValueChange={handleProfileChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              {connections.map(conn => (
                <SelectItem key={conn.id} value={conn.profile_id}>
                  {conn.profile_name || conn.profile_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="search-terms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search-terms">Search Terms</TabsTrigger>
          <TabsTrigger value="negatives">Negatives</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="search-terms" className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filters</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Search Term</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search terms..."
                        value={filters.q || ''}
                        onChange={(e) => handleFilterChange('q', e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="min-clicks">Min Clicks</Label>
                    <Input
                      id="min-clicks"
                      type="number"
                      placeholder="0"
                      value={filters.minClicks || ''}
                      onChange={(e) => handleFilterChange('minClicks', parseInt(e.target.value) || undefined)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="min-spend">Min Spend</Label>
                    <Input
                      id="min-spend"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={filters.minSpend || ''}
                      onChange={(e) => handleFilterChange('minSpend', parseFloat(e.target.value) || undefined)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="max-acos">Max ACOS</Label>
                    <Input
                      id="max-acos"
                      type="number"
                      step="0.01"
                      placeholder="1.00"
                      value={filters.maxACOS || ''}
                      onChange={(e) => handleFilterChange('maxACOS', parseFloat(e.target.value) || undefined)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="actionable">Actionable</Label>
                    <Select 
                      value={filters.actionable} 
                      onValueChange={(value) => handleFilterChange('actionable', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="harvest">Harvest Opportunities</SelectItem>
                        <SelectItem value="negative">Negative Candidates</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="include-brand"
                        checked={filters.includeBrand}
                        onChange={(e) => handleFilterChange('includeBrand', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="include-brand">Include Brand</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="include-ignored"
                        checked={filters.includeIgnored}
                        onChange={(e) => handleFilterChange('includeIgnored', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="include-ignored">Include Ignored</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">${kpis.spend.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Spend (14d)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">${kpis.sales.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Sales (14d)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{(avgAcos * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Avg ACOS</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{kpis.clicks.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Clicks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{kpis.impressions.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Impressions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">${avgCpc.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Avg CPC</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{(avgCvr * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Avg CVR</div>
              </CardContent>
            </Card>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{searchTerms.length} search terms</Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Search Terms Table */}
          <SearchTermsTable 
            searchTerms={searchTerms} 
            loading={loading}
            profileId={selectedProfile}
          />
        </TabsContent>

        <TabsContent value="negatives">
          <NegativesPanel profileId={selectedProfile} />
        </TabsContent>

        <TabsContent value="lists">
          <BrandTermsManager profileId={selectedProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
};