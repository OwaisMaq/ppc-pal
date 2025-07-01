
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from 'lucide-react';

const TrendsCampaignPerformance = () => {
  const mockCampaigns = [
    {
      id: '1',
      name: 'Summer Sale 2024',
      spend: 2450,
      revenue: 9800,
      roas: 4.0,
      trend: 'up',
      change: '+12%'
    },
    {
      id: '2',
      name: 'Brand Awareness',
      spend: 1200,
      revenue: 3360,
      roas: 2.8,
      trend: 'up',
      change: '+5%'
    },
    {
      id: '3',
      name: 'Holiday Promotion',
      spend: 890,
      revenue: 2134,
      roas: 2.4,
      trend: 'down',
      change: '-8%'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance Trends</CardTitle>
        <CardDescription>
          Performance comparison across your campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockCampaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">{campaign.name}</h4>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <span>Spend: ${campaign.spend.toLocaleString()}</span>
                  <span>Revenue: ${campaign.revenue.toLocaleString()}</span>
                  <span>ROAS: {campaign.roas}x</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {campaign.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  campaign.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {campaign.change}
                </span>
                <Badge variant={campaign.roas > 3 ? 'default' : 'secondary'}>
                  {campaign.roas > 3 ? 'Excellent' : 'Good'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendsCampaignPerformance;
