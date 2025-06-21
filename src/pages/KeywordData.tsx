
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Search, TrendingUp, Package, Filter, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useKeywordData } from '@/hooks/useKeywordData';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';

const KeywordData = () => {
  const [activeTab, setActiveTab] = useState('keywords');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { connections } = useAmazonConnections();
  const { keywords, loading: keywordsLoading } = useKeywordData();
  const { campaigns, loading: campaignsLoading } = useCampaignData();

  const loading = keywordsLoading || campaignsLoading;

  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (keyword.campaign_name && keyword.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || keyword.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Transform campaigns data to look like products for the products tab
  const mockProductData = campaigns.map((campaign, index) => ({
    id: campaign.id,
    asin: `B0${String(index + 1).padStart(7, '0')}`,
    productName: campaign.name,
    category: campaign.campaign_type || 'Sponsored Products',
    price: campaign.sales && campaign.orders ? (campaign.sales / campaign.orders) : 0,
    units: campaign.orders,
    revenue: campaign.sales,
    sessions: campaign.clicks * 10, // Estimate sessions as 10x clicks
    sessionPercentage: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
    conversionRate: campaign.clicks > 0 ? (campaign.orders / campaign.clicks) * 100 : 0,
    averageRating: 4.0 + Math.random() * 1, // Mock rating
    reviews: Math.floor(Math.random() * 1000) + 100, // Mock reviews
    rank: index + 1,
    status: campaign.status === 'enabled' ? 'In Stock' : 'Out of Stock'
  }));

  const filteredProducts = mockProductData.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.asin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status.toLowerCase().includes(statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  // Calculate real statistics
  const totalKeywords = keywords.length;
  const totalProducts = campaigns.length;
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
  const averageRoas = campaigns.length > 0 ? 
    campaigns.reduce((sum, c) => {
      const roas = c.spend > 0 ? c.sales / c.spend : 0;
      return sum + roas;
    }, 0) / campaigns.length : 0;

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              Keyword/Product Data
            </h1>
            <p className="text-gray-600">Loading your keyword and campaign data...</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!keywords.length && !campaigns.length) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              Keyword/Product Data
            </h1>
            <p className="text-gray-600">
              Manage and analyze your keyword and product performance data
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {connections.length === 0 
                ? "No Amazon accounts connected yet. Connect your Amazon Ads account to view keyword and campaign data."
                : "No campaign data available yet. Sync your Amazon account to import campaign and keyword data."
              }
            </AlertDescription>
          </Alert>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            Keyword/Product Data
          </h1>
          <p className="text-gray-600">
            Manage and analyze your keyword and product performance data
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Keywords</p>
                  <p className="text-2xl font-bold">{totalKeywords.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Campaigns Tracked</p>
                  <p className="text-2xl font-bold">{totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. ROAS</p>
                  <p className="text-2xl font-bold">{averageRoas.toFixed(1)}x</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance Data</CardTitle>
                <CardDescription>
                  Detailed analysis of keyword and campaign performance metrics from your Amazon Ads account
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="keywords" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Keywords ({filteredKeywords.length})
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Campaigns ({filteredProducts.length})
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search keywords or campaigns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="enabled">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value="keywords" className="overflow-x-auto">
                {filteredKeywords.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Match Type</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Impressions</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>CTR</TableHead>
                        <TableHead>CPC</TableHead>
                        <TableHead>Spend</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>ACOS</TableHead>
                        <TableHead>ROAS</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredKeywords.map((keyword) => (
                        <TableRow key={keyword.id}>
                          <TableCell className="font-medium">{keyword.keyword_text}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{keyword.match_type}</Badge>
                          </TableCell>
                          <TableCell>{keyword.campaign_name || 'Unknown'}</TableCell>
                          <TableCell>{keyword.impressions.toLocaleString()}</TableCell>
                          <TableCell>{keyword.clicks}</TableCell>
                          <TableCell>{keyword.ctr ? formatPercentage(keyword.ctr) : '-'}</TableCell>
                          <TableCell>{keyword.cpc ? formatCurrency(keyword.cpc) : '-'}</TableCell>
                          <TableCell>{formatCurrency(keyword.spend)}</TableCell>
                          <TableCell>{keyword.orders}</TableCell>
                          <TableCell>{formatCurrency(keyword.sales)}</TableCell>
                          <TableCell className={
                            keyword.acos && keyword.acos < 30 ? 'text-green-600' : 
                            keyword.acos && keyword.acos > 40 ? 'text-red-600' : 'text-yellow-600'
                          }>
                            {keyword.acos ? formatPercentage(keyword.acos) : '-'}
                          </TableCell>
                          <TableCell className={keyword.roas && keyword.roas > 3 ? 'text-green-600' : 'text-gray-600'}>
                            {keyword.roas ? `${keyword.roas.toFixed(2)}x` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={keyword.status === 'enabled' ? 'default' : 'secondary'}>
                              {keyword.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No keywords found matching your criteria</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="products" className="overflow-x-auto">
                {filteredProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign ID</TableHead>
                        <TableHead>Campaign Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Impressions</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>CTR</TableHead>
                        <TableHead>Spend</TableHead>
                        <TableHead>ACOS</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const campaign = campaigns.find(c => c.id === product.id);
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-mono text-sm">{product.asin}</TableCell>
                            <TableCell className="font-medium max-w-xs truncate">{product.productName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.category}</Badge>
                            </TableCell>
                            <TableCell>{campaign?.daily_budget ? formatCurrency(campaign.daily_budget) : '-'}</TableCell>
                            <TableCell>{product.units}</TableCell>
                            <TableCell className="text-green-600 font-medium">{formatCurrency(product.revenue)}</TableCell>
                            <TableCell>{campaign?.impressions.toLocaleString()}</TableCell>
                            <TableCell>{campaign?.clicks}</TableCell>
                            <TableCell>{formatPercentage(product.sessionPercentage)}</TableCell>
                            <TableCell>{campaign ? formatCurrency(campaign.spend) : '-'}</TableCell>
                            <TableCell className={
                              campaign?.acos && campaign.acos < 30 ? 'text-green-600' : 
                              campaign?.acos && campaign.acos > 40 ? 'text-red-600' : 'text-yellow-600'
                            }>
                              {campaign?.acos ? formatPercentage(campaign.acos) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.status === 'In Stock' ? 'default' : 'destructive'}>
                                {product.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No campaigns found matching your criteria</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default KeywordData;
