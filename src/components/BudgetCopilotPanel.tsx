import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, AlertCircle, Play, Pause, Zap } from "lucide-react";
import { useBudgetCopilot, type BudgetRecommendation } from "@/hooks/useBudgetCopilot";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const ACTION_COLORS = {
  increase: 'bg-success/10 text-success border-success/20',
  decrease: 'bg-warning/10 text-warning border-warning/20',
  hold: 'bg-neutral-100 text-neutral-800 border-neutral-200'
};

export const BudgetCopilotPanel = () => {
  const { connections } = useAmazonConnections();
  const { subscription } = useSubscription();
  const { recommendations, loading, fetchRecommendations, applyRecommendation, runBudgetAnalysis } = useBudgetCopilot();
  const { toast } = useToast();
  const [selectedProfile, setSelectedProfile] = useState<string>('all');

  const isPro = subscription?.plan_type === 'pro';

  useEffect(() => {
    if (connections.length > 0) {
      handleFetchRecommendations();
    }
  }, [connections]);

  const handleFetchRecommendations = () => {
    const filters: any = {};
    if (selectedProfile !== 'all') filters.profileId = selectedProfile;
    fetchRecommendations(filters);
  };

  const handleRunCopilot = async () => {
    try {
      await runBudgetAnalysis(selectedProfile !== 'all' ? selectedProfile : undefined);
      toast({
        title: "Budget Copilot",
        description: "Analysis completed successfully",
      });
      // Refresh recommendations after running
      setTimeout(handleFetchRecommendations, 1000);
    } catch (error) {
      console.error('Failed to run budget copilot:', error);
    }
  };

  const handleApplyRecommendation = async (rec: BudgetRecommendation) => {
    if (!isPro && rec.mode === 'auto') {
      toast({
        title: "Pro Feature",
        description: "Auto-apply requires a Pro subscription",
        variant: "destructive",
      });
      return;
    }

    try {
      await applyRecommendation(rec.id);
      toast({
        title: "Budget Updated",
        description: `Campaign budget adjusted to £${(rec.suggested_budget_micros! / 1000000).toFixed(2)}`,
      });
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
    }
  };

  const formatBudget = (micros: number) => {
    return `£${(micros / 1000000).toFixed(2)}`;
  };

  const calculateProgress = (spentMicros: number, budgetMicros: number) => {
    return Math.min((spentMicros / budgetMicros) * 100, 100);
  };

  const todayRecs = recommendations.filter(rec => 
    new Date(rec.day).toDateString() === new Date().toDateString()
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-primary" />
            Budget Copilot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Profiles</SelectItem>
                {connections.map((conn) => (
                  <SelectItem key={conn.profile_id} value={conn.profile_id!}>
                    {conn.profile_name || conn.profile_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleRunCopilot} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </Button>

            <Button onClick={handleFetchRecommendations} variant="outline" disabled={loading}>
              Refresh
            </Button>

            {!isPro && (
              <Badge variant="outline" className="ml-auto">
                Pro required for auto-apply
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Today's Budget Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {todayRecs.slice(0, 6).map((rec) => (
              <Card key={rec.id} className="border">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        Campaign {rec.campaign_id.slice(-8)}
                      </span>
                      <Badge variant="outline" className={ACTION_COLORS[rec.action as keyof typeof ACTION_COLORS]}>
                        {rec.action}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Spent</span>
                        <span>{formatBudget(rec.spend_so_far_micros)} / {formatBudget(rec.current_budget_micros)}</span>
                      </div>
                      <Progress 
                        value={calculateProgress(rec.spend_so_far_micros, rec.current_budget_micros)} 
                        className="h-2"
                      />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <div>Pace: {rec.pace_ratio.toFixed(2)}x</div>
                      <div>Forecast: {formatBudget(rec.forecast_eod_spend_micros)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recommendations found. Run analysis to generate recommendations.
              </div>
            ) : (
              recommendations.map((rec) => (
                <Card key={rec.id} className="border-l-4 border-l-brand-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium">Campaign {rec.campaign_id.slice(-8)}</span>
                          <Badge variant="outline" className={ACTION_COLORS[rec.action as keyof typeof ACTION_COLORS]}>
                            {rec.action}
                          </Badge>
                          <Badge variant="secondary">{rec.state}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Current Budget:</span>
                            <div className="font-semibold">{formatBudget(rec.current_budget_micros)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Spent So Far:</span>
                            <div>{formatBudget(rec.spend_so_far_micros)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Forecast EoD:</span>
                            <div>{formatBudget(rec.forecast_eod_spend_micros)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pace Ratio:</span>
                            <div className="font-mono">{rec.pace_ratio.toFixed(2)}x</div>
                          </div>
                          {rec.suggested_budget_micros && (
                            <div>
                              <span className="text-muted-foreground">Suggested:</span>
                              <div className="font-semibold text-brand-primary">
                                {formatBudget(rec.suggested_budget_micros)}
                              </div>
                            </div>
                          )}
                        </div>

                        {rec.reason && (
                          <div className="text-sm text-muted-foreground mb-3 bg-neutral-50 p-2 rounded">
                            {rec.reason}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(rec.created_at))} ago
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        {rec.state === 'open' && rec.action !== 'hold' && (
                          <Button
                            size="sm"
                            onClick={() => handleApplyRecommendation(rec)}
                            disabled={!isPro && rec.mode === 'auto'}
                          >
                            Apply
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};