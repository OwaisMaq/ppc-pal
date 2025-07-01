
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CampaignData } from '@/hooks/useCampaignData';

interface TrendsCampaignPerformanceProps {
  campaigns: CampaignData[];
}

const TrendsCampaignPerformance = ({ campaigns }: TrendsCampaignPerformanceProps) => {
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance Trends</CardTitle>
        <CardDescription>
          Recent performance trends for your active campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No campaign data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>ACOS</TableHead>
                  <TableHead>ROAS</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      <div className="truncate max-w-xs" title={campaign.name}>
                        {campaign.name}
                      </div>
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
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(campaign.sales)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(campaign.spend)}
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
                      {getTrendIcon(0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendsCampaignPerformance;
