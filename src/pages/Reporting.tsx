
import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PieChart, Download, RefreshCw } from 'lucide-react';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import FilterBar from '@/components/FilterBar';

const Reporting = () => {
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');

  const { campaigns, loading, refreshCampaigns } = useCampaignData();
  const { connections } = useAmazonConnections();

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Filter campaigns based on selections
  let filteredCampaigns = campaigns;
  
  if (selectedCountry !== 'all') {
    const countryConnections = connections
      .filter(conn => conn.marketplace_id === selectedCountry)
      .map(conn => conn.id);
    filteredCampaigns = filteredCampaigns.filter(campaign => 
      countryConnections.includes(campaign.connection_id)
    );
  }

  if (selectedCampaign !== 'all') {
    filteredCampaigns = filteredCampaigns.filter(campaign => 
      campaign.id === selectedCampaign
    );
  }

  console.log('=== REPORTING PAGE DEBUG ===');
  console.log('Total campaigns:', campaigns.length);
  console.log('Filtered campaigns:', filteredCampaigns.length);
  console.log('Loading:', loading);
  console.log('Sample campaign data:', campaigns.slice(0, 2));

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <PieChart className="h-8 w-8 text-blue-600" />
            Campaign Data Report
          </h1>
          <p className="text-gray-600">
            Complete view of all Amazon Ads campaign data pulled from the API
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={refreshCampaigns} 
              variant="outline" 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <div className="text-sm text-gray-600">
              Showing {filteredCampaigns.length} of {campaigns.length} campaigns
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All Data
          </Button>
        </div>

        <FilterBar
          selectedCountry={selectedCountry}
          selectedAsin={selectedCampaign}
          selectedProduct={selectedProduct}
          onCountryChange={setSelectedCountry}
          onAsinChange={setSelectedCampaign}
          onProductChange={setSelectedProduct}
        />

        <Card>
          <CardHeader>
            <CardTitle>All Campaign Data</CardTitle>
            <CardDescription>
              Raw data from Amazon Advertising API - all fields and metrics as received
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-500">Loading campaign data...</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No campaign data available</p>
                <p className="text-sm text-gray-400 mt-2">
                  Make sure your Amazon connection is synced and active
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>Amazon ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Targeting</TableHead>
                      <TableHead>Daily Budget</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Spend</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>ACOS</TableHead>
                      <TableHead>ROAS</TableHead>
                      <TableHead>Data Source</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium max-w-xs">
                          <div className="truncate" title={campaign.name}>
                            {campaign.name}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {campaign.amazon_campaign_id}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              campaign.status === 'enabled' ? 'default' : 
                              campaign.status === 'paused' ? 'secondary' : 'destructive'
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{campaign.campaign_type || 'N/A'}</TableCell>
                        <TableCell>{campaign.targeting_type || 'N/A'}</TableCell>
                        <TableCell>
                          {campaign.daily_budget ? formatCurrency(campaign.daily_budget) : 'N/A'}
                        </TableCell>
                        <TableCell>{formatDate(campaign.start_date)}</TableCell>
                        <TableCell>{formatDate(campaign.end_date) || 'No end date'}</TableCell>
                        <TableCell>{campaign.impressions.toLocaleString()}</TableCell>
                        <TableCell>{campaign.clicks.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(campaign.spend)}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(campaign.sales)}
                        </TableCell>
                        <TableCell>{campaign.orders}</TableCell>
                        <TableCell className={
                          campaign.acos && campaign.acos < 30 ? 'text-green-600' : 
                          campaign.acos && campaign.acos > 40 ? 'text-red-600' : 'text-yellow-600'
                        }>
                          {campaign.acos ? formatPercentage(campaign.acos) : '-'}
                        </TableCell>
                        <TableCell className={campaign.roas && campaign.roas > 3 ? 'text-green-600' : 'text-gray-600'}>
                          {campaign.roas ? `${campaign.roas.toFixed(2)}x` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={campaign.data_source === 'api' ? 'default' : 'secondary'}>
                            {campaign.data_source || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {campaign.last_updated 
                            ? new Date(campaign.last_updated).toLocaleString()
                            : 'Never'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        {filteredCampaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredCampaigns.length}
                </div>
                <p className="text-sm text-gray-600">Total Campaigns</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(filteredCampaigns.reduce((sum, c) => sum + (c.sales || 0), 0))}
                </div>
                <p className="text-sm text-gray-600">Total Sales</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0))}
                </div>
                <p className="text-sm text-gray-600">Total Spend</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {filteredCampaigns.reduce((sum, c) => sum + (c.orders || 0), 0)}
                </div>
                <p className="text-sm text-gray-600">Total Orders</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default Reporting;
