import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Flag,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAdminIssueReports, ISSUE_TYPES } from '@/hooks/useIssueReports';
import { cn } from '@/lib/utils';

export function IssueReportsPanel() {
  const { reports, isLoading, stats, resolveReport, unresolveReport, isResolving } = useAdminIssueReports();
  const [showResolved, setShowResolved] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const filteredReports = showResolved
    ? reports
    : reports.filter(r => !r.resolved);

  const sortedFeatures = Object.entries(stats.byFeature)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  const getIssueTypeLabel = (type: string | null) => {
    const found = ISSUE_TYPES.find(t => t.value === type);
    return found?.label || type || 'General';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unresolved Issues</CardDescription>
            <CardTitle className="text-3xl">{stats.unresolved}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.total} total reports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last 7 Days</CardDescription>
            <CardTitle className="text-3xl">{stats.last7Days}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              New reports this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Most Reported</CardDescription>
            <CardTitle className="text-lg truncate">
              {sortedFeatures[0]?.[1]?.label || 'None'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {sortedFeatures[0]?.[1]?.count || 0} reports
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Issues by Feature
          </CardTitle>
          <CardDescription>
            Which features are causing the most problems
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedFeatures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No issue reports yet
            </p>
          ) : (
            <div className="space-y-3">
              {sortedFeatures.map(([featureId, data]) => (
                <div key={featureId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">
                        {data.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {data.count} reports
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          data.unresolved > 0 ? 'bg-amber-500' : 'bg-green-500'
                        )}
                        style={{
                          width: `${(data.count / (sortedFeatures[0]?.[1]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  {data.unresolved > 0 && (
                    <Badge variant="outline" className="shrink-0">
                      {data.unresolved} open
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Recent Reports
              </CardTitle>
              <CardDescription>
                Individual issue reports from users
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
            >
              {showResolved ? 'Hide Resolved' : 'Show Resolved'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {showResolved ? 'No reports yet' : 'No unresolved reports'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.slice(0, 50).map((report) => (
                  <Collapsible
                    key={report.id}
                    open={expandedReport === report.id}
                    onOpenChange={(open) => setExpandedReport(open ? report.id : null)}
                  >
                    <TableRow className="group">
                      <TableCell className="font-medium">
                        {report.feature_label || report.feature_id}
                      </TableCell>
                      <TableCell>{getIssueTypeLabel(report.issue_type)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {report.page_route || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {report.resolved ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {report.resolved ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unresolveReport(report.id)}
                              disabled={isResolving}
                              title="Reopen"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resolveReport(report.id)}
                              disabled={isResolving}
                              title="Mark resolved"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {expandedReport === report.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={6}>
                          <div className="py-2 space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Report ID:</span>{' '}
                                <code className="text-xs">{report.id}</code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">User ID:</span>{' '}
                                <code className="text-xs">{report.user_id}</code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Feature ID:</span>{' '}
                                <code className="text-xs">{report.feature_id}</code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Reported:</span>{' '}
                                {format(new Date(report.created_at), 'PPpp')}
                              </div>
                            </div>
                            {report.context && (
                              <div>
                                <span className="text-sm text-muted-foreground">Context:</span>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                  {JSON.stringify(report.context, null, 2)}
                                </pre>
                              </div>
                            )}
                            {report.resolved && report.resolved_at && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Resolved:</span>{' '}
                                {format(new Date(report.resolved_at), 'PPpp')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
