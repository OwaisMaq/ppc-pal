import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';

interface TimeseriesPoint {
  date: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
  orders?: number;
}

interface ACOSTrendChartProps {
  data: TimeseriesPoint[] | null;
  loading: boolean;
  targetAcos?: number;
}

export function ACOSTrendChart({ data, loading, targetAcos = 30 }: ACOSTrendChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">ACOS Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">ACOS Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate ACOS for each point
  const chartData = data.map((point) => {
    const acos = point.spend > 0 && point.sales > 0 
      ? (point.spend / point.sales) * 100 
      : 0;
    return {
      date: point.date,
      acos: Math.min(acos, 100), // Cap at 100% for display
      rawAcos: acos,
    };
  });

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">ACOS Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="acosGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'ACOS']}
                labelFormatter={formatDate}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine 
                y={targetAcos} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="acos"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#acosGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-end gap-2 mt-2 text-xs text-muted-foreground">
          <span className="inline-block w-4 h-px bg-muted-foreground opacity-50" style={{ borderTop: '1px dashed' }} />
          <span>Target: {targetAcos}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
