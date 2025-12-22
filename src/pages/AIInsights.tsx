import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIInsights } from "@/hooks/useAIInsights";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  DollarSign,
  Target,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  Check,
  X,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AIInsights = () => {
  const { 
    insights, 
    strategy, 
    autoApply, 
    autoAppliedCount,
    autoAppliedInsights,
    isLoading, 
    isApproving,
    toggleAutoApply, 
    approveInsight,
    rejectInsight,
    refetch 
  } = useAIInsights();
  const { connections } = useAmazonConnections();
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const primaryProfileId = connections?.[0]?.profile_id;

  const filteredInsights = filter === 'all' 
    ? insights 
    : insights.filter(i => i.impact === filter);

  // Only show pending insights
  const pendingInsights = filteredInsights.filter(i => i.status === 'pending' || !i.status);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bid_adjustment':
        return <TrendingDown className="h-4 w-4" />;
      case 'keyword_suggestion':
        return <Lightbulb className="h-4 w-4" />;
      case 'negative_keyword':
        return <AlertCircle className="h-4 w-4" />;
      case 'budget_change':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", className: string }> = {
      high: { variant: "destructive", className: "bg-destructive text-destructive-foreground" },
      medium: { variant: "default", className: "bg-warning text-warning-foreground" },
      low: { variant: "secondary", className: "bg-muted text-muted-foreground" },
    };
    const config = variants[impact] || variants.low;
    return (
      <Badge variant={config.variant} className={config.className}>
        {impact.toUpperCase()}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bid_adjustment: 'Bid Adjustment',
      keyword_suggestion: 'Keyword Suggestion',
      negative_keyword: 'Negative Keyword',
      budget_change: 'Budget Change',
    };
    return labels[type] || type;
  };

  const handleApprove = (insight: typeof insights[0]) => {
    if (insight.id && primaryProfileId) {
      approveInsight(insight.id, primaryProfileId);
    }
  };

  const handleReject = (insight: typeof insights[0]) => {
    if (insight.id) {
      rejectInsight(insight.id);
    }
  };

  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-brand-accent" />
              AI Insights
            </h1>
            <p className="text-muted-foreground">
              Review and approve AI-powered optimizations for your campaigns
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="flex items-center gap-3">
              <Label htmlFor="auto-apply" className="text-sm font-medium">
                Auto-Apply
              </Label>
              <Switch
                id="auto-apply"
                checked={autoApply}
                onCheckedChange={toggleAutoApply}
              />
            </div>
          </div>
        </div>

        {/* Strategy Summary */}
        <Card className="mb-6 border-brand-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-accent" />
              Strategy Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <p className="text-muted-foreground leading-relaxed">{strategy}</p>
            )}
          </CardContent>
        </Card>

        {autoAppliedCount > 0 && (
          <Alert className="mb-6 border-success bg-success/10">
            <Check className="h-4 w-4 text-success" />
            <AlertDescription>
              <span className="font-medium">{autoAppliedCount} recommendation{autoAppliedCount !== 1 ? 's' : ''} auto-applied:</span>
              <ul className="mt-1 text-sm list-disc list-inside">
                {autoAppliedInsights.slice(0, 5).map((name, i) => (
                  <li key={i} className="truncate">{name}</li>
                ))}
                {autoAppliedInsights.length > 5 && (
                  <li className="text-muted-foreground">...and {autoAppliedInsights.length - 5} more</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {autoApply && autoAppliedCount === 0 && (
          <Alert className="mb-6">
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Auto-apply is enabled. High-confidence recommendations matching your criteria will be automatically queued for execution.
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendations Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Recommendations</CardTitle>
                <CardDescription>
                  {pendingInsights.length} recommendation{pendingInsights.length !== 1 ? 's' : ''} awaiting review
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'high' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('high')}
                >
                  High
                </Button>
                <Button
                  variant={filter === 'medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('medium')}
                >
                  Medium
                </Button>
                <Button
                  variant={filter === 'low' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('low')}
                >
                  Low
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : pendingInsights.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {insights.length === 0 
                    ? 'No recommendations yet. The AI is analyzing your campaigns.'
                    : 'All recommendations have been reviewed!'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingInsights.map((insight, index) => (
                  <Card key={insight.id || index} className="border-l-4 border-l-brand-accent">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {getTypeIcon(insight.type)}
                            <span className="font-medium">{getTypeLabel(insight.type)}</span>
                            {getImpactBadge(insight.impact)}
                            {insight.actionable?.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(insight.actionable.confidence * 100)}% confident
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold text-foreground mb-2 truncate">
                            {insight.campaign}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium">Action:</span> {insight.action}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            <span className="font-medium">Reason:</span> {insight.reason}
                          </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleApprove(insight)}
                            disabled={!insight.id || !primaryProfileId || isApproving === insight.id}
                            className="min-w-[90px]"
                          >
                            {isApproving === insight.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Apply
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleReject(insight)}
                            disabled={!insight.id || isApproving === insight.id}
                            className="min-w-[90px]"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                          <span className="text-xs text-muted-foreground text-right mt-1">
                            {format(new Date(insight.timestamp), 'MMM dd')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default AIInsights;
