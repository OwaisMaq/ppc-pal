import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { useBidModels } from '@/hooks/useBidModels';

interface ModelAccuracyCardProps {
  profileId?: string;
}

export function ModelAccuracyCard({ profileId }: ModelAccuracyCardProps) {
  const { data, isLoading, error } = useBidModels(profileId);

  if (!profileId) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const { stats } = data;
  
  const getAccuracyLevel = (rSquared: number) => {
    if (rSquared >= 0.8) return { label: 'Excellent', color: 'text-success', bg: 'bg-success/10' };
    if (rSquared >= 0.6) return { label: 'Good', color: 'text-primary', bg: 'bg-primary/10' };
    if (rSquared >= 0.4) return { label: 'Moderate', color: 'text-warning', bg: 'bg-warning/10' };
    return { label: 'Learning', color: 'text-muted-foreground', bg: 'bg-muted' };
  };

  const accuracy = getAccuracyLevel(stats.averageRSquared);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <LineChart className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Model Accuracy</CardTitle>
              <CardDescription>
                Bid-response curve fitting performance
              </CardDescription>
            </div>
          </div>
          
          <Badge variant="outline" className={`${accuracy.color} ${accuracy.bg}`}>
            {accuracy.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* R² Score */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">R² Score</span>
            </div>
            <p className={`text-3xl font-bold ${accuracy.color}`}>
              {stats.averageRSquared.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.averageRSquared >= 0.8 
                ? 'Models accurately predict bid performance'
                : 'Models are still learning patterns'}
            </p>
          </div>
          
          {/* RMSE */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">RMSE</span>
            </div>
            <p className="text-3xl font-bold">
              {stats.averageRmse.toFixed(3)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Average prediction error
            </p>
          </div>
          
          {/* Models Fitted */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Models Fitted</span>
            </div>
            <p className="text-3xl font-bold">
              {stats.modelsFitted}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              of {stats.totalModels} total entities
            </p>
          </div>
          
          {/* Optimal Bids Found */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Optimal Bids</span>
            </div>
            <p className="text-3xl font-bold text-success">
              {stats.modelsWithOptimalBid}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Entities with calculated optimal bid
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
