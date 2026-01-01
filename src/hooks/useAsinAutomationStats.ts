import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Extract ASIN from campaign name (B0 followed by 8 alphanumeric characters)
const extractAsinFromName = (name: string): string | null => {
  const match = name.match(/\b(B0[A-Z0-9]{8})\b/i);
  return match ? match[1].toUpperCase() : null;
};

interface AsinAutomationStats {
  autoOptimizedAsins: number;
  totalAsins: number;
  loading: boolean;
}

export function useAsinAutomationStats(profileId: string | undefined): AsinAutomationStats {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [optimizedCampaignIds, setOptimizedCampaignIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch campaigns and bid_states in parallel
      const [campaignsResult, bidStatesResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id, name, amazon_campaign_id')
          .eq('profile_id', profileId),
        supabase
          .from('bid_states')
          .select('campaign_id')
          .eq('profile_id', profileId)
          .not('last_optimized_at', 'is', null)
      ]);

      if (campaignsResult.data) {
        setCampaigns(campaignsResult.data.map(c => ({ id: c.amazon_campaign_id || c.id, name: c.name })));
      }

      if (bidStatesResult.data) {
        setOptimizedCampaignIds(new Set(bidStatesResult.data.map(b => b.campaign_id)));
      }

      setLoading(false);
    };

    fetchData();
  }, [profileId]);

  const stats = useMemo(() => {
    // Group campaigns by ASIN
    const asinToCampaigns = new Map<string, string[]>();
    
    campaigns.forEach(campaign => {
      const asin = extractAsinFromName(campaign.name);
      if (asin) {
        const existing = asinToCampaigns.get(asin) || [];
        existing.push(campaign.id);
        asinToCampaigns.set(asin, existing);
      }
    });

    const totalAsins = asinToCampaigns.size;
    
    // Count ASINs with at least one optimized campaign
    let autoOptimizedAsins = 0;
    asinToCampaigns.forEach((campaignIds) => {
      const hasOptimized = campaignIds.some(id => optimizedCampaignIds.has(id));
      if (hasOptimized) {
        autoOptimizedAsins++;
      }
    });

    return { autoOptimizedAsins, totalAsins };
  }, [campaigns, optimizedCampaignIds]);

  return {
    autoOptimizedAsins: stats.autoOptimizedAsins,
    totalAsins: stats.totalAsins,
    loading
  };
}
