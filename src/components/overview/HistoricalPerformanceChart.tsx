import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useHistoricalPerformance, PerformanceMilestone } from '@/hooks/useHistoricalPerformance';
import { TrendingUp } from 'lucide-react';

interface HistoricalPerformanceChartProps {
  profileId: string | undefined;
}

export const HistoricalPerformanceChart = ({ profileId }: HistoricalPerformanceChartProps) => {
  const { data, milestones, loading, error } = useHistoricalPerformance(profileId);

  // Scale spend to match sales range for better visualization
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const maxSales = Math.max(...data.map(d => d.sales));
    const maxSpend = Math.max(...data.map(d => d.spend));
    const spendScale = maxSales > 0 && maxSpend > 0 ? maxSales / maxSpend : 1;

    return data.map(d => ({
      ...d,
      spendScaled: d.spend * spendScale,
      formattedDate: format(parseISO(d.date), 'MMM d'),
    }));
  }, [data]);

  // Find milestone indices for reference lines
  const milestoneData = useMemo(() => {
    return milestones.map(m => ({
      ...m,
      dataPoint: chartData.find(d => d.date === m.date),
    }));
  }, [milestones, chartData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0]?.payload;
    if (!dataPoint) return null;

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Sales:</span>
            <span className="font-medium text-success">{formatCurrency(dataPoint.sales)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Spend:</span>
            <span className="font-medium text-primary">{formatCurrency(dataPoint.spend)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">ACOS:</span>
            <span className={`font-medium ${dataPoint.acos > 30 ? 'text-destructive' : 'text-success'}`}>
              {dataPoint.acos.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Performance History
          </CardTitle>
          <CardDescription>Historical ACOS, Sales & Spend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {error || 'No historical data available yet'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Performance History
        </CardTitle>
        <CardDescription>
          Historical ACOS, Sales & Spend with optimization milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                className="text-muted-foreground"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 'auto']}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />

              {/* Milestone reference lines */}
              {milestoneData.map((milestone, index) => (
                <ReferenceLine
                  key={`milestone-${index}`}
                  x={milestone.dataPoint?.formattedDate}
                  yAxisId="left"
                  stroke={milestone.type === 'first_optimization' ? 'hsl(var(--primary))' : 'hsl(var(--success))'}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: milestone.label,
                    position: 'top',
                    fill: milestone.type === 'first_optimization' ? 'hsl(var(--primary))' : 'hsl(var(--success))',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                />
              ))}

              {/* Data lines */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="spendScaled"
                name="Spend (scaled)"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="acos"
                name="ACOS"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Milestone Legend */}
        {milestoneData.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            {milestoneData.map((milestone, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className={`w-3 h-0.5 ${
                    milestone.type === 'first_optimization' ? 'bg-primary' : 'bg-success'
                  }`}
                  style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0' }}
                />
                <span className="text-muted-foreground">
                  {milestone.label}: {format(parseISO(milestone.date), 'MMM d, yyyy')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
