import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, 
  PoundSterling, Search, Target, LayoutGrid 
} from "lucide-react";
import { HistoricalAudit, AuditInsight, SearchTermBreakdown, TargetBreakdown } from "@/hooks/useHistoricalAudit";
import { HealthScoreCircle, ScoreBreakdownBars, TrendIndicator } from "@/components/health";

interface AuditMonthCardProps {
  audit: HistoricalAudit;
}

function getSeverityIcon(severity: AuditInsight["severity"]) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-warning" />;
    default:
      return <Info className="h-4 w-4 text-info" />;
  }
}

function getSeverityBadgeVariant(severity: AuditInsight["severity"]) {
  switch (severity) {
    case "critical":
      return "destructive";
    case "warning":
      return "secondary";
    default:
      return "outline";
  }
}

function getLevelIcon(level: AuditInsight["level"]) {
  switch (level) {
    case "search_term":
      return <Search className="h-3 w-3" />;
    case "target":
      return <Target className="h-3 w-3" />;
    default:
      return <LayoutGrid className="h-3 w-3" />;
  }
}

function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}

function formatPercent(value: number) {
  if (!isFinite(value)) return "∞";
  return `${value.toFixed(1)}%`;
}

function SearchTermTable({ terms, title }: { terms: SearchTermBreakdown[]; title: string }) {
  if (!terms || terms.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No data available</p>;
  }

  return (
    <div>
      <h5 className="font-medium text-sm mb-2">{title}</h5>
      <ScrollArea className="h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Search Term</TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">ACOS</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.map((term, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium max-w-[200px] truncate" title={term.searchTerm}>
                  {term.searchTerm || "-"}
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={term.keywordText}>
                  <span className="text-muted-foreground">{term.keywordText || "-"}</span>
                  {term.matchType && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      {term.matchType}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(term.spend)}</TableCell>
                <TableCell className="text-right">{formatCurrency(term.sales)}</TableCell>
                <TableCell className={`text-right ${term.acos > 50 ? "text-destructive" : ""}`}>
                  {formatPercent(term.acos)}
                </TableCell>
                <TableCell className={`text-right ${term.roas > 2 ? "text-success" : ""}`}>
                  {term.roas.toFixed(2)}x
                </TableCell>
                <TableCell className="text-right">{term.orders}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

function TargetTable({ targets, title }: { targets: TargetBreakdown[]; title: string }) {
  if (!targets || targets.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No data available</p>;
  }

  return (
    <div>
      <h5 className="font-medium text-sm mb-2">{title}</h5>
      <ScrollArea className="h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">ACOS</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((target, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium max-w-[200px] truncate" title={target.expression}>
                  {target.expression || target.targetId || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {target.targetType || "unknown"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(target.spend)}</TableCell>
                <TableCell className="text-right">{formatCurrency(target.sales)}</TableCell>
                <TableCell className={`text-right ${target.acos > 50 ? "text-destructive" : ""}`}>
                  {formatPercent(target.acos)}
                </TableCell>
                <TableCell className={`text-right ${target.roas > 2 ? "text-success" : ""}`}>
                  {target.roas.toFixed(2)}x
                </TableCell>
                <TableCell className="text-right">{target.orders}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

export function AuditMonthCard({ audit }: AuditMonthCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { summary, insights, estimated_savings, breakdown, score, grade, score_breakdown, trend_vs_prior_month } = audit;

  const criticalCount = insights?.filter(i => i.severity === "critical").length || 0;
  const warningCount = insights?.filter(i => i.severity === "warning").length || 0;

  const campaignInsights = insights?.filter(i => i.level === "campaign") || [];

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {score !== undefined && grade && (
                  <HealthScoreCircle score={score} grade={grade} size="sm" showGrade={false} />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{summary?.monthLabel || "Unknown Month"}</CardTitle>
                    {grade && (
                      <Badge variant="outline" className="font-semibold">
                        Grade {grade}
                      </Badge>
                    )}
                    {trend_vs_prior_month && (
                      <TrendIndicator trend={trend_vs_prior_month} compact />
                    )}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {criticalCount > 0 && (
                      <Badge variant="destructive" className="text-xs">{criticalCount} Critical</Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge variant="secondary" className="text-xs">{warningCount} Warning</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Savings Potential</div>
                  <div className="text-lg font-semibold text-success">
                    £{(estimated_savings || 0).toFixed(2)}
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Monthly Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Spend</div>
                <div className="text-lg font-semibold">£{(summary?.totalSpend || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Sales</div>
                <div className="text-lg font-semibold">£{(summary?.totalSales || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">ACOS</div>
                <div className="text-lg font-semibold">{(summary?.avgAcos || 0).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">ROAS</div>
                <div className="text-lg font-semibold">{(summary?.avgRoas || 0).toFixed(2)}x</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Search Terms</div>
                <div className="text-lg font-semibold">{summary?.searchTermCount || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Targets</div>
                <div className="text-lg font-semibold">{summary?.targetCount || 0}</div>
              </div>
            </div>

            {/* Score Breakdown */}
            {score_breakdown && (
              <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium mb-3">Health Score Breakdown</div>
                <ScoreBreakdownBars breakdown={score_breakdown} />
              </div>
            )}

            {/* AI Summary */}
            {summary?.aiSummary && (
              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="text-sm font-medium mb-2 text-primary">AI Analysis</div>
                <p className="text-sm text-muted-foreground">{summary.aiSummary}</p>
              </div>
            )}

            {/* Tabbed Content */}
            <Tabs defaultValue="insights" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="insights">
                  All Insights ({insights?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="search-terms">
                  <Search className="h-3 w-3 mr-1" />
                  Search Terms
                </TabsTrigger>
                <TabsTrigger value="targets">
                  <Target className="h-3 w-3 mr-1" />
                  Targets
                </TabsTrigger>
                <TabsTrigger value="campaigns">
                  <LayoutGrid className="h-3 w-3 mr-1" />
                  Campaigns
                </TabsTrigger>
              </TabsList>

              <TabsContent value="insights" className="mt-4">
                <div className="space-y-3">
                  {insights && insights.length > 0 ? (
                    insights.map((insight, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(insight.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{insight.title}</span>
                              <Badge variant={getSeverityBadgeVariant(insight.severity) as any}>
                                {insight.severity}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getLevelIcon(insight.level)}
                                <span className="ml-1">{insight.level.replace("_", " ")}</span>
                              </Badge>
                              {insight.estimatedSavings > 0 && (
                                <Badge variant="outline" className="text-success border-success">
                                  <PoundSterling className="h-3 w-3 mr-1" />
                                  {insight.estimatedSavings.toFixed(2)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {insight.description}
                            </p>
                            {insight.entities && insight.entities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {insight.entities.slice(0, 5).map((entity, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {entity}
                                  </Badge>
                                ))}
                                {insight.entities.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{insight.entities.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            )}
                            {insight.campaigns && insight.campaigns.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {insight.campaigns.slice(0, 5).map((campaign, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {campaign}
                                  </Badge>
                                ))}
                                {insight.campaigns.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{insight.campaigns.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No significant issues detected this month.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="search-terms" className="mt-4 space-y-6">
                {breakdown?.searchTerms ? (
                  <>
                    <SearchTermTable 
                      terms={breakdown.searchTerms.topWasters} 
                      title="🚨 Top Wasters (No Conversions)" 
                    />
                    <SearchTermTable 
                      terms={breakdown.searchTerms.topPerformers} 
                      title="⭐ Top Performers (ROAS > 2x)" 
                    />
                    <SearchTermTable 
                      terms={breakdown.searchTerms.highVolume} 
                      title="📊 Highest Spend" 
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    No search term data available. Run a fresh audit to analyze search terms.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="targets" className="mt-4 space-y-6">
                {breakdown?.targets ? (
                  <>
                    <TargetTable 
                      targets={breakdown.targets.topWasters} 
                      title="🚨 Top Wasters (No Conversions)" 
                    />
                    <TargetTable 
                      targets={breakdown.targets.topPerformers} 
                      title="⭐ Top Performers (ROAS > 2x)" 
                    />
                    <TargetTable 
                      targets={breakdown.targets.highVolume} 
                      title="📊 Highest Spend" 
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    No target data available. Run a fresh audit to analyze product targets.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="campaigns" className="mt-4">
                <div className="space-y-3">
                  {campaignInsights.length > 0 ? (
                    campaignInsights.map((insight, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(insight.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{insight.title}</span>
                              <Badge variant={getSeverityBadgeVariant(insight.severity) as any}>
                                {insight.severity}
                              </Badge>
                              {insight.estimatedSavings > 0 && (
                                <Badge variant="outline" className="text-success border-success">
                                  <PoundSterling className="h-3 w-3 mr-1" />
                                  {insight.estimatedSavings.toFixed(2)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {insight.description}
                            </p>
                            {insight.campaigns && insight.campaigns.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {insight.campaigns.map((campaign, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {campaign}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No campaign-level issues detected.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
