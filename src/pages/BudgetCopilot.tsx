import DashboardShell from "@/components/DashboardShell";
import { BudgetCopilotPanel } from "@/components/BudgetCopilotPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, DollarSign } from "lucide-react";

const BudgetCopilot = () => {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budget Copilot</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered budget optimization and pacing recommendations
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
        </div>

        <BudgetCopilotPanel />
      </div>
    </DashboardShell>
  );
};

export default BudgetCopilot;
