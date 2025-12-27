import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, DollarSign, TrendingUp, Target, Bot, ChevronRight, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type HealthStatus = 'healthy' | 'watch' | 'at_risk';
export type AutomationStatus = 'on' | 'limited' | 'paused';

interface AccountHealthCardProps {
  healthStatus: HealthStatus;
  healthReasons?: string[];
  savings: number;
  spend: number;
  sales: number;
  currentAcos: number;
  targetAcos?: number;
  automationStatus: AutomationStatus;
  automationReason?: string;
  loading?: boolean;
}

const healthConfig = {
  healthy: {
    label: 'Healthy',
    color: 'bg-success/10 text-success border-success/20',
    icon: CheckCircle,
    description: 'All metrics are within normal ranges'
  },
  watch: {
    label: 'Watch',
    color: 'bg-warning/10 text-warning border-warning/20',
    icon: AlertTriangle,
    description: 'Some metrics require monitoring'
  },
  at_risk: {
    label: 'At Risk',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: AlertTriangle,
    description: 'Immediate attention required'
  }
};

const automationConfig = {
  on: {
    label: 'On',
    color: 'bg-success/10 text-success border-success/20',
    description: 'Automation is running fully'
  },
  limited: {
    label: 'Limited',
    color: 'bg-warning/10 text-warning border-warning/20',
    description: 'Some rules are disabled'
  },
  paused: {
    label: 'Paused',
    color: 'bg-muted text-muted-foreground border-muted',
    description: 'Automation is paused'
  }
};

export const AccountHealthCard = ({
  healthStatus,
  healthReasons = [],
  savings,
  spend,
  sales,
  currentAcos,
  targetAcos = 30,
  automationStatus,
  automationReason,
  loading
}: AccountHealthCardProps) => {
  const healthInfo = healthConfig[healthStatus];
  const HealthIcon = healthInfo.icon;
  const automationInfo = automationConfig[automationStatus];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const acosVsTarget = currentAcos - targetAcos;
  const acosStatus = acosVsTarget <= 0 ? 'good' : acosVsTarget < 5 ? 'warning' : 'bad';

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Account Health
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("gap-1", healthInfo.color)}>
                  <HealthIcon className="h-3.5 w-3.5" />
                  {healthInfo.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="font-medium mb-1">{healthInfo.description}</p>
                {healthReasons.length > 0 && (
                  <ul className="text-sm list-disc list-inside space-y-0.5">
                    {healthReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Savings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/reports" className="block group">
                  <div className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(savings)}</p>
                    <p className="text-xs text-muted-foreground">Savings</p>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total estimated savings from automations</p>
              </TooltipContent>
            </Tooltip>

            {/* Spend vs Sales */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/reports" className="block group">
                  <div className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(sales)}</p>
                    <p className="text-xs text-muted-foreground">
                      Sales <span className="text-muted-foreground/70">({formatCurrency(spend)} spend)</span>
                    </p>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ad spend: {formatCurrency(spend)}</p>
                <p>Attributed sales: {formatCurrency(sales)}</p>
                <p>ROAS: {spend > 0 ? (sales / spend).toFixed(2) : '0'}x</p>
              </TooltipContent>
            </Tooltip>

            {/* ACoS vs Target */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/settings" className="block group">
                  <div className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{currentAcos.toFixed(1)}%</p>
                      <span className={cn(
                        "text-xs font-medium",
                        acosStatus === 'good' ? 'text-success' :
                        acosStatus === 'warning' ? 'text-warning' : 'text-destructive'
                      )}>
                        / {targetAcos}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">ACoS vs Target</p>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Current ACoS: {currentAcos.toFixed(1)}%</p>
                <p>Target ACoS: {targetAcos}%</p>
                <p className="text-xs text-muted-foreground mt-1">Set target in Settings</p>
              </TooltipContent>
            </Tooltip>

            {/* Automation Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/automate" className="block group">
                  <div className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <Badge variant="outline" className={cn("text-sm", automationInfo.color)}>
                      {automationInfo.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Automation</p>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{automationInfo.description}</p>
                {automationReason && <p className="text-xs text-muted-foreground mt-1">{automationReason}</p>}
                <p className="text-xs text-muted-foreground mt-1">Click to manage in Settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};