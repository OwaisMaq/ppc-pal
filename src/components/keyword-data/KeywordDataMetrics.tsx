
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Search, TrendingUp, Package } from 'lucide-react';

interface KeywordDataMetricsProps {
  totalKeywords: number;
  totalCampaigns: number;
  averageRoas: number;
  totalRevenue: number;
}

const KeywordDataMetrics = ({ 
  totalKeywords, 
  totalCampaigns, 
  averageRoas, 
  totalRevenue 
}: KeywordDataMetricsProps) => {
  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
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
              <p className="text-2xl font-bold">{totalCampaigns}</p>
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
  );
};

export default KeywordDataMetrics;
