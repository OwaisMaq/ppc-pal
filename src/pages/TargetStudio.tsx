import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTargetStudio, TargetFilters } from '@/hooks/useTargetStudio';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import { Download, Upload, Filter, Search, Play, Pause, TrendingUp, TrendingDown, Minus, Plus, ShoppingCart } from 'lucide-react';
import { format, subDays } from 'date-fns';

export const TargetStudio = () => {
  const { connections } = useAmazonConnections();
  const { 
    targets, 
    purchasedProducts,
    summary,
    loading, 
    fetchTargets,
    fetchPurchasedProducts,
    bulkPauseTargets,
    bulkEnableTargets,
    bulkBidUp,
    bulkBidDown,
    bulkAddNegatives,
    exportTargetsCSV
  } = useTargetStudio();

  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [filters, setFilters] = useState<TargetFilters>({
    profileId: '',
    from: format(subDays(new Date(), 14), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    type: undefined,
    sort: 'clicks:desc',
    limit: 100
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [showPurchasedProducts, setShowPurchasedProducts] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  useEffect(() => {
    if (connections.length > 0 && !selectedProfile) {
      setSelectedProfile(connections[0].profile_id);
      setFilters(prev => ({ ...prev, profileId: connections[0].profile_id }));
    }
  }, [connections, selectedProfile]);

  useEffect(() => {
    if (filters.profileId) {
      fetchTargets(filters);
    }
  }, [filters, fetchTargets]);

  const handleProfileChange = (profileId: string) => {
    setSelectedProfile(profileId);
    setFilters(prev => ({ ...prev, profileId }));
  };

  const handleFilterChange = (key: keyof TargetFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTargetSelect = (targetId: string, checked: boolean) => {
    if (checked) {
      setSelectedTargets(prev => [...prev, targetId]);
    } else {
      setSelectedTargets(prev => prev.filter(id => id !== targetId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTargets(targets.map(t => t.targetId));
    } else {
      setSelectedTargets([]);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedTargets.length === 0) return;

    try {
      switch (action) {
        case 'pause':
          await bulkPauseTargets(selectedProfile, selectedTargets);
          break;
        case 'enable':
          await bulkEnableTargets(selectedProfile, selectedTargets);
          break;
        case 'bid-up':
          await bulkBidUp(selectedProfile, selectedTargets, 100000); // $0.10
          break;
        case 'bid-down':
          await bulkBidDown(selectedProfile, selectedTargets, 100000); // $0.10
          break;
      }
      setSelectedTargets([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleShowPurchasedProducts = (target: any) => {
    setSelectedTarget(target);
    fetchPurchasedProducts({
      profileId: selectedProfile,
      from: filters.from,
      to: filters.to,
      campaignId: target.campaignId
    });
    setShowPurchasedProducts(true);
  };

  const formatExpression = (expression: any, type: string) => {
    if (type === 'keyword') {
      return `${expression.keywordText} (${expression.matchType})`;
    } else if (type === 'product') {
      if (expression.asin) {
        return `ASIN: ${expression.asin}`;
      } else if (expression.category) {
        return `Category: ${expression.category}`;
      }
    }
    return JSON.stringify(expression);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Target & ASIN Studio</h1>
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
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={filters.from}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={filters.to}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="type">Target Type</Label>
                <Select 
                  value={filters.type || 'all'} 
                  onValueChange={(value) => handleFilterChange('type', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="keyword">Keywords</SelectItem>
                    <SelectItem value="product">Products</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="max-acos">Max ACOS %</Label>
                <Input
                  id="max-acos"
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  value={filters.maxACOS || ''}
                  onChange={(e) => handleFilterChange('maxACOS', parseFloat(e.target.value) || undefined)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-sales"
                  checked={filters.hasSales || false}
                  onCheckedChange={(checked) => handleFilterChange('hasSales', checked)}
                />
                <Label htmlFor="has-sales">Has Sales</Label>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">${summary.totalSpend.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Spend</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">${summary.totalSales.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Sales</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{summary.avgACOS.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg ACOS</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{summary.totalClicks.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Clicks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{summary.totalImpressions.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Impressions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">${summary.avgCPC.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Avg CPC</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{summary.avgCVR.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg CVR</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedTargets.length === targets.length && targets.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <Badge variant="secondary">
            {selectedTargets.length} of {targets.length} selected
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedTargets.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('pause')}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('enable')}>
                <Play className="h-4 w-4 mr-2" />
                Enable
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('bid-up')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Bid Up
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('bid-down')}>
                <TrendingDown className="h-4 w-4 mr-2" />
                Bid Down
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={() => exportTargetsCSV(filters)}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Targets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 w-12">
                    <Checkbox
                      checked={selectedTargets.length === targets.length && targets.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4">Expression</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Clicks</th>
                  <th className="p-4">Impressions</th>
                  <th className="p-4">Spend</th>
                  <th className="p-4">Sales</th>
                  <th className="p-4">ACOS</th>
                  <th className="p-4">CPC</th>
                  <th className="p-4">CVR</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      Loading targets...
                    </td>
                  </tr>
                ) : targets.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      No targets found
                    </td>
                  </tr>
                ) : (
                  targets.map((target) => (
                    <tr key={target.targetId} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedTargets.includes(target.targetId)}
                          onCheckedChange={(checked) => handleTargetSelect(target.targetId, checked as boolean)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium truncate max-w-xs">
                          {formatExpression(target.expression, target.targetType)}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={target.targetType === 'keyword' ? 'default' : 'secondary'}>
                          {target.targetType}
                        </Badge>
                      </td>
                      <td className="p-4">{target.clicks.toLocaleString()}</td>
                      <td className="p-4">{target.impressions.toLocaleString()}</td>
                      <td className="p-4">${target.spend.toFixed(2)}</td>
                      <td className="p-4">${target.sales.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={target.acos > 30 ? 'text-destructive' : 'text-green-600'}>
                          {target.acos.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4">${target.cpc.toFixed(2)}</td>
                      <td className="p-4">{target.cvr.toFixed(1)}%</td>
                      <td className="p-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowPurchasedProducts(target)}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Purchased Products Sheet */}
      <Sheet open={showPurchasedProducts} onOpenChange={setShowPurchasedProducts}>
        <SheetContent className="w-[600px] sm:w-[800px]">
          <SheetHeader>
            <SheetTitle>Purchased Products</SheetTitle>
            <SheetDescription>
              Products purchased from this target
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {purchasedProducts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No purchased products found
              </div>
            ) : (
              <div className="space-y-2">
                {purchasedProducts.map((product, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="font-medium">{product.purchasedAsin}</div>
                    <div className="text-sm text-muted-foreground">
                      Units: {product.units} • Sales: ${product.sales.toFixed(2)}
                    </div>
                    {product.advertisedAsin && (
                      <div className="text-sm text-muted-foreground">
                        Advertised: {product.advertisedAsin}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};