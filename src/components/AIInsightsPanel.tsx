import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAIInsights } from "@/hooks/useAIInsights";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useActionsFeed } from "@/hooks/useActionsFeed";
import ActionsHistory from "@/components/ActionsHistory";
import { 
  Sparkles, 
  TrendingUp, 
  DollarSign,
  Target,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  Check,
  X,
  Loader2,
  History
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AIInsightsPanel = () => {
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
  const { stats: actionStats } = useActionsFeed(1);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const primaryProfileId = connections?.[0]?.profile_id;

  const filteredInsights = filter === 'all' 
    ? insights 
    : insights.filter(i => i.impact === filter);

  const pendingInsights = filteredInsights.filter(i => i.status === 'pending' || !i.status);

  const getTypeIcon = (type: string) => {
    switch (type) {
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
    // Note: Bid adjustments are now handled by the Bayesian Bid Optimizer
    const labels: Record<string, string> = {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
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
        <Alert className="border-success bg-success/10">
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

      {/* Tabbed Content */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="recommendations" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Recommendations
            {pendingInsights.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingInsights.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Actions History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
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
                  {(['all', 'high', 'medium', 'low'] as const).map(f => (
                    <Button
                      key={f}
                      variant={filter === f ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Button>
                  ))}
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
                    <Card key={insight.id || index} className="border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {getTypeIcon(insight.type)}
                              <span className="font-medium">{getTypeLabel(insight.type)}</span>
                              {getImpactBadge(insight.impact)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {insight.reason}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Campaign: {insight.campaign}
                            </p>
                            {insight.actionable?.entity_name && (
                              <p className="text-xs text-muted-foreground">
                                Target: {insight.actionable.entity_name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(insight)}
                              disabled={!!isApproving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(insight)}
                              disabled={!!isApproving}
                            >
                              {isApproving === insight.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <ActionsHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};
