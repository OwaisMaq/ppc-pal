import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AmsMetrics {
  totalSpend: number;
  totalSales: number;
  totalClicks: number;
  totalImpressions: number;
  totalOrders: number;
  acos: number;
  roas: number;
  ctr: number;
  conversionRate: number;
  cpc: number;
  campaignCount: number;
  lastMessageAt: string | null;
  messageCount24h: number;
}

export interface AmsEntityData {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  sales: number;
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  entityType: 'campaign' | 'adGroup' | 'keyword' | 'target';
  entityId?: string;
}

export const useAmsMetrics = (connectionId?: string, from?: Date, to?: Date) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AmsMetrics | null>(null);
  const [entityData, setEntityData] = useState<AmsEntityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAmsMetrics = async () => {
    if (!user || !connectionId) {
      setMetrics(null);
      setEntityData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const startDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = to || new Date();

      // Get aggregated traffic data
      const { data: trafficData, error: trafficError } = await supabase
        .from("ams_messages_sp_traffic")
        .select("impressions, clicks, spend, hour_start")
        .eq("connection_id", connectionId)
        .gte("hour_start", startDate.toISOString())
        .lte("hour_start", endDate.toISOString())
        .order("hour_start", { ascending: false });

      if (trafficError) throw trafficError;

      // Get aggregated conversion data
      const { data: conversionData, error: conversionError } = await supabase
        .from("ams_messages_sp_conversion")
        .select("orders, sales, hour_start")
        .eq("connection_id", connectionId)
        .gte("hour_start", startDate.toISOString())
        .lte("hour_start", endDate.toISOString())
        .order("hour_start", { ascending: false });

      if (conversionError) throw conversionError;

      // Calculate aggregated metrics
      const totalImpressions = (trafficData || []).reduce((sum, row) => sum + (row.impressions || 0), 0);
      const totalClicks = (trafficData || []).reduce((sum, row) => sum + (row.clicks || 0), 0);
      const totalSpend = (trafficData || []).reduce((sum, row) => sum + Number(row.spend || 0), 0);
      const totalOrders = (conversionData || []).reduce((sum, row) => sum + (row.orders || 0), 0);
      const totalSales = (conversionData || []).reduce((sum, row) => sum + Number(row.sales || 0), 0);

      const acos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
      const roas = totalSpend > 0 ? totalSales / totalSpend : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

      // Fetch entity-level data (campaigns from aggregated tables)
      const { data: campaigns, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("connection_id", connectionId)
        .order("spend", { ascending: false })
        .limit(100);

      if (campaignError) throw campaignError;

      // Get message stats for freshness indicators
      const { data: recentMessages } = await supabase
        .from("ams_messages_sp_traffic")
        .select("received_at")
        .eq("connection_id", connectionId)
        .gte("received_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("received_at", { ascending: false })
        .limit(1);

      const { count: messageCount24h } = await supabase
        .from("ams_messages_sp_traffic")
        .select("*", { count: "exact", head: true })
        .eq("connection_id", connectionId)
        .gte("received_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setMetrics({
        totalSpend,
        totalSales,
        totalClicks,
        totalImpressions,
        totalOrders,
        acos,
        roas,
        ctr,
        conversionRate,
        cpc,
        campaignCount: campaigns ? campaigns.length : 0,
        lastMessageAt: recentMessages?.[0]?.received_at || null,
        messageCount24h: messageCount24h || 0,
      });

      const campaignData: AmsEntityData[] = (campaigns || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        spend: Number(campaign.spend || 0),
        orders: campaign.orders || 0,
        sales: Number(campaign.sales || 0),
        acos: campaign.acos || 0,
        roas: campaign.roas || 0,
        ctr: campaign.impressions > 0 ? ((campaign.clicks || 0) / campaign.impressions) * 100 : 0,
        cpc: campaign.clicks > 0 ? Number(campaign.spend || 0) / campaign.clicks : 0,
        conversionRate: campaign.clicks > 0 ? ((campaign.orders || 0) / campaign.clicks) * 100 : 0,
        entityType: 'campaign' as const,
        entityId: campaign.id,
      }));

      setEntityData(campaignData);

    } catch (err: any) {
      console.error("Error fetching AMS metrics:", err);
      setError(err.message || "Failed to fetch AMS metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmsMetrics();
  }, [user, connectionId, from, to]);

  return {
    metrics,
    entityData,
    loading,
    error,
    refetch: fetchAmsMetrics,
  };
};