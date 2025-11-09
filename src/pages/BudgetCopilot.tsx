import DashboardShell from "@/components/DashboardShell";
import { BudgetCopilotPanel } from "@/components/BudgetCopilotPanel";
import { BudgetForecastPanel } from "@/components/BudgetForecastPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { useAmazonConnections } from "@/hooks/useAmazonConnections";
import { useState } from "react";

const BudgetCopilot = () => {
  const { connections } = useAmazonConnections();
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(
    connections?.[0]?.profile_id
  );

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budget Copilot</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered budget optimization, pacing, and forecasting
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Recommendations</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">
                Analyzing campaign performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Efficiency</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Optimized</div>
              <p className="text-xs text-muted-foreground">
                Real-time pacing analysis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Calculated</div>
              <p className="text-xs text-muted-foreground">
                Based on current performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forecast Ready</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Available</div>
              <p className="text-xs text-muted-foreground">
                AI-powered predictions
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pacing" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pacing">Budget Pacing</TabsTrigger>
            <TabsTrigger value="forecast">AI Forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="pacing">
            <BudgetCopilotPanel />
          </TabsContent>

          <TabsContent value="forecast">
            <BudgetForecastPanel profileId={selectedProfileId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
};

export default BudgetCopilot;
