import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, TrendingUp, Activity, Clock, Target, Zap } from 'lucide-react';
import { useBidOptimizerStatus } from '@/hooks/useBidOptimizerStatus';
import { formatDistanceToNow } from 'date-fns';

interface BidOptimizerStatusCardProps {
  profileId?: string;
}

export function BidOptimizerStatusCard({ profileId }: BidOptimizerStatusCardProps) {
  const { data: status, isLoading, error } = useBidOptimizerStatus(profileId);

  if (!profileId) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !status) {
    return null;
  }

  const getConfidenceBadgeVariant = (avgConfidence: number) => {
    if (avgConfidence >= 80) return 'default';
    if (avgConfidence >= 50) return 'secondary';
    return 'outline';
  };

  const getStatusColor = (avgConfidence: number) => {
    if (avgConfidence >= 80) return 'text-success';
    if (avgConfidence >= 50) return 'text-warning';
    return 'text-muted-foreground';
  };

  const isLearning = status.daysSinceStart < 7 || status.learningProgress < 30;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Smart Bid Optimizer</CardTitle>
              <CardDescription>
                {isLearning 
                  ? 'Learning phase - collecting data to optimize bids'
                  : 'Intelligently adjusting bids based on performance data'}
              </CardDescription>
            </div>
          </div>
          
          <Badge variant={isLearning ? 'secondary' : 'default'} className="gap-1">
            {isLearning ? (
              <>
                <Clock className="h-3 w-3" />
                Learning
              </>
            ) : (
              <>
                <Zap className="h-3 w-3" />
                Active
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Learning Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Learning Progress</span>
            <span className={`font-medium ${getStatusColor(status.learningProgress)}`}>
              {status.learningProgress}%
            </span>
          </div>
          <Progress value={status.learningProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {status.highConfidenceEntities} of {status.totalEntities} entities at high confidence
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="text-center p-3 rounded-lg bg-background">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{status.totalEntities}</p>
            <p className="text-xs text-muted-foreground">Entities Tracked</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{status.totalObservations}</p>
            <p className="text-xs text-muted-foreground">Observations</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{status.bidsOptimizedToday}</p>
            <p className="text-xs text-muted-foreground">Bids Today</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{status.daysSinceStart}</p>
            <p className="text-xs text-muted-foreground">Days Active</p>
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs text-muted-foreground">Confidence:</span>
          <Badge variant="default" className="text-xs bg-success/10 text-success border-success/20">
            High: {status.highConfidenceEntities}
          </Badge>
          <Badge variant="secondary" className="text-xs bg-warning/10 text-warning border-warning/20">
            Medium: {status.mediumConfidenceEntities}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Low: {status.lowConfidenceEntities}
          </Badge>
        </div>

        {/* Last Run */}
        {status.lastRunAt && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Last optimization: {formatDistanceToNow(new Date(status.lastRunAt), { addSuffix: true })}
            {status.lastRunStatus && (
              <span className={status.lastRunStatus === 'completed' ? 'text-success' : 'text-destructive'}>
                {' '}• {status.lastRunStatus}
              </span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
