import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PieChart, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useAmazonConnections } from '@/hooks/useAmazonConnections';
import FilterBar from '@/components/FilterBar';
import { filterRealDataOnly } from '@/utils/dataFilter';

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

  // Filter to only real API campaigns - NO SIMULATED DATA
  const realApiCampaigns = filterRealDataOnly(campaigns);
  
  // Apply additional filters
  let filteredCampaigns = realApiCampaigns;
  
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

  console.log('=== REPORTING PAGE - REAL DATA ONLY ===');
  console.log('Total campaigns from API:', campaigns.length);
  console.log('Real API campaigns (filtered):', realApiCampaigns.length);
  console.log('Final filtered campaigns:', filteredCampaigns.length);
  console.log('Loading:', loading);

  const handleRefreshCampaigns = () => {
    refreshCampaigns();
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <PieChart className="h-8 w-8 text-blue-600" />
            Campaign Data Report
          </h1>
          <p className="text-gray-600">
            Real Amazon Ads campaign data from API - no simulated data included
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleRefreshCampaigns} 
              variant="outline" 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <div className="text-sm text-gray-600">
              Showing {filteredCampaigns.length} real API campaigns
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Real Data
          </Button>
        </div>

        {realApiCampaigns.length === 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-orange-800">No Real Campaign Data Available</h3>
                  <p className="text-sm text-orange-700">
                    No real Amazon API data found. Please sync your Amazon connection to get actual campaign data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
            <CardTitle>Real Campaign Data Only</CardTitle>
            <CardDescription>
              Amazon Advertising API data - simulated data excluded, empty fields shown when no data available
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
                <p className="text-gray-500">No real campaign data available</p>
                <p className="text-sm text-gray-400 mt-2">
                  Sync your Amazon connection to get actual campaign performance data
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
                            {campaign.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {campaign.amazon_campaign_id || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              campaign.status === 'enabled' ? 'default' : 
                              campaign.status === 'paused' ? 'secondary' : 'destructive'
                            }
                          >
                            {campaign.status || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>{campaign.campaign_type || '-'}</TableCell>
                        <TableCell>{campaign.targeting_type || '-'}</TableCell>
                        <TableCell>
                          {campaign.daily_budget ? formatCurrency(campaign.daily_budget) : '-'}
                        </TableCell>
                        <TableCell>{campaign.start_date ? formatDate(campaign.start_date) : '-'}</TableCell>
                        <TableCell>{campaign.end_date ? formatDate(campaign.end_date) : '-'}</TableCell>
                        <TableCell>{campaign.impressions ? campaign.impressions.toLocaleString() : '0'}</TableCell>
                        <TableCell>{campaign.clicks ? campaign.clicks.toLocaleString() : '0'}</TableCell>
                        <TableCell className="font-semibold">
                          {campaign.spend ? formatCurrency(campaign.spend) : '$0.00'}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {campaign.sales ? formatCurrency(campaign.sales) : '$0.00'}
                        </TableCell>
                        <TableCell>{campaign.orders || '0'}</TableCell>
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
                          <Badge variant="default">
                            {campaign.data_source === 'api' ? 'API' : 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {campaign.last_updated 
                            ? new Date(campaign.last_updated).toLocaleString()
                            : '-'
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

        {/* Summary Statistics - Only for real data */}
        {filteredCampaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredCampaigns.length}
                </div>
                <p className="text-sm text-gray-600">Real API Campaigns</p>
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
