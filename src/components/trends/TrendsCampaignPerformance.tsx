
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { CampaignData } from '@/hooks/useCampaignData';

interface TrendsCampaignPerformanceProps {
  campaigns: CampaignData[];
}

const TrendsCampaignPerformance = ({ campaigns }: TrendsCampaignPerformanceProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          Campaign Performance
        </CardTitle>
        <CardDescription>
          Top performing campaigns this period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {campaigns.slice(0, 5).map((campaign, index) => (
            <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{campaign.name.substring(0, 30)}...</p>
                <p className="text-sm text-gray-600">
                  ROAS: {campaign.spend > 0 ? (campaign.sales / campaign.spend).toFixed(2) : '0.00'}x
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${campaign.sales?.toFixed(2) || '0.00'}</p>
                <p className="text-sm text-gray-600">Sales</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendsCampaignPerformance;
