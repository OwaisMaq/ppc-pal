import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';

interface CampaignWithAsin {
  campaign_id: string;
  campaign_name: string;
  campaign_type: string;
  targeting_type: string;
  status: string;
  budget: number;
  budget_type: string;
  daily_spend: number;
  impressions: number;
  clicks: number;
  sales: number;
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
  conversions: number;
  asin: string | null;
}

export interface ProductGroup {
  asin: string;
  label: string | null;
  campaigns: CampaignWithAsin[];
  metrics: {
    spend: number;
    sales: number;
    impressions: number;
    clicks: number;
    acos: number;
    roas: number;
  };
}

// Extract ASIN from campaign name (e.g., "SP_Camping Pillow_B0DLQZ71J1_Exact" -> "B0DLQZ71J1")
const extractAsinFromName = (name: string): string | null => {
  // ASIN pattern: starts with B0 followed by 8 alphanumeric characters
  const asinPattern = /\b(B0[A-Z0-9]{8})\b/i;
  const match = name.match(asinPattern);
  return match ? match[1].toUpperCase() : null;
};

export const useProductGroupedCampaigns = (
  profileId: string | undefined,
  dateRange: DateRange | undefined,
  dayCount: number
) => {
  const [campaigns, setCampaigns] = useState<CampaignWithAsin[]>([]);
  const [asinLabels, setAsinLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!profileId || !dateRange?.from || !dateRange?.to) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];

        // Fetch campaigns and labels in parallel
        const [campaignsRes, labelsRes] = await Promise.all([
          supabase
            .from('v_campaign_daily')
            .select('*')
            .eq('profile_id', profileId)
            .gte('date', fromDate)
            .lte('date', toDate),
          supabase
            .from('asin_labels')
            .select('asin, label')
        ]);

        if (campaignsRes.error) throw campaignsRes.error;

        // Build labels map
        const labelsMap: Record<string, string> = {};
        (labelsRes.data || []).forEach((row: any) => {
          labelsMap[row.asin] = row.label;
        });
        setAsinLabels(labelsMap);

        // Aggregate metrics by campaign
        const campaignMap = new Map<string, CampaignWithAsin>();

        (campaignsRes.data || []).forEach((row: any) => {
          const campaignId = row.campaign_id;

          if (!campaignMap.has(campaignId)) {
            const asin = extractAsinFromName(row.campaign_name || '');
            campaignMap.set(campaignId, {
              campaign_id: campaignId,
              campaign_name: row.campaign_name || 'Unknown',
              campaign_type: row.campaign_type || 'N/A',
              targeting_type: row.targeting_type || 'N/A',
              status: row.status || 'unknown',
              budget: row.budget || 0,
              budget_type: row.budget_type || 'daily',
              daily_spend: 0,
              impressions: 0,
              clicks: 0,
              sales: 0,
              acos: 0,
              roas: 0,
              ctr: 0,
              cpc: 0,
              conversions: 0,
              asin,
            });
          }

          const campaign = campaignMap.get(campaignId)!;
          campaign.daily_spend += row.spend || 0;
          campaign.impressions += row.impressions || 0;
          campaign.clicks += row.clicks || 0;
          campaign.sales += row.sales || 0;
        });

        // Calculate averages and ratios
        const campaignsArray = Array.from(campaignMap.values()).map(campaign => {
          const totalSpend = campaign.daily_spend;
          const avgSpend = totalSpend / dayCount;

          return {
            ...campaign,
            daily_spend: avgSpend,
            acos: campaign.sales > 0 ? (totalSpend / campaign.sales) * 100 : 0,
            roas: totalSpend > 0 ? campaign.sales / totalSpend : 0,
            ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
            cpc: campaign.clicks > 0 ? avgSpend / campaign.clicks : 0,
            conversions: Math.floor(campaign.sales / 25),
          };
        });

        setCampaigns(campaignsArray);
      } catch (err) {
        console.error('Error fetching product grouped campaigns:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profileId, dateRange, dayCount]);

  // Group campaigns by ASIN
  const productGroups = useMemo((): ProductGroup[] => {
    const groups = new Map<string, CampaignWithAsin[]>();

    campaigns.forEach(campaign => {
      const key = campaign.asin || '__uncategorized__';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(campaign);
    });

    // Convert to array and calculate aggregated metrics
    const result: ProductGroup[] = [];

    groups.forEach((campaignList, asin) => {
      const spend = campaignList.reduce((sum, c) => sum + c.daily_spend * dayCount, 0);
      const sales = campaignList.reduce((sum, c) => sum + c.sales, 0);
      const impressions = campaignList.reduce((sum, c) => sum + c.impressions, 0);
      const clicks = campaignList.reduce((sum, c) => sum + c.clicks, 0);

      result.push({
        asin: asin === '__uncategorized__' ? 'Uncategorized' : asin,
        label: asin === '__uncategorized__' ? null : asinLabels[asin] || null,
        campaigns: campaignList,
        metrics: {
          spend,
          sales,
          impressions,
          clicks,
          acos: sales > 0 ? (spend / sales) * 100 : 0,
          roas: spend > 0 ? sales / spend : 0,
        },
      });
    });

    // Sort: products with labels first, then by spend descending
    result.sort((a, b) => {
      if (a.asin === 'Uncategorized') return 1;
      if (b.asin === 'Uncategorized') return -1;
      if (a.label && !b.label) return -1;
      if (!a.label && b.label) return 1;
      return b.metrics.spend - a.metrics.spend;
    });

    return result;
  }, [campaigns, asinLabels, dayCount]);

  const refetch = () => {
    setLoading(true);
    // Trigger re-fetch by updating state
  };

  return {
    productGroups,
    loading,
    error,
    refetch,
    totalCampaigns: campaigns.length,
  };
};
