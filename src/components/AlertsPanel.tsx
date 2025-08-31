import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Info, CheckCircle, Clock, Eye } from "lucide-react";
import { Alert } from "@/hooks/useAutomation";
import { formatDistanceToNow } from "date-fns";

interface AlertsPanelProps {
  alerts: Alert[];
  loading: boolean;
  onAcknowledgeAlerts: (alertIds: string[]) => void;
  onFilterChange: (state?: string) => void;
}

const LEVEL_ICONS = {
  info: Info,
  warn: AlertTriangle,
  critical: AlertTriangle
};

const LEVEL_COLORS = {
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
};

const STATE_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-gray-100 text-gray-800',
  resolved: 'bg-green-100 text-green-800'
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  loading,
  onAcknowledgeAlerts,
  onFilterChange
}) => {
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('all');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAlerts(alerts.filter(a => a.state === 'new').map(a => a.id));
    } else {
      setSelectedAlerts([]);
    }
  };

  const handleSelectAlert = (alertId: string, checked: boolean) => {
    if (checked) {
      setSelectedAlerts(prev => [...prev, alertId]);
    } else {
      setSelectedAlerts(prev => prev.filter(id => id !== alertId));
    }
  };

  const handleAcknowledge = async () => {
    if (selectedAlerts.length === 0) return;
    
    await onAcknowledgeAlerts(selectedAlerts);
    setSelectedAlerts([]);
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    onFilterChange(value === 'all' ? undefined : value);
  };

  const newAlerts = alerts.filter(a => a.state === 'new');
  const canSelectAll = newAlerts.length > 0;
  const allSelected = newAlerts.length > 0 && selectedAlerts.length === newAlerts.length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alerts ({alerts.length})
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedAlerts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcknowledge}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Acknowledge ({selectedAlerts.length})
              </Button>
            )}
          </div>
        </div>
        
        {canSelectAll && (
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-muted-foreground">
              Select all new alerts
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No alerts to display</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const LevelIcon = LEVEL_ICONS[alert.level as keyof typeof LEVEL_ICONS] || Info;
              const isSelected = selectedAlerts.includes(alert.id);
              const canSelect = alert.state === 'new';
              
              return (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    LEVEL_COLORS[alert.level as keyof typeof LEVEL_COLORS]
                  } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {canSelect && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectAlert(alert.id, checked as boolean)}
                        className="mt-1"
                      />
                    )}
                    
                    <LevelIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{alert.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={STATE_COLORS[alert.state]}
                          >
                            {alert.state}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm">{alert.message}</p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          {alert.automation_rules && (
                            <span>Rule: {alert.automation_rules.name}</span>
                          )}
                          {alert.entity_type && alert.entity_id && (
                            <span>
                              {alert.entity_type}: {alert.entity_id}
                            </span>
                          )}
                        </div>
                        
                        {alert.data && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      {alert.acknowledged_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            Acknowledged {formatDistanceToNow(new Date(alert.acknowledged_at), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};