
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, Clock } from "lucide-react";

interface SyncProgressIndicatorProps {
  isActive: boolean;
  progress: number;
  currentStep: string;
  estimatedTimeRemaining: number;
}

const SyncProgressIndicator = ({ 
  isActive, 
  progress, 
  currentStep, 
  estimatedTimeRemaining 
}: SyncProgressIndicatorProps) => {
  if (!isActive) return null;

  const isComplete = progress >= 100;

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          )}
          Amazon Data Sync in Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blue-700">{currentStep}</span>
            <span className="text-blue-600">{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
        
        {!isComplete && estimatedTimeRemaining > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Clock className="h-4 w-4" />
            <span>Estimated time remaining: {estimatedTimeRemaining} seconds</span>
          </div>
        )}

        {isComplete && (
          <div className="text-sm text-green-700 font-medium">
            ✅ Sync completed! Refreshing your data...
          </div>
        )}

        <div className="text-xs text-blue-600 bg-white/50 p-2 rounded">
          <strong>What we're doing:</strong> Connecting to Amazon's advertising API to fetch your campaign data and performance metrics. This process may take 30-60 seconds.
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncProgressIndicator;
