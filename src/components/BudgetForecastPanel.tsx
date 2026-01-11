import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBudgetForecast } from "@/hooks/useBudgetForecast";
import { TrendingUp, Calendar, AlertCircle, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { ReportIssueButton } from "@/components/ui/ReportIssueButton";

interface BudgetForecastPanelProps {
  profileId?: string;
}

export function BudgetForecastPanel({ profileId }: BudgetForecastPanelProps) {
  const [monthsToForecast, setMonthsToForecast] = useState(3);
  const { forecast, isLoading, generateForecast } = useBudgetForecast(profileId, monthsToForecast);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, string> = {
      high: 'bg-success/10 text-success border-success/20',
      medium: 'bg-warning/10 text-warning border-warning/20',
      low: 'bg-muted text-muted-foreground border-border',
    };
    return variants[confidence] || variants.low;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      high: 'bg-error/10 text-error border-error/20',
      medium: 'bg-warning/10 text-warning border-warning/20',
      low: 'bg-muted text-muted-foreground border-border',
    };
    return variants[priority] || variants.low;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Budget Forecast
          </h2>
          <p className="text-muted-foreground mt-1">
            Predict future spend and optimize budget allocation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReportIssueButton 
            featureId="budget_forecast" 
            featureLabel="Budget Forecast"
            variant="minimal"
          />
          <Select
            value={monthsToForecast.toString()}
            onValueChange={(value) => setMonthsToForecast(parseInt(value))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Month</SelectItem>
              <SelectItem value="3">3 Months</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={generateForecast}
            disabled={isLoading || !profileId}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {isLoading ? 'Generating...' : 'Generate Forecast'}
          </Button>
        </div>
      </div>

      {!forecast && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Click "Generate Forecast" to predict future budget needs
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-muted-foreground">Analyzing historical data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {forecast && !isLoading && (
        <>
          {/* Insights Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg Monthly Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(forecast.insights.averageMonthlySpend)}</div>
                <p className="text-xs text-muted-foreground mt-1">Based on last 6 months</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Spending Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{forecast.insights.trend}</div>
                <p className="text-xs text-muted-foreground mt-1">Overall direction</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Seasonal Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{forecast.insights.seasonalPattern || 'None detected'}</div>
                <p className="text-xs text-muted-foreground mt-1">Historical analysis</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Forecasts */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Predictions</CardTitle>
              <CardDescription>AI-generated budget forecasts for upcoming months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecast.forecasts.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-4 rounded-lg border bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        <Badge className={getConfidenceBadge(item.confidence)}>
                          {item.confidence} confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.reasoning}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold">{formatCurrency(item.predictedSpend)}</div>
                      <p className="text-xs text-muted-foreground">Predicted spend</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Recommendations</CardTitle>
              <CardDescription>AI-suggested budget adjustments to optimize performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                    <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{rec.title}</span>
                        <Badge className={getPriorityBadge(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                      <div className="text-sm font-medium text-primary">
                        Suggested: {formatCurrency(rec.suggestedAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            Forecast generated {new Date(forecast.generatedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
