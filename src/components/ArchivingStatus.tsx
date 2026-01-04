import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Archive, CheckCircle2, Clock, AlertCircle, RefreshCw, Database } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ArchivingStatusProps {
  profileId: string;
}

interface ArchiveStatusEntry {
  profile_id: string;
  entity_type: string;
  earliest_date: string | null;
  latest_date: string | null;
  total_records: number;
  last_archived_at: string | null;
}

const ENTITY_LABELS: Record<string, string> = {
  campaigns: "Campaigns",
  adGroups: "Ad Groups",
  keywords: "Keywords",
  targets: "Targets",
  searchTerms: "Search Terms"
};

export const ArchivingStatus = ({ profileId }: ArchivingStatusProps) => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: archiveStatus, isLoading, refetch } = useQuery({
    queryKey: ['archive-status', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('archive_status')
        .select('*')
        .eq('profile_id', profileId);

      if (error) throw error;
      return data as ArchiveStatusEntry[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('daily-archive-scheduler', {
        body: { profileId, updateStatusOnly: true }
      });

      if (error) throw error;

      toast({
        title: "Status refreshed",
        description: "Archive status has been updated",
      });

      refetch();
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh archive status",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getDataCoverage = (entry: ArchiveStatusEntry) => {
    if (!entry.earliest_date || !entry.latest_date) return null;
    return differenceInDays(new Date(entry.latest_date), new Date(entry.earliest_date)) + 1;
  };

  const getHealthStatus = (entry: ArchiveStatusEntry) => {
    if (!entry.total_records || entry.total_records === 0) {
      return { status: 'empty', color: 'bg-muted text-muted-foreground', icon: AlertCircle };
    }
    
    const coverage = getDataCoverage(entry);
    if (!coverage) return { status: 'unknown', color: 'bg-muted text-muted-foreground', icon: Clock };
    
    if (coverage >= 60) {
      return { status: 'healthy', color: 'bg-success/10 text-success', icon: CheckCircle2 };
    } else if (coverage >= 30) {
      return { status: 'growing', color: 'bg-warning/10 text-warning', icon: Clock };
    } else {
      return { status: 'new', color: 'bg-info/10 text-info', icon: Database };
    }
  };

  const totalRecords = archiveStatus?.reduce((sum, entry) => sum + (entry.total_records || 0), 0) || 0;
  const lastArchived = archiveStatus?.reduce((latest, entry) => {
    if (!entry.last_archived_at) return latest;
    if (!latest) return entry.last_archived_at;
    return new Date(entry.last_archived_at) > new Date(latest) ? entry.last_archived_at : latest;
  }, null as string | null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            <CardTitle>Data Archiving Status</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Your historical data is automatically archived daily to preserve it beyond Amazon's ~90-day retention limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Total Records Archived</p>
            <p className="text-2xl font-semibold">{totalRecords.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Entity Types Tracked</p>
            <p className="text-2xl font-semibold">{archiveStatus?.length || 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Last Archived</p>
            <p className="text-lg font-semibold">
              {lastArchived ? format(new Date(lastArchived), "MMM d, h:mm a") : "Never"}
            </p>
          </div>
        </div>

        {/* Entity Status List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : archiveStatus && archiveStatus.length > 0 ? (
          <div className="space-y-2">
            {archiveStatus.map((entry) => {
              const health = getHealthStatus(entry);
              const coverage = getDataCoverage(entry);
              const HealthIcon = health.icon;

              return (
                <div 
                  key={entry.entity_type}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-1.5 ${health.color}`}>
                      <HealthIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{ENTITY_LABELS[entry.entity_type] || entry.entity_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.total_records?.toLocaleString() || 0} records
                        {entry.earliest_date && entry.latest_date && (
                          <> · {format(new Date(entry.earliest_date), "MMM d")} - {format(new Date(entry.latest_date), "MMM d, yyyy")}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {coverage ? (
                      <Badge variant="outline" className="font-normal">
                        {coverage} days
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">
                        No data
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              No archive data yet. Data will be collected automatically as reports are processed.
            </p>
          </div>
        )}

        {/* Info Footer */}
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm">
          <p className="font-medium text-foreground mb-1">📦 Automatic Daily Archiving</p>
          <p className="text-muted-foreground">
            PPC Pal automatically archives your performance data daily. Over time, your database becomes 
            the source of truth for historical analytics, allowing you to track performance beyond 
            Amazon's typical 60-90 day data retention window.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
