import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RankTrackerTable, RankTrendChart } from "@/components/rank-tracker";
import { useRankTracker, useRankHistory, TrackedKeyword } from "@/hooks/useRankTracker";
import { TrendingUp, Target, Award, AlertTriangle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RankTracker() {
  const { 
    trackedKeywords, 
    isLoading, 
    addKeyword, 
    removeKeyword, 
    isAdding, 
    isRemoving 
  } = useRankTracker();
  
  const [selectedKeyword, setSelectedKeyword] = useState<TrackedKeyword | null>(null);
  const { data: history = [] } = useRankHistory(selectedKeyword?.id ?? null);

  // Calculate summary stats
  const stats = {
    total: trackedKeywords.length,
    topTen: trackedKeywords.filter(k => k.current_sponsored_rank && k.current_sponsored_rank <= 10).length,
    improved: trackedKeywords.filter(k => k.rank_trend > 0).length,
    dropped: trackedKeywords.filter(k => k.rank_trend < 0).length,
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">Keyword Rank Tracker</h1>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Coming Soon
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Monitor your sponsored and organic keyword positions over time
            </p>
          </div>
        </div>

        {/* Coming Soon Banner */}
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertTitle>Feature in Development</AlertTitle>
          <AlertDescription>
            We're integrating with rank tracking APIs to provide accurate sponsored and organic position data. 
            This feature will be available soon.
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Keywords Tracked</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats.total}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top 10 Positions</CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-primary">{stats.topTen}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improved</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-success">{stats.improved}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dropped</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-destructive">{stats.dropped}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Keywords Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Tracked Keywords</CardTitle>
                <CardDescription>
                  Click a keyword to view its rank history chart
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <RankTrackerTable
                    keywords={trackedKeywords}
                    onRemove={removeKeyword}
                    onSelect={setSelectedKeyword}
                    selectedId={selectedKeyword?.id ?? null}
                    isRemoving={isRemoving}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* History Chart */}
          <div className="lg:col-span-1">
            {selectedKeyword ? (
              <RankTrendChart 
                history={history} 
                keyword={selectedKeyword.keyword} 
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rank History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm text-center">
                    Select a keyword from the table to view its rank history
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
