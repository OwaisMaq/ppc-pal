
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Clock } from 'lucide-react';

interface OptimizationScheduleCardProps {
  autoOptimization: boolean;
  optimizationFrequency: number[];
  onAutoOptimizationChange: (enabled: boolean) => void;
  onFrequencyChange: (frequency: number[]) => void;
}

const OptimizationScheduleCard: React.FC<OptimizationScheduleCardProps> = ({
  autoOptimization,
  optimizationFrequency,
  onAutoOptimizationChange,
  onFrequencyChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Automatic Optimization Schedule
        </CardTitle>
        <CardDescription>
          Enable automatic optimization to run at regular intervals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-optimization">Enable Automatic Optimization</Label>
            <p className="text-sm text-gray-500">
              Run AI optimization automatically at scheduled intervals
            </p>
          </div>
          <Switch
            id="auto-optimization"
            checked={autoOptimization}
            onCheckedChange={onAutoOptimizationChange}
          />
        </div>

        {autoOptimization && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            <div className="space-y-3">
              <Label>Optimization Frequency: Every {optimizationFrequency[0]} hours</Label>
              <Slider
                min={6}
                max={168}
                step={6}
                value={optimizationFrequency}
                onValueChange={onFrequencyChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>6 hours (Frequent)</span>
                <span>168 hours / 1 week (Conservative)</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OptimizationScheduleCard;
