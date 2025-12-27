import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, DollarSign, TrendingUp, Target, Bot, ChevronRight, AlertTriangle, CheckCircle } from "lucide-react";
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
    label: 'Protected',
    color: 'bg-success/10 text-success border-success/30',
    icon: CheckCircle,
    description: 'PPC Pal is actively protecting your margins'
  },
  watch: {
    label: 'Monitoring',
    color: 'bg-warning/10 text-warning border-warning/30',
    icon: AlertTriangle,
    description: 'Some metrics require monitoring'
  },
  at_risk: {
    label: 'Attention Needed',
    color: 'bg-error/10 text-error border-error/30',
    icon: AlertTriangle,
    description: 'Immediate attention required'
  }
};

const automationConfig = {
  on: {
    label: 'Active',
    color: 'bg-success/10 text-success border-success/30',
    description: 'PPC Pal is actively protecting your account'
  },
  limited: {
    label: 'Limited',
    color: 'bg-warning/10 text-warning border-warning/30',
    description: 'Some protection rules are disabled'
  },
  paused: {
    label: 'Paused',
    color: 'bg-muted text-muted-foreground border-border',
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
                <div key={i} className="h-24 bg-muted rounded" />
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
              <Shield className="h-5 w-5 text-primary" />
              Account Protection
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("gap-1.5", healthInfo.color)}>
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
          {/* OUTCOME-FIRST: Wasted Spend Saved is the hero metric */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Savings - PRIMARY OUTCOME METRIC */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/reports" className="block group col-span-2 lg:col-span-1">
                  <div className="p-4 rounded-lg border-2 border-success/30 bg-success/5 hover:bg-success/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-success/20">
                        <DollarSign className="h-4 w-4 text-success" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-3xl font-display font-bold text-success">{formatCurrency(savings)}</p>
                    <p className="text-xs text-muted-foreground font-medium">Wasted Spend Saved</p>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total savings from PPC Pal protection actions</p>
              </TooltipContent>
            </Tooltip>

            {/* Spend vs Sales */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/reports" className="block group">
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl font-display font-bold">{formatCurrency(sales)}</p>
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
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-display font-bold">{currentAcos.toFixed(1)}%</p>
                      <span className={cn(
                        "text-xs font-medium",
                        acosStatus === 'good' ? 'text-success' :
                        acosStatus === 'warning' ? 'text-warning' : 'text-error'
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
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <Badge variant="outline" className={cn("text-sm", automationInfo.color)}>
                      {automationInfo.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Protection Status</p>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{automationInfo.description}</p>
                {automationReason && <p className="text-xs text-muted-foreground mt-1">{automationReason}</p>}
                <p className="text-xs text-muted-foreground mt-1">Click to manage settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
