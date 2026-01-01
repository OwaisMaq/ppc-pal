import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CampaignTypeData {
  type: string;
  spend: number;
  count?: number;
}

interface CampaignTypeMixChartProps {
  data: CampaignTypeData[] | null;
  loading: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(158 64% 52%)', // Emerald accent
  'hsl(38 92% 50%)',  // Amber
  'hsl(215 16% 47%)', // Neutral
];

const TYPE_LABELS: Record<string, string> = {
  sponsoredProducts: 'Sponsored Products',
  sponsoredBrands: 'Sponsored Brands',
  sponsoredDisplay: 'Sponsored Display',
  SP: 'Sponsored Products',
  SB: 'Sponsored Brands',
  SD: 'Sponsored Display',
};

export function CampaignTypeMixChart({ data, loading }: CampaignTypeMixChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Spend by Campaign Type</CardTitle>
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
          <CardTitle className="text-base font-medium">Spend by Campaign Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSpend = data.reduce((sum, d) => sum + d.spend, 0);
  
  const chartData = data
    .filter(d => d.spend > 0)
    .map(d => ({
      name: TYPE_LABELS[d.type] || d.type,
      value: d.spend,
      percentage: totalSpend > 0 ? ((d.spend / totalSpend) * 100).toFixed(1) : '0',
    }));

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Spend by Campaign Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    strokeWidth={0}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Spend']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend 
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-xs text-foreground">
                    {value} ({entry.payload.percentage}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
