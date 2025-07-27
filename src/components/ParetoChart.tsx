import { useMemo } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { Keyword, AdGroup } from "@/lib/amazon/types";

interface ParetoChartProps {
  keywords: Keyword[];
  adGroups: AdGroup[];
}

const ParetoChart = ({ keywords, adGroups }: ParetoChartProps) => {
  const paretoData = useMemo(() => {
    // Filter keywords with valid ACoS data
    const validKeywords = keywords.filter(k => 
      k.acos !== null && 
      k.acos !== undefined && 
      k.spend > 0
    );

    if (validKeywords.length === 0) return [];

    // Sort keywords by ACoS (ascending - lower ACoS is better performance)
    const sortedKeywords = validKeywords.sort((a, b) => (a.acos || 0) - (b.acos || 0));

    // Create Pareto data with cumulative percentage
    let cumulativeCount = 0;
    const totalKeywords = sortedKeywords.length;

    return sortedKeywords.map((keyword, index) => {
      cumulativeCount += 1;
      const cumulativePercentage = (cumulativeCount / totalKeywords) * 100;
      
      const adGroup = adGroups.find(ag => ag.id === keyword.adgroup_id);
      
      return {
        keyword: keyword.keyword_text.length > 20 
          ? keyword.keyword_text.substring(0, 20) + "..." 
          : keyword.keyword_text,
        fullKeyword: keyword.keyword_text,
        adGroup: adGroup?.name || "Unknown",
        acos: keyword.acos,
        spend: keyword.spend,
        sales: keyword.sales,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        rank: index + 1
      };
    });
  }, [keywords, adGroups]);

  if (paretoData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Keyword Performance Pareto Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No keyword data with ACoS available for Pareto analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.fullKeyword}</p>
          <p className="text-sm text-muted-foreground">Ad Group: {data.adGroup}</p>
          <p className="text-sm">ACoS: <span className="font-semibold text-red-600">{data.acos?.toFixed(1)}%</span></p>
          <p className="text-sm">Spend: <span className="font-semibold">${data.spend?.toFixed(2)}</span></p>
          <p className="text-sm">Sales: <span className="font-semibold text-green-600">${data.sales?.toFixed(2)}</span></p>
          <p className="text-sm">Rank: <span className="font-semibold">#{data.rank}</span></p>
          <p className="text-sm">Cumulative: <span className="font-semibold">{data.cumulativePercentage}%</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Keyword Performance Pareto Chart (by ACoS)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Best to worst performing keywords ranked by ACoS. Lower ACoS indicates better performance.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={paretoData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="keyword" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={10}
              />
              <YAxis yAxisId="left" orientation="left" label={{ value: 'ACoS (%)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="acos" 
                fill="#ef4444" 
                name="ACoS (%)"
                opacity={0.7}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativePercentage" 
                stroke="#2563eb" 
                strokeWidth={2}
                name="Cumulative %"
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>• Lower ACoS values indicate better keyword performance</p>
          <p>• The blue line shows cumulative percentage of keywords analyzed</p>
          <p>• Focus optimization efforts on high-ACoS keywords (right side of chart)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParetoChart;