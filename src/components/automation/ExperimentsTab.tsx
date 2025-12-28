import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FlaskConical, Play, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useExperiments, Experiment } from '@/hooks/useExperiments';
import { formatDistanceToNow } from 'date-fns';

interface ExperimentsTabProps {
  profileId?: string;
}

export function ExperimentsTab({ profileId }: ExperimentsTabProps) {
  const { experiments, isLoading, runAnalysis, isAnalyzing } = useExperiments(profileId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const getStatusBadge = (status: Experiment['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'running':
        return <Badge className="bg-primary/10 text-primary border-primary/20"><Clock className="h-3 w-3 mr-1 animate-pulse" />Running</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Incrementality Experiments</h2>
          <p className="text-muted-foreground text-sm">Measure true incremental lift with synthetic control tests</p>
        </div>
        <Button disabled>
          <FlaskConical className="h-4 w-4 mr-2" />
          New Experiment
        </Button>
      </div>

      {experiments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Experiments Yet</h3>
            <p className="text-muted-foreground">Create holdout tests to measure true incremental value of your campaigns.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <Card key={exp.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{exp.name}</CardTitle>
                    <CardDescription>{exp.entityType}: {exp.entityId}</CardDescription>
                  </div>
                  {getStatusBadge(exp.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-6">
                    {exp.incrementalLiftPercent !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Lift</p>
                        <p className={`text-xl font-bold ${exp.incrementalLiftPercent > 0 ? 'text-success' : 'text-destructive'}`}>
                          {exp.incrementalLiftPercent > 0 ? '+' : ''}{exp.incrementalLiftPercent.toFixed(1)}%
                        </p>
                      </div>
                    )}
                    {exp.statisticalSignificance !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="text-xl font-bold">{(exp.statisticalSignificance * 100).toFixed(0)}%</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm">{formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                  {exp.status === 'pending' && (
                    <Button size="sm" onClick={() => runAnalysis(exp.id)} disabled={isAnalyzing}>
                      <Play className="h-4 w-4 mr-1" />
                      Run Analysis
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
