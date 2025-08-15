import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useASINLabels } from "@/hooks/useASINLabels";

export interface ASINInfo {
  asin: string;
  label?: string; // Custom user-defined label for the ASIN
}

export const useASINs = () => {
  const { user } = useAuth();
  const { labels } = useASINLabels();
  const [asins, setAsins] = useState<ASINInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchASINs = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get ASINs from campaigns
      const { data: campaignASINs, error: campaignError } = await supabase
        .from('campaigns')
        .select('asin')
        .not('asin', 'is', null);

      if (campaignError) throw campaignError;

      // Get ASINs from targets
      const { data: targetASINs, error: targetError } = await supabase
        .from('targets')
        .select('asin')
        .not('asin', 'is', null);

      if (targetError) throw targetError;

      // Get ASINs from keywords
      const { data: keywordASINs, error: keywordError } = await supabase
        .from('keywords')
        .select('asin')
        .not('asin', 'is', null);

      if (keywordError) throw keywordError;

      // Combine and deduplicate ASINs
      const asinSet = new Set<string>();

      campaignASINs?.forEach(item => {
        if (item.asin) {
          asinSet.add(item.asin);
        }
      });

      targetASINs?.forEach(item => {
        if (item.asin) {
          asinSet.add(item.asin);
        }
      });

      keywordASINs?.forEach(item => {
        if (item.asin) {
          asinSet.add(item.asin);
        }
      });

      // Create ASIN list with labels
      const asinList: ASINInfo[] = Array.from(asinSet).map(asin => {
        const labelInfo = labels.find(l => l.asin === asin);
        return {
          asin,
          label: labelInfo?.label
        };
      });

      asinList.sort((a, b) => a.asin.localeCompare(b.asin));
      setAsins(asinList);
    } catch (err) {
      console.error('Error fetching ASINs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ASINs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchASINs();
  }, [user, labels]);

  return {
    asins,
    loading,
    error,
    refetch: fetchASINs
  };
};