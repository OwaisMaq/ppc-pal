import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { PieChart, TrendingUp, ArrowRight, RefreshCw, DollarSign } from 'lucide-react';
import { usePortfolioHealth } from '@/hooks/usePortfolioHealth';
import { formatDistanceToNow } from 'date-fns';

interface PortfolioHealthPanelProps {
  profileId?: string;
}

export function PortfolioHealthPanel({ profileId }: PortfolioHealthPanelProps) {
  const { data, isLoading, error, runOptimization, isOptimizing } = usePortfolioHealth(profileId);

  if (!profileId) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const formatCurrency = (micros: number) => {
    return `$${(micros / 1_000_000).toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <PieChart className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Portfolio Health</CardTitle>
              <CardDescription>
                Budget allocation efficiency across campaigns
              </CardDescription>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => runOptimization()}
            disabled={isOptimizing}
            className="gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isOptimizing ? 'animate-spin' : ''}`} />
            {isOptimizing ? 'Running...' : 'Optimize'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Efficiency Score */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Portfolio Efficiency</span>
              <span className={`text-lg font-bold ${getEfficiencyColor(data.efficiencyScore)}`}>
                {data.efficiencyScore}%
              </span>
            </div>
            <Progress value={data.efficiencyScore} className="h-2" />
          </div>
        </div>

        {/* Budget Summary */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Current Spend</p>
            <p className="text-lg font-semibold">${data.totalSpend.toFixed(0)}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Optimal Spend</p>
            <p className="text-lg font-semibold text-primary">${data.optimalSpend.toFixed(0)}</p>
          </div>
        </div>

        {/* Top Reallocation Opportunities */}
        {data.reallocationOpportunities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Top Opportunities</h4>
            <div className="space-y-2">
              {data.reallocationOpportunities.slice(0, 3).map((opp, idx) => (
                <div 
                  key={opp.campaignId} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{opp.campaignName}</p>
                    <p className="text-xs text-muted-foreground">
                      Marginal ROAS: {opp.marginalRoas.toFixed(2)}x
                    </p>
                  </div>
                  <div className="text-right">
                    {opp.optimalSpendMicros && opp.optimalSpendMicros > opp.currentSpendMicros ? (
                      <Badge variant="outline" className="text-success bg-success/10 border-success/20">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{formatCurrency(opp.optimalSpendMicros - opp.currentSpendMicros)}
                      </Badge>
                    ) : opp.optimalSpendMicros && opp.optimalSpendMicros < opp.currentSpendMicros ? (
                      <Badge variant="outline" className="text-warning bg-warning/10 border-warning/20">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {formatCurrency(opp.optimalSpendMicros - opp.currentSpendMicros)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Optimal</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Run Info */}
        {data.lastRunAt && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Last analysis: {formatDistanceToNow(new Date(data.lastRunAt), { addSuffix: true })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
