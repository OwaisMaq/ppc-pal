import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import KpiChip from "./KpiChip";
import { DashboardKPIs as KPIData } from "@/hooks/useDashboardData";

interface DashboardKPIsProps {
  data: KPIData | null;
  loading: boolean;
  error: string | null;
  previousData?: KPIData | null; // For delta calculations
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({
  data,
  loading,
  error,
  previousData
}) => {
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
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

  const kpis = [
    {
      label: "Spend",
      value: formatCurrency(data.spend),
      change: previousData ? calculateChange(data.spend, previousData.spend) : undefined
    },
    {
      label: "Sales",
      value: formatCurrency(data.sales),
      change: previousData ? calculateChange(data.sales, previousData.sales) : undefined
    },
    {
      label: "ACOS",
      value: formatPercentage(data.acos),
      change: previousData ? calculateChange(data.acos, previousData.acos) : undefined
    },
    {
      label: "ROAS",
      value: data.roas.toFixed(2),
      change: previousData ? calculateChange(data.roas, previousData.roas) : undefined
    },
    {
      label: "Clicks",
      value: formatNumber(data.clicks),
      change: previousData ? calculateChange(data.clicks, previousData.clicks) : undefined
    },
    {
      label: "Impressions",
      value: formatNumber(data.impressions),
      change: previousData ? calculateChange(data.impressions, previousData.impressions) : undefined
    },
    {
      label: "CPC",
      value: formatCurrency(data.cpc),
      change: previousData ? calculateChange(data.cpc, previousData.cpc) : undefined
    },
    {
      label: "CTR",
      value: formatPercentage(data.ctr),
      change: previousData ? calculateChange(data.ctr, previousData.ctr) : undefined
    },
    {
      label: "CVR",
      value: formatPercentage(data.cvr),
      change: previousData ? calculateChange(data.cvr, previousData.cvr) : undefined
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
        {kpis.map((kpi) => (
          <KpiChip
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
          />
        ))}
      </div>
      
      {data.duration_ms && (
        <div className="text-xs text-muted-foreground text-right">
          Query time: {data.duration_ms}ms
        </div>
      )}
    </div>
  );
};