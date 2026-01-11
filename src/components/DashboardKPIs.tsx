import React, { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight, DollarSign, Target, BarChart3 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import KpiChip from "./KpiChip";
import { DashboardKPIs as KPIData } from "@/hooks/useDashboardData";
import { TimeseriesDataPoint } from "@/hooks/useAmsMetrics";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { ReportIssueButton } from "@/components/ui/ReportIssueButton";

interface DashboardKPIsProps {
  data: KPIData | null;
  loading: boolean;
  error: string | null;
  previousData?: KPIData | null; // For delta calculations
  timeseries?: TimeseriesDataPoint[];
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({
  data,
  loading,
  error,
  previousData,
  timeseries = []
}) => {
  const [showSecondary, setShowSecondary] = useState(false);
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      direction: change >= 0 ? 'up' as const : 'down' as const
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-destructive text-sm">Error loading KPIs: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-muted/50 border rounded-lg text-center">
        <p className="text-muted-foreground">No data available for the selected period</p>
      </div>
    );
  }

  // Group KPIs by category for better cognitive load management
  const primaryKpis = [
    {
      label: "Spend",
      value: formatCurrency(data.spend),
      change: previousData ? calculateChange(data.spend, previousData.spend) : undefined,
      category: "Performance",
      sparklineData: timeseries.map(d => ({ value: d.spend }))
    },
    {
      label: "Sales", 
      value: formatCurrency(data.sales),
      change: previousData ? calculateChange(data.sales, previousData.sales) : undefined,
      category: "Performance",
      sparklineData: timeseries.map(d => ({ value: d.sales }))
    },
    {
      label: "ACOS",
      value: formatPercentage(data.acos),
      change: previousData ? calculateChange(data.acos, previousData.acos) : undefined,
      category: "Efficiency",
      sparklineData: timeseries.map(d => ({ 
        value: d.sales > 0 ? (d.spend / d.sales) * 100 : 0 
      }))
    },
    {
      label: "ROAS",
      value: data.roas.toFixed(2),
      change: previousData ? calculateChange(data.roas, previousData.roas) : undefined,
      category: "Efficiency",
      sparklineData: timeseries.map(d => ({ 
        value: d.spend > 0 ? d.sales / d.spend : 0 
      }))
    }
  ];

  const secondaryKpis = [
    {
      label: "Clicks",
      value: formatNumber(data.clicks),
      change: previousData ? calculateChange(data.clicks, previousData.clicks) : undefined,
      category: "Volume",
      sparklineData: timeseries.map(d => ({ value: d.clicks }))
    },
    {
      label: "Impressions", 
      value: formatNumber(data.impressions),
      change: previousData ? calculateChange(data.impressions, previousData.impressions) : undefined,
      category: "Volume",
      sparklineData: timeseries.map(d => ({ value: d.impressions }))
    },
    {
      label: "CPC",
      value: formatCurrency(data.cpc),
      change: previousData ? calculateChange(data.cpc, previousData.cpc) : undefined,
      category: "Efficiency",
      sparklineData: timeseries.map(d => ({ 
        value: d.clicks > 0 ? d.spend / d.clicks : 0 
      }))
    },
    {
      label: "CTR",
      value: formatPercentage(data.ctr),
      change: previousData ? calculateChange(data.ctr, previousData.ctr) : undefined,
      category: "Volume",
      sparklineData: timeseries.map(d => ({ 
        value: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0 
      }))
    },
    {
      label: "CVR",
      value: formatPercentage(data.cvr),
      change: previousData ? calculateChange(data.cvr, previousData.cvr) : undefined,
      category: "Efficiency",
      sparklineData: timeseries.map(d => ({ 
        value: d.clicks > 0 ? (d.orders / d.clicks) * 100 : 0 
      }))
    }
  ];

  // Group secondary KPIs by category
  const groupedSecondaryKpis = secondaryKpis.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, typeof secondaryKpis>);

  const categoryIcons = {
    Performance: DollarSign,
    Efficiency: Target,
    Volume: BarChart3
  };

  return (
    <div className="space-y-6">
      {/* Primary KPIs - Always Visible */}
      <div className="flex items-center justify-end mb-2">
        <ReportIssueButton 
          featureId="dashboard_kpis" 
          featureLabel="Dashboard KPIs"
          variant="minimal"
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryKpis.map((kpi) => (
          <KpiChip
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            className="h-32 md:h-28"
            primary
            sparklineData={kpi.sparklineData}
          />
        ))}
      </div>

      {/* Secondary KPIs - Collapsible */}
      <Collapsible open={showSecondary} onOpenChange={setShowSecondary}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground">
            {showSecondary ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {showSecondary ? 'Hide' : 'Show'} Detailed Metrics
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 mt-4">
          {Object.entries(groupedSecondaryKpis).map(([category, kpis]) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons];
            return (
              <Card key={category} className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {category} Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {kpis.map((kpi) => (
                      <KpiChip
                        key={kpi.label}
                        label={kpi.label}
                        value={kpi.value}
                        change={kpi.change}
                        className="h-24 text-sm"
                        compact
                        sparklineData={kpi.sparklineData}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
      
      {data.duration_ms && (
        <div className="text-xs text-muted-foreground text-right">
          Query time: {data.duration_ms}ms
        </div>
      )}
    </div>
  );
};