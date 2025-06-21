
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Search, TrendingUp, TrendingDown, Package, Filter, Download } from 'lucide-react';

const mockKeywordData = [
  {
    id: 1,
    keyword: 'wireless headphones',
    matchType: 'Phrase',
    campaign: 'Summer Electronics',
    impressions: 15420,
    clicks: 387,
    ctr: 2.51,
    cpc: 2.84,
    spend: 1099.08,
    orders: 23,
    sales: 2847.32,
    acos: 38.6,
    roas: 2.59,
    conversionRate: 5.94,
    status: 'Active'
  },
  {
    id: 2,
    keyword: 'bluetooth speakers',
    matchType: 'Exact',
    campaign: 'Audio Devices',
    impressions: 8934,
    clicks: 201,
    ctr: 2.25,
    cpc: 1.97,
    spend: 395.97,
    orders: 18,
    sales: 1782.45,
    acos: 22.2,
    roas: 4.5,
    conversionRate: 8.96,
    status: 'Active'
  },
  {
    id: 3,
    keyword: 'gaming headset',
    matchType: 'Broad',
    campaign: 'Gaming Accessories',
    impressions: 22156,
    clicks: 445,
    ctr: 2.01,
    cpc: 3.12,
    spend: 1388.4,
    orders: 31,
    sales: 4125.67,
    acos: 33.7,
    roas: 2.97,
    conversionRate: 6.97,
    status: 'Active'
  },
  {
    id: 4,
    keyword: 'phone case clear',
    matchType: 'Phrase',
    campaign: 'Mobile Accessories',
    impressions: 12367,
    clicks: 298,
    ctr: 2.41,
    cpc: 1.45,
    spend: 432.1,
    orders: 42,
    sales: 1176.84,
    acos: 36.7,
    roas: 2.72,
    conversionRate: 14.09,
    status: 'Active'
  },
  {
    id: 5,
    keyword: 'laptop stand adjustable',
    matchType: 'Exact',
    campaign: 'Office Equipment',
    impressions: 6789,
    clicks: 156,
    ctr: 2.30,
    cpc: 2.67,
    spend: 416.52,
    orders: 12,
    sales: 958.44,
    acos: 43.5,
    roas: 2.30,
    conversionRate: 7.69,
    status: 'Active'
  },
  {
    id: 6,
    keyword: 'smart watch fitness',
    matchType: 'Broad',
    campaign: 'Wearable Tech',
    impressions: 18945,
    clicks: 512,
    ctr: 2.70,
    cpc: 4.23,
    spend: 2165.76,
    orders: 28,
    sales: 5124.32,
    acos: 42.3,
    roas: 2.37,
    conversionRate: 5.47,
    status: 'Paused'
  }
];

const mockProductData = [
  {
    id: 1,
    asin: 'B08XY123ZQ',
    productName: 'Wireless Noise-Canceling Headphones',
    category: 'Electronics',
    price: 149.99,
    units: 156,
    revenue: 23398.44,
    sessions: 2847,
    sessionPercentage: 5.48,
    conversionRate: 8.21,
    averageRating: 4.5,
    reviews: 2847,
    rank: 142,
    status: 'In Stock'
  },
  {
    id: 2,
    asin: 'B09AB456CD',
    productName: 'Portable Bluetooth Speaker',
    category: 'Audio',
    price: 79.99,
    units: 203,
    revenue: 16237.97,
    sessions: 1923,
    sessionPercentage: 10.56,
    conversionRate: 12.34,
    averageRating: 4.7,
    reviews: 1456,
    rank: 89,
    status: 'In Stock'
  },
  {
    id: 3,
    asin: 'B07CD789EF',
    productName: 'Gaming Mechanical Keyboard',
    category: 'Computers',
    price: 129.99,
    units: 98,
    revenue: 12739.02,
    sessions: 1567,
    sessionPercentage: 6.25,
    conversionRate: 7.89,
    averageRating: 4.3,
    reviews: 934,
    rank: 67,
    status: 'In Stock'
  },
  {
    id: 4,
    asin: 'B06EF012GH',
    productName: 'Smartphone Clear Case',
    category: 'Accessories',
    price: 24.99,
    units: 421,
    revenue: 10516.79,
    sessions: 3421,
    sessionPercentage: 12.31,
    conversionRate: 15.67,
    averageRating: 4.6,
    reviews: 567,
    rank: 23,
    status: 'In Stock'
  },
  {
    id: 5,
    asin: 'B05GH345IJ',
    productName: 'Adjustable Laptop Stand',
    category: 'Office',
    price: 89.99,
    units: 134,
    revenue: 12058.66,
    sessions: 1876,
    sessionPercentage: 7.14,
    conversionRate: 9.23,
    averageRating: 4.4,
    reviews: 743,
    rank: 156,
    status: 'Low Stock'
  }
];

const KeywordData = () => {
  const [activeTab, setActiveTab] = useState('keywords');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredKeywords = mockKeywordData.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         keyword.campaign.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || keyword.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = mockProductData.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.asin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status.toLowerCase().includes(statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

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
                  <p className="text-2xl font-bold">1,247</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Products Tracked</p>
                  <p className="text-2xl font-bold">156</p>
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
                  <p className="text-2xl font-bold">3.2x</p>
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
                  <p className="text-2xl font-bold text-green-600">$84,573</p>
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
                  Detailed analysis of keyword and product performance metrics
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
                  Keywords
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search keywords or products..."
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="in stock">In Stock</SelectItem>
                    <SelectItem value="low stock">Low Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value="keywords" className="overflow-x-auto">
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
                        <TableCell className="font-medium">{keyword.keyword}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{keyword.matchType}</Badge>
                        </TableCell>
                        <TableCell>{keyword.campaign}</TableCell>
                        <TableCell>{keyword.impressions.toLocaleString()}</TableCell>
                        <TableCell>{keyword.clicks}</TableCell>
                        <TableCell>{formatPercentage(keyword.ctr)}</TableCell>
                        <TableCell>{formatCurrency(keyword.cpc)}</TableCell>
                        <TableCell>{formatCurrency(keyword.spend)}</TableCell>
                        <TableCell>{keyword.orders}</TableCell>
                        <TableCell>{formatCurrency(keyword.sales)}</TableCell>
                        <TableCell className={keyword.acos < 30 ? 'text-green-600' : keyword.acos > 40 ? 'text-red-600' : 'text-yellow-600'}>
                          {formatPercentage(keyword.acos)}
                        </TableCell>
                        <TableCell className={keyword.roas > 3 ? 'text-green-600' : 'text-gray-600'}>
                          {keyword.roas.toFixed(2)}x
                        </TableCell>
                        <TableCell>
                          <Badge variant={keyword.status === 'Active' ? 'default' : 'secondary'}>
                            {keyword.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="products" className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ASIN</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Units Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Conv. Rate</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Reviews</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">{product.asin}</TableCell>
                        <TableCell className="font-medium max-w-xs truncate">{product.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>{product.units}</TableCell>
                        <TableCell className="text-green-600 font-medium">{formatCurrency(product.revenue)}</TableCell>
                        <TableCell>{product.sessions.toLocaleString()}</TableCell>
                        <TableCell>{formatPercentage(product.conversionRate)}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          <span>{product.averageRating}</span>
                          <span className="text-yellow-500">★</span>
                        </TableCell>
                        <TableCell>{product.reviews.toLocaleString()}</TableCell>
                        <TableCell>#{product.rank}</TableCell>
                        <TableCell>
                          <Badge variant={product.status === 'In Stock' ? 'default' : 'destructive'}>
                            {product.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
};

export default KeywordData;
