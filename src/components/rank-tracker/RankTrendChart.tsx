import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankHistoryPoint } from "@/hooks/useRankTracker";
import { format } from "date-fns";

interface RankTrendChartProps {
  history: RankHistoryPoint[];
  keyword: string;
}

export function RankTrendChart({ history, keyword }: RankTrendChartProps) {
  const chartData = useMemo(() => {
    return history.map((point) => ({
      date: format(new Date(point.checked_at), "MMM d"),
      sponsored: point.sponsored_rank,
      organic: point.organic_rank,
    }));
  }, [history]);

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rank History: {keyword}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No history data yet. Ranks will be tracked daily.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rank History: {keyword}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                reversed 
                domain={[1, 'auto']}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'Rank', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="sponsored" 
                name="Sponsored Rank"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="organic" 
                name="Organic Rank"
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
