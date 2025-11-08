import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { AttributionAnalytics } from "@/components/AttributionAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, Clock, Target, TrendingUp } from "lucide-react";

const Attribution = () => {
  const [dateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo] = useState(new Date().toISOString().split('T')[0]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attribution Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Multi-touch attribution models to understand your customer journey
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Paths</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Analyzing</div>
              <p className="text-xs text-muted-foreground">
                Customer touchpoint sequences
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time to Convert</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Tracked</div>
              <p className="text-xs text-muted-foreground">
                Average customer journey length
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attribution Models</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Multiple</div>
              <p className="text-xs text-muted-foreground">
                Compare different models
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insights</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">
                Optimize touchpoint strategy
              </p>
            </CardContent>
          </Card>
        </div>

        <AttributionAnalytics 
          dateFrom={dateFrom} 
          dateTo={dateTo}
        />
      </div>
    </DashboardShell>
  );
};

export default Attribution;
