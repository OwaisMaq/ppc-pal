import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeseriesPoint } from "@/hooks/useDashboardData";
import { format, parseISO } from "date-fns";
import { ReportIssueButton } from "@/components/ui/ReportIssueButton";

interface DashboardChartProps {
  data: { points: TimeseriesPoint[]; duration_ms?: number } | null;
  loading: boolean;
  error: string | null;
  granularity: 'day' | 'week' | 'month';
}

export const DashboardChart: React.FC<DashboardChartProps> = ({
  data,
  loading,
  error,
  granularity
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-destructive text-sm">Error loading chart data: {error}</p>
      </div>
    );
  }

  if (!data?.points || data.points.length === 0) {
    return (
      <div className="p-8 text-center bg-muted/50 border rounded-lg">
        <p className="text-muted-foreground">
          No chart data available for the selected period.
        </p>
      </div>
    );
  }

  // Aggregate data based on granularity
  const aggregatedData = React.useMemo(() => {
    if (granularity === 'day') {
      return data.points.map(point => ({
        ...point,
        formattedDate: format(parseISO(point.date), 'MMM dd')
      }));
    }

    // For week/month aggregation, group the data
    const groups = new Map<string, {
      spend: number;
      sales: number;
      clicks: number;
      impressions: number;
      dates: string[];
    }>();

    data.points.forEach(point => {
      const date = parseISO(point.date);
      let key: string;

      if (granularity === 'week') {
        // Group by week starting Monday
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        key = format(weekStart, 'yyyy-MM-dd');
      } else {
        // Group by month
        key = format(date, 'yyyy-MM');
      }

      if (!groups.has(key)) {
        groups.set(key, {
          spend: 0,
          sales: 0,
          clicks: 0,
          impressions: 0,
          dates: []
        });
      }

      const group = groups.get(key)!;
      group.spend += point.spend;
      group.sales += point.sales;
      group.clicks += point.clicks;
      group.impressions += point.impressions;
      group.dates.push(point.date);
    });

    return Array.from(groups.entries()).map(([key, group]) => ({
      date: key,
      formattedDate: granularity === 'week' 
        ? `Week ${format(parseISO(key), 'MMM dd')}`
        : format(parseISO(key + '-01'), 'MMM yyyy'),
      spend: group.spend,
      sales: group.sales,
      clicks: group.clicks,
      impressions: group.impressions
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [data.points, granularity]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Performance Trend</h3>
        <div className="flex items-center gap-2">
          {data.duration_ms && (
            <p className="text-xs text-muted-foreground">
              Query time: {data.duration_ms}ms
            </p>
          )}
          <ReportIssueButton 
            featureId="dashboard_chart" 
            featureLabel="Performance Chart"
            variant="minimal"
          />
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={aggregatedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="formattedDate" 
              className="text-muted-foreground"
              fontSize={12}
            />
            <YAxis 
              yAxisId="currency"
              orientation="left"
              className="text-muted-foreground"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <YAxis 
              yAxisId="number"
              orientation="right"
              className="text-muted-foreground"
              fontSize={12}
              tickFormatter={formatNumber}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'spend' || name === 'sales') {
                  return [formatCurrency(value), name];
                }
                return [formatNumber(value), name];
              }}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              yAxisId="currency"
              type="monotone" 
              dataKey="spend" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Spend"
            />
            <Line 
              yAxisId="currency"
              type="monotone" 
              dataKey="sales" 
              stroke="hsl(var(--brand-accent))" 
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Sales"
            />
            <Line 
              yAxisId="number"
              type="monotone" 
              dataKey="clicks" 
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Clicks"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};