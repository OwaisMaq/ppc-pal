import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface OffenderItem {
  id: string;
  name: string;
  type: 'campaign' | 'keyword' | 'target';
  spend: number;
  acos: number;
  waste: number;
  severity: 'high' | 'medium' | 'low';
}

interface TopOffendersProps {
  items?: OffenderItem[];
  loading?: boolean;
  className?: string;
}

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export const TopOffenders: React.FC<TopOffendersProps> = ({ 
  items = [], 
  loading = false, 
  className 
}) => {
  const severityColors = {
    high: "text-red-600 bg-red-50 border-red-200",
    medium: "text-orange-600 bg-orange-50 border-orange-200", 
    low: "text-yellow-600 bg-yellow-50 border-yellow-200"
  };

  const typeIcons = {
    campaign: DollarSign,
    keyword: AlertTriangle,
    target: TrendingUp
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Top Offenders
          </CardTitle>
          <CardDescription>
            Campaigns and keywords driving the most inefficient spend
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-muted rounded-lg h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Top Offenders
          </CardTitle>
          <CardDescription>
            No significant inefficiencies detected in current data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-muted-foreground/40" />
            <p>All campaigns appear to be performing efficiently</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Top Offenders
        </CardTitle>
        <CardDescription>
          Items driving the most inefficient spend (Pareto Principle - 20% causing 80% of issues)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.slice(0, 5).map((item) => {
            const Icon = typeIcons[item.type];
            return (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  severityColors[item.severity]
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs py-0 px-1">
                        {item.type}
                      </Badge>
                      <span>ACOS: {item.acos.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">
                    {formatCurrency(item.waste)} waste
                  </div>
                  <div className="text-xs opacity-75">
                    {formatCurrency(item.spend)} spend
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};