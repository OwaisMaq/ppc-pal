
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Campaign } from '@/hooks/useCampaignData';

interface CampaignDataTableProps {
  campaigns: Campaign[];
  title?: string;
  description?: string;
}

const CampaignDataTable = ({ 
  campaigns, 
  title = "Campaign Performance Data",
  description = "Detailed performance metrics for all your campaigns"
}: CampaignDataTableProps) => {
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'archived':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getAcosColor = (acos: number | undefined) => {
    if (!acos) return 'text-gray-500';
    if (acos < 20) return 'text-green-600';
    if (acos < 35) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRoasColor = (roas: number | undefined) => {
    if (!roas) return 'text-gray-500';
    if (roas > 4) return 'text-green-600';
    if (roas > 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No campaign data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description} - Showing {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">ACOS</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">Daily Budget</TableHead>
                <TableHead>Data Source</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="truncate" title={campaign.name}>
                      {campaign.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {campaign.campaign_type || '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {formatCurrency(campaign.sales)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(campaign.spend)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(campaign.orders)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(campaign.impressions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(campaign.clicks)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getAcosColor(campaign.acos)}`}>
                    {campaign.acos ? formatPercentage(campaign.acos) : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getRoasColor(campaign.roas)}`}>
                    {campaign.roas ? `${campaign.roas.toFixed(2)}x` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.daily_budget ? formatCurrency(campaign.daily_budget) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={campaign.data_source === 'api' ? 'default' : 'secondary'}>
                      {campaign.data_source || 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {campaign.last_updated 
                      ? new Date(campaign.last_updated).toLocaleDateString() 
                      : '-'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignDataTable;
