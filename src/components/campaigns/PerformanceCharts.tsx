import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductGroup } from '@/hooks/useProductGroupedCampaigns';

interface PerformanceChartsProps {
  productGroups: ProductGroup[];
  campaigns: { campaign_id: string; campaign_name: string; acos: number; sales: number }[];
  adGroups: { id: string; name: string; acos: number; sales: number }[];
  loading?: boolean;
}

interface ChartDataItem {
  name: string;
  fullName: string;
  acos: number;
  isTop: boolean;
}

const truncateName = (name: string, maxLength: number = 12): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

const getTopAndBottomPerformers = (
  items: { name: string; acos: number; hasActivity: boolean }[],
  count: number = 3
): ChartDataItem[] => {
  // Only include items with activity (sales > 0 means acos is meaningful)
  const activeItems = items.filter(i => i.hasActivity && i.acos > 0);
  
  if (activeItems.length === 0) return [];
  
  // Sort by ACoS ascending (lower is better)
  const sorted = [...activeItems].sort((a, b) => a.acos - b.acos);
  
  // Get top performers (lowest ACoS) and bottom performers (highest ACoS)
  const top = sorted.slice(0, count);
  const bottom = sorted.slice(-count).reverse();
  
  // Combine and deduplicate (in case there are fewer than 6 items)
  const combined: ChartDataItem[] = [];
  const seen = new Set<string>();
  
  top.forEach(item => {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      combined.push({
        name: truncateName(item.name),
        fullName: item.name,
        acos: Math.round(item.acos * 10) / 10,
        isTop: true,
      });
    }
  });
  
  bottom.forEach(item => {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      combined.push({
        name: truncateName(item.name),
        fullName: item.name,
        acos: Math.round(item.acos * 10) / 10,
        isTop: false,
      });
    }
  });
  
  // Sort final array by ACoS for visual consistency
  return combined.sort((a, b) => a.acos - b.acos);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-md shadow-md px-3 py-2">
        <p className="text-sm font-medium text-foreground">{data.fullName}</p>
        <p className="text-sm text-muted-foreground">
          ACoS: <span className={data.isTop ? 'text-success' : 'text-destructive'}>{data.acos}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const PerformanceChart = ({ 
  title, 
  data, 
  loading 
}: { 
  title: string; 
  data: ChartDataItem[]; 
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgAcos = data.reduce((sum, d) => sum + d.acos, 0) / data.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
            <XAxis 
              type="number" 
              domain={[0, 'auto']}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={55}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              x={avgAcos} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
            <Bar dataKey="acos" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isTop ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} 
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-success" />
            Top Performers
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-destructive" />
            Bottom Performers
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export const PerformanceCharts = ({
  productGroups,
  campaigns,
  adGroups,
  loading,
}: PerformanceChartsProps) => {
  // Prepare ASIN data
  const asinData = useMemo(() => {
    const items = productGroups
      .filter(pg => pg.asin !== 'Uncategorized')
      .map(pg => ({
        name: pg.label || pg.asin,
        acos: pg.metrics.acos,
        hasActivity: pg.metrics.sales > 0,
      }));
    return getTopAndBottomPerformers(items);
  }, [productGroups]);

  // Prepare Campaign data
  const campaignData = useMemo(() => {
    const items = campaigns.map(c => ({
      name: c.campaign_name,
      acos: c.acos,
      hasActivity: c.sales > 0,
    }));
    return getTopAndBottomPerformers(items);
  }, [campaigns]);

  // Prepare Ad Group data
  const adGroupData = useMemo(() => {
    const items = adGroups.map(ag => ({
      name: ag.name,
      acos: ag.acos,
      hasActivity: ag.sales > 0,
    }));
    return getTopAndBottomPerformers(items);
  }, [adGroups]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <PerformanceChart 
        title="ACoS by ASIN" 
        data={asinData} 
        loading={loading} 
      />
      <PerformanceChart 
        title="ACoS by Campaign" 
        data={campaignData} 
        loading={loading} 
      />
      <PerformanceChart 
        title="ACoS by Ad Group" 
        data={adGroupData} 
        loading={loading} 
      />
    </div>
  );
};
