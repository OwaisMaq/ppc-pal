import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, Gauge, Calendar, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceSignalsCardProps {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100
  confidenceScore: number; // 0-100
  daysSinceManualIntervention: number | null;
  loading?: boolean;
}

const riskConfig = {
  low: {
    label: 'Low Risk',
    color: 'text-success',
    bgColor: 'bg-success/10',
    description: 'Automation decisions are confident and low risk'
  },
  medium: {
    label: 'Medium Risk',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    description: 'Some decisions may require manual review'
  },
  high: {
    label: 'High Risk',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    description: 'Manual oversight recommended'
  }
};

export const ConfidenceSignalsCard = ({
  riskLevel,
  riskScore,
  confidenceScore,
  daysSinceManualIntervention,
  loading
}: ConfidenceSignalsCardProps) => {
  const riskInfo = riskConfig[riskLevel];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Confidence Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {/* Risk Level Today */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg border bg-card cursor-help">
                  <div className="flex items-center justify-between mb-2">
                    <Gauge className={cn("h-4 w-4", riskInfo.color)} />
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className={cn("text-lg font-bold", riskInfo.color)}>
                    {riskInfo.label}
                  </div>
                  <p className="text-xs text-muted-foreground">Risk Today</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium mb-1">Risk Score: {riskScore}/100</p>
                <p className="text-sm">{riskInfo.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on ACoS volatility, spend patterns, and automation error rate
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Automation Confidence */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg border bg-card cursor-help">
                  <div className="flex items-center justify-between mb-2">
                    <ShieldCheck className={cn(
                      "h-4 w-4",
                      confidenceScore >= 80 ? "text-success" :
                      confidenceScore >= 50 ? "text-warning" : "text-destructive"
                    )} />
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-bold">
                    {confidenceScore}%
                  </div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium mb-1">Automation Confidence Score</p>
                <p className="text-sm">
                  {confidenceScore >= 80 
                    ? "High confidence - sufficient data and consistent patterns" 
                    : confidenceScore >= 50
                    ? "Moderate confidence - some uncertainty in predictions"
                    : "Low confidence - limited data or volatile patterns"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Derived from data sufficiency and statistical strength
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Days Since Manual Intervention */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg border bg-card cursor-help">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className={cn(
                      "h-4 w-4",
                      daysSinceManualIntervention === null ? "text-muted-foreground" :
                      daysSinceManualIntervention >= 7 ? "text-success" : "text-muted-foreground"
                    )} />
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-bold">
                    {daysSinceManualIntervention === null ? '-' : `${daysSinceManualIntervention}d`}
                  </div>
                  <p className="text-xs text-muted-foreground">Hands-off</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium mb-1">Days Since Manual Intervention</p>
                <p className="text-sm">
                  {daysSinceManualIntervention === null 
                    ? "No overrides recorded"
                    : daysSinceManualIntervention >= 7
                    ? "Great! Automation is running smoothly without intervention"
                    : `You made manual changes ${daysSinceManualIntervention} day${daysSinceManualIntervention === 1 ? '' : 's'} ago`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tracks when you last overrode an automation decision
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};