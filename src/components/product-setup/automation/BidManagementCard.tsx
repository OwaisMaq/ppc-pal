
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Zap } from 'lucide-react';

interface BidManagementCardProps {
  autoBidding: boolean;
  bidAdjustmentRange: number[];
  performanceThreshold: number[];
  onAutoBiddingChange: (enabled: boolean) => void;
  onBidAdjustmentChange: (range: number[]) => void;
  onPerformanceThresholdChange: (threshold: number[]) => void;
}

const BidManagementCard: React.FC<BidManagementCardProps> = ({
  autoBidding,
  bidAdjustmentRange,
  performanceThreshold,
  onAutoBiddingChange,
  onBidAdjustmentChange,
  onPerformanceThresholdChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Automated Bid Management
        </CardTitle>
        <CardDescription>
          Let AI automatically adjust bids based on performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-bidding">Enable Automated Bidding</Label>
            <p className="text-sm text-gray-500">
              Automatically increase/decrease bids based on keyword performance
            </p>
          </div>
          <Switch
            id="auto-bidding"
            checked={autoBidding}
            onCheckedChange={onAutoBiddingChange}
          />
        </div>

        {autoBidding && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            <div className="space-y-3">
              <Label>Maximum Bid Adjustment: ±{bidAdjustmentRange[0]}%</Label>
              <Slider
                min={5}
                max={50}
                step={5}
                value={bidAdjustmentRange}
                onValueChange={onBidAdjustmentChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>5% (Conservative)</span>
                <span>50% (Aggressive)</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Performance Review Period: {performanceThreshold[0]} days</Label>
              <Slider
                min={3}
                max={30}
                step={1}
                value={performanceThreshold}
                onValueChange={onPerformanceThresholdChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>3 days (Reactive)</span>
                <span>30 days (Conservative)</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BidManagementCard;
