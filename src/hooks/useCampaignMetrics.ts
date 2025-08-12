import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignMetrics {
  totalSpend: number;
  totalSales: number;
  totalClicks: number;
  totalImpressions: number;
  totalOrders: number;
  acos: number;
  roas: number;
  ctr: number;
  conversionRate: number;
  campaignCount: number;
}

export interface CampaignData {
  id: string;
  name: string;
  status: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
  orders: number;
  acos: number;
  roas: number;
  campaign_type: string;
  created_at: string;
  daily_budget?: number | null;
}

export const useCampaignMetrics = (connectionId?: string) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaignData = async () => {
    if (!user || !connectionId) {
      setCampaigns([]);
      setMetrics(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select(`
          id, connection_id, name, status, campaign_type, created_at,
          daily_budget, impressions, clicks, spend, sales, orders, acos, roas,
          clicks_14d, spend_14d, sales_14d
        `)
        .eq("connection_id", connectionId)
        .order("spend", { ascending: false })
        .limit(500);

      if (campaignError) {
        throw campaignError;
      }

      const campaigns = campaignData || [];
      setCampaigns(campaigns);

      // Calculate aggregated metrics
      const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      const totalSales = campaigns.reduce((sum, c) => sum + (c.sales || 0), 0);
      const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
      const totalOrders = campaigns.reduce((sum, c) => sum + (c.orders || 0), 0);

      const acos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
      const roas = totalSpend > 0 ? totalSales / totalSpend : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

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
        campaignCount: campaigns.length,
      });

    } catch (err) {
      console.error("Error fetching campaign data:", err);
      setError(err.message || "Failed to fetch campaign data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();
  }, [user, connectionId]);

  return {
    metrics,
    campaigns,
    loading,
    error,
    refetch: fetchCampaignData,
  };
};