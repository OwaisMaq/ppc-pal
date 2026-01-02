import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, DollarSign, TrendingUp, Target, Bot, ChevronRight, AlertTriangle, CheckCircle, Package, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useASINs } from "@/hooks/useASINs";

export type HealthStatus = 'healthy' | 'watch' | 'at_risk';
export type AutomationStatus = 'on' | 'limited' | 'paused';
export type DateRangePreset = '24h' | '7d' | '30d';

export interface MarketplaceOption {
  id: string;
  name: string;
}

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
  dateRangePreset?: DateRangePreset;
  onDateRangePresetChange?: (preset: DateRangePreset) => void;
  selectedASIN?: string | null;
  onASINChange?: (asin: string | null) => void;
  selectedMarketplace?: string | null;
  onMarketplaceChange?: (marketplace: string | null) => void;
  marketplaceOptions?: MarketplaceOption[];
  connectionCount?: number;
  autoOptimizedAsins?: number;
  totalAsins?: number;
  currency?: string;
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
  targetAcos = 20,
  automationStatus,
  automationReason,
  loading,
  dateRangePreset = '30d',
  onDateRangePresetChange,
  selectedASIN,
  onASINChange,
  selectedMarketplace,
  onMarketplaceChange,
  marketplaceOptions = [],
  connectionCount = 1,
  autoOptimizedAsins,
  totalAsins,
  currency = 'USD'
}: AccountHealthCardProps) => {
  const healthInfo = healthConfig[healthStatus];
  const HealthIcon = healthInfo.icon;
  const automationInfo = automationConfig[automationStatus];
  
  const { asins } = useASINs();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Overview
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={cn("gap-1.5", healthInfo.color)}>
                    <HealthIcon className="h-3.5 w-3.5" />
                    {healthInfo.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
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
            
            {/* Compact filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Marketplace filter */}
              <Select
                value={selectedMarketplace || "all"}
                onValueChange={(value) => onMarketplaceChange?.(value === "all" ? null : value)}
              >
                <SelectTrigger className="h-7 w-[130px] text-xs">
                  <Globe className="h-3 w-3 mr-1.5 shrink-0" />
                  <SelectValue placeholder={marketplaceOptions.length === 1 ? marketplaceOptions[0]?.name : "All Markets"} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {marketplaceOptions.length > 1 && (
                    <SelectItem value="all" className="text-xs">
                      All Markets ({connectionCount})
                    </SelectItem>
                  )}
                  {marketplaceOptions.map((mp) => (
                    <SelectItem key={mp.id} value={mp.id} className="text-xs">
                      {mp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Date range toggle */}
              <ToggleGroup
                type="single"
                value={dateRangePreset}
                onValueChange={(value) => value && onDateRangePresetChange?.(value as DateRangePreset)}
                className="h-7"
              >
                <ToggleGroupItem value="24h" className="text-xs px-2 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  24h
                </ToggleGroupItem>
                <ToggleGroupItem value="7d" className="text-xs px-2 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  7d
                </ToggleGroupItem>
                <ToggleGroupItem value="30d" className="text-xs px-2 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  30d
                </ToggleGroupItem>
              </ToggleGroup>
              
              {/* ASIN filter */}
              <Select
                value={selectedASIN || "all"}
                onValueChange={(value) => onASINChange?.(value === "all" ? null : value)}
              >
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <Package className="h-3 w-3 mr-1.5 shrink-0" />
                  <SelectValue placeholder="All ASINs" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all" className="text-xs">All ASINs</SelectItem>
                  {asins.map((asinInfo) => (
                    <SelectItem key={asinInfo.asin} value={asinInfo.asin} className="text-xs font-mono">
                      {asinInfo.label || asinInfo.asin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OUTCOME-FIRST: Wasted Spend Saved is the hero metric */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Savings - PRIMARY OUTCOME METRIC */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/analytics" className="block group">
                  <div className="p-4 rounded-lg border-2 border-success/30 bg-success/5 hover:bg-success/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-success/20">
                        <DollarSign className="h-4 w-4 text-success" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl font-display font-bold text-success">{formatCurrency(savings)}</p>
                    <p className="text-xs text-muted-foreground font-medium">Wasted Spend Saved</p>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total savings from PPC Pal protection actions</p>
              </TooltipContent>
            </Tooltip>

            {/* Sales */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/analytics" className="block group">
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl font-display font-bold">{formatCurrency(sales)}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attributed sales: {formatCurrency(sales)}</p>
                <p>ROAS: {spend > 0 ? (sales / spend).toFixed(2) : '0'}x</p>
              </TooltipContent>
            </Tooltip>

            {/* Spend */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/analytics" className="block group">
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl font-display font-bold">{formatCurrency(spend)}</p>
                    <p className="text-xs text-muted-foreground">Ad Spend</p>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total ad spend for the selected period</p>
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
                <Link to="/governance" className="block group">
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
                    <p className="text-xs text-muted-foreground mt-1">Automation Status</p>
                    {totalAsins !== undefined && totalAsins > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {autoOptimizedAsins ?? 0}/{totalAsins} ASINs
                      </p>
                    )}
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
