
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Pause } from 'lucide-react';

interface AutoPausingCardProps {
  autoPausing: boolean;
  pauseThreshold: string;
  onAutoPausingChange: (enabled: boolean) => void;
  onPauseThresholdChange: (threshold: string) => void;
}

const AutoPausingCard: React.FC<AutoPausingCardProps> = ({
  autoPausing,
  pauseThreshold,
  onAutoPausingChange,
  onPauseThresholdChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pause className="h-5 w-5 text-blue-600" />
          Auto-Pausing
        </CardTitle>
        <CardDescription>
          Automatically pause underperforming keywords
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-pausing">Enable Auto-Pausing</Label>
            <p className="text-sm text-gray-500">
              Pause keywords that exceed ACOS threshold without conversions
            </p>
          </div>
          <Switch
            id="auto-pausing"
            checked={autoPausing}
            onCheckedChange={onAutoPausingChange}
          />
        </div>

        {autoPausing && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            <div className="space-y-2">
              <Label htmlFor="pause-threshold">ACOS Threshold for Pausing (%)</Label>
              <Input
                id="pause-threshold"
                type="number"
                placeholder="50"
                value={pauseThreshold}
                onChange={(e) => onPauseThresholdChange(e.target.value)}
                className="w-32"
              />
              <p className="text-xs text-gray-500">
                Keywords with ACOS above this threshold will be paused
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoPausingCard;
