import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface DataFreshnessProps {
  connectionId: string;
  className?: string;
}

export function DataFreshnessIndicator({ connectionId, className }: DataFreshnessProps) {
  const [freshness, setFreshness] = useState<{
    lastTrafficMessage?: string;
    lastConversionMessage?: string;
    messages24h?: number;
    dataAgeHours?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFreshness = async () => {
      try {
        const { data, error } = await supabase.rpc('get_ams_data_freshness', {
          connection_uuid: connectionId
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const freshData = data[0];
          setFreshness({
            lastTrafficMessage: freshData.last_traffic_message,
            lastConversionMessage: freshData.last_conversion_message,
            messages24h: freshData.messages_24h,
            dataAgeHours: freshData.data_age_hours,
          });
        }
      } catch (error) {
        console.error('Error fetching data freshness:', error);
        setFreshness(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFreshness();
    const interval = setInterval(fetchFreshness, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [connectionId]);

  if (loading || !freshness) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Clock className="h-4 w-4" />
        <span>Checking data freshness...</span>
      </div>
    );
  }

  const getStatusInfo = () => {
    const ageHours = freshness.dataAgeHours || 0;
    
    if (ageHours <= 2) {
      return {
        variant: "default" as const,
        icon: CheckCircle,
        text: "Real-time",
        description: "Data is fresh"
      };
    } else if (ageHours <= 6) {
      return {
        variant: "secondary" as const,
        icon: Clock,
        text: "Recent", 
        description: `${ageHours}h old`
      };
    } else if (ageHours <= 24) {
      return {
        variant: "outline" as const,
        icon: AlertTriangle,
        text: "Stale",
        description: `${ageHours}h old`
      };
    } else {
      return {
        variant: "destructive" as const,
        icon: AlertTriangle,
        text: "Outdated",
        description: `${Math.floor(ageHours / 24)}d old`
      };
    }
  };

  const status = getStatusInfo();
  const Icon = status.icon;
  
  const lastMessage = freshness.lastTrafficMessage || freshness.lastConversionMessage;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Badge variant={status.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.text}
      </Badge>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3 w-3" />
        <span>{freshness.messages24h || 0} msgs/24h</span>
        
        {lastMessage && (
          <>
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span>Last: {formatDistanceToNow(new Date(lastMessage), { addSuffix: true })}</span>
          </>
        )}
      </div>
    </div>
  );
}