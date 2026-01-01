import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Bell, AlertTriangle, TrendingUp, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveAlert {
  id: string;
  type: 'acos' | 'spend' | 'cpc' | 'other';
  level: 'info' | 'warn' | 'critical';
  title: string;
  message: string;
  entityName?: string;
  value?: string;
  threshold?: string;
  createdAt: string;
}

interface ActiveAlertsCardProps {
  alerts: ActiveAlert[];
  loading?: boolean;
}

const alertTypeIcons = {
  acos: TrendingUp,
  spend: TrendingUp,
  cpc: TrendingUp,
  other: AlertTriangle
};

const alertLevelStyles = {
  info: 'bg-info/10 text-info border-info/20',
  warn: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20'
};

export const ActiveAlertsCard = ({ alerts, loading }: ActiveAlertsCardProps) => {
  const displayAlerts = alerts.slice(0, 5);
  const hasMore = alerts.length > 5;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Active Alerts
            <Badge variant="secondary" className="ml-1">{alerts.length}</Badge>
          </CardTitle>
          <Link 
            to="/settings" 
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Configure
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayAlerts.map((alert) => {
            const Icon = alertTypeIcons[alert.type] || AlertTriangle;
            return (
              <div 
                key={alert.id} 
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  alertLevelStyles[alert.level]
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium">{alert.title}</p>
                    {alert.entityName && (
                      <Badge variant="outline" className="text-xs py-0 px-1.5">
                        {alert.entityName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                  {(alert.value || alert.threshold) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.value && <span className="font-medium">{alert.value}</span>}
                      {alert.threshold && <span className="opacity-70"> (threshold: {alert.threshold})</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          
          {hasMore && (
            <Link 
              to="/governance"
              className="flex items-center justify-center gap-1 p-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all alerts
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};