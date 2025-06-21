
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { KeywordData } from '@/hooks/useKeywordData';

interface KeywordDataTableProps {
  keywords: KeywordData[];
}

const KeywordDataTable = ({ keywords }: KeywordDataTableProps) => {
  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  if (keywords.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No keywords found matching your criteria</p>
      </div>
    );
  }

  return (
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
        {keywords.map((keyword) => (
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
  );
};

export default KeywordDataTable;
