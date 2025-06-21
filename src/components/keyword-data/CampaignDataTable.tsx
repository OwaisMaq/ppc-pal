
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CampaignData } from '@/hooks/useCampaignData';

interface MockProductData {
  id: string;
  asin: string;
  productName: string;
  category: string;
  price: number;
  units: number;
  revenue: number;
  sessions: number;
  sessionPercentage: number;
  conversionRate: number;
  averageRating: number;
  reviews: number;
  rank: number;
  status: string;
}

interface CampaignDataTableProps {
  campaigns: CampaignData[];
  filteredProducts: MockProductData[];
}

const CampaignDataTable = ({ campaigns, filteredProducts }: CampaignDataTableProps) => {
  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No campaigns found matching your criteria</p>
      </div>
    );
  }

  return (
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
  );
};

export default CampaignDataTable;
