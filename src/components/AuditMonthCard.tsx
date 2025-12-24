import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, PoundSterling } from "lucide-react";
import { HistoricalAudit, AuditInsight } from "@/hooks/useHistoricalAudit";

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

export function AuditMonthCard({ audit }: AuditMonthCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { summary, insights, estimated_savings } = audit;

  const criticalCount = insights?.filter(i => i.severity === "critical").length || 0;
  const warningCount = insights?.filter(i => i.severity === "warning").length || 0;

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg">{summary?.monthLabel || "Unknown Month"}</CardTitle>
                <div className="flex gap-2">
                  {criticalCount > 0 && (
                    <Badge variant="destructive">{criticalCount} Critical</Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge variant="secondary">{warningCount} Warning</Badge>
                  )}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
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
                <div className="text-sm text-muted-foreground">Campaigns</div>
                <div className="text-lg font-semibold">{summary?.campaignCount || 0}</div>
              </div>
            </div>

            {/* AI Summary */}
            {summary?.aiSummary && (
              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="text-sm font-medium mb-2 text-primary">AI Analysis</div>
                <p className="text-sm text-muted-foreground">{summary.aiSummary}</p>
              </div>
            )}

            {/* Insights */}
            <div className="space-y-3">
              <h4 className="font-medium">Insights & Recommendations</h4>
              {insights && insights.length > 0 ? (
                insights.map((insight, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg"
                  >
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
                              {insight.estimatedSavings.toFixed(2)} savings
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
