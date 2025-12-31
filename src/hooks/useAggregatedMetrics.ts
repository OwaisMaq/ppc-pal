import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AmsMetrics, TimeseriesDataPoint } from "./useAmsMetrics";

interface AmazonConnection {
  id: string;
  profile_id: string;
  marketplace_id?: string;
  profile_name?: string;
}

export const useAggregatedMetrics = (
  connections: AmazonConnection[],
  selectedMarketplace: string | null,
  from?: Date,
  to?: Date
) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AmsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter connections based on selected marketplace
  const filteredConnections = useMemo(() => {
    if (!selectedMarketplace || selectedMarketplace === 'all') {
      return connections;
    }
    return connections.filter(c => c.marketplace_id === selectedMarketplace);
  }, [connections, selectedMarketplace]);

  const fetchAggregatedMetrics = async () => {
    if (!user || filteredConnections.length === 0) {
      setMetrics(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const startDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = to || new Date();

      // Get all profile IDs to query
      const profileIds = filteredConnections.map(c => c.profile_id);

      // Aggregate traffic data across all profiles
      let allTrafficData: any[] = [];
      let allConversionData: any[] = [];
      let allCampaigns: any[] = [];

      for (const profileId of profileIds) {
        const { data: trafficData } = await supabase
          .from("ams_messages_sp_traffic")
          .select("impressions, clicks, cost, hour_start")
          .eq("profile_id", profileId)
          .gte("hour_start", startDate.toISOString())
          .lte("hour_start", endDate.toISOString());

        const { data: conversionData } = await supabase
          .from("ams_messages_sp_conversion")
          .select("attributed_conversions, attributed_sales, hour_start")
          .eq("profile_id", profileId)
          .gte("hour_start", startDate.toISOString())
          .lte("hour_start", endDate.toISOString());

        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("*")
          .eq("profile_id", profileId);

        if (trafficData) allTrafficData = [...allTrafficData, ...trafficData];
        if (conversionData) allConversionData = [...allConversionData, ...conversionData];
        if (campaigns) allCampaigns = [...allCampaigns, ...campaigns];
      }

      // Calculate aggregated metrics
      let totalImpressions = allTrafficData.reduce((sum, row) => sum + (row.impressions || 0), 0);
      let totalClicks = allTrafficData.reduce((sum, row) => sum + (row.clicks || 0), 0);
      let totalSpend = allTrafficData.reduce((sum, row) => sum + Number(row.cost || 0), 0);
      let totalOrders = allConversionData.reduce((sum, row) => sum + (row.attributed_conversions || 0), 0);
      let totalSales = allConversionData.reduce((sum, row) => sum + Number(row.attributed_sales || 0), 0);

      // Fallback to campaign aggregates if AMS stream tables are empty
      if (allTrafficData.length === 0 && allConversionData.length === 0 && allCampaigns.length > 0) {
        totalImpressions = allCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
        totalClicks = allCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
        totalSpend = allCampaigns.reduce((sum, c) => sum + Number(c.cost_14d ?? c.cost_legacy ?? 0), 0);
        totalOrders = allCampaigns.reduce((sum, c) => sum + (c.attributed_conversions_14d ?? c.attributed_conversions_legacy ?? 0), 0);
        totalSales = allCampaigns.reduce((sum, c) => sum + Number(c.attributed_sales_14d ?? c.attributed_sales_legacy ?? 0), 0);
      }

      const acos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
      const roas = totalSpend > 0 ? totalSales / totalSpend : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

      // Aggregate time-series data by date
      const timeseriesMap = new Map<string, TimeseriesDataPoint>();
      
      allTrafficData.forEach(row => {
        const date = new Date(row.hour_start).toISOString().split('T')[0];
        const existing = timeseriesMap.get(date) || {
          date,
          spend: 0,
          sales: 0,
          clicks: 0,
          impressions: 0,
          orders: 0
        };
        existing.spend += Number(row.cost || 0);
        existing.clicks += row.clicks || 0;
        existing.impressions += row.impressions || 0;
        timeseriesMap.set(date, existing);
      });
      
      allConversionData.forEach(row => {
        const date = new Date(row.hour_start).toISOString().split('T')[0];
        const existing = timeseriesMap.get(date) || {
          date,
          spend: 0,
          sales: 0,
          clicks: 0,
          impressions: 0,
          orders: 0
        };
        existing.sales += Number(row.attributed_sales || 0);
        existing.orders += row.attributed_conversions || 0;
        timeseriesMap.set(date, existing);
      });
      
      const timeseries = Array.from(timeseriesMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));

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
        campaignCount: allCampaigns.length,
        lastMessageAt: null,
        messageCount24h: 0,
        timeseries,
      });

    } catch (err: any) {
      console.error("Error fetching aggregated metrics:", err);
      setError(err.message || "Failed to fetch aggregated metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAggregatedMetrics();
  }, [user, filteredConnections.length, selectedMarketplace, from?.getTime(), to?.getTime()]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchAggregatedMetrics,
    connectionCount: filteredConnections.length,
  };
};
