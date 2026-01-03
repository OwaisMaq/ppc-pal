import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useASINLabels } from "@/hooks/useASINLabels";

export interface ASINInfo {
  asin: string;
  label?: string; // Custom user-defined label for the ASIN
}

// Regex to match Amazon ASINs (B0 followed by 8-10 alphanumeric characters)
const ASIN_REGEX = /\b(B0[A-Z0-9]{8,10})\b/gi;

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
      const asinSet = new Set<string>();

      // 1. Get ASINs from campaigns.asin column (if populated)
      const { data: campaignASINs, error: campaignError } = await supabase
        .from('campaigns')
        .select('asin')
        .not('asin', 'is', null);

      if (campaignError) throw campaignError;
      campaignASINs?.forEach(item => {
        if (item.asin) asinSet.add(item.asin.toUpperCase());
      });

      // 2. Extract ASINs from campaign names (e.g., SP_Product_B0DLQZ71J1_Exact)
      const { data: campaignNames, error: campaignNamesError } = await supabase
        .from('campaigns')
        .select('name');

      if (campaignNamesError) throw campaignNamesError;
      campaignNames?.forEach(item => {
        if (item.name) {
          const matches = item.name.match(ASIN_REGEX);
          matches?.forEach(asin => asinSet.add(asin.toUpperCase()));
        }
      });

      // 3. Get ASINs from targets.asin column (if populated)
      const { data: targetASINs, error: targetError } = await supabase
        .from('targets')
        .select('asin')
        .not('asin', 'is', null);

      if (targetError) throw targetError;
      targetASINs?.forEach(item => {
        if (item.asin) asinSet.add(item.asin.toUpperCase());
      });

      // 4. Get ASINs from keywords.asin column (if populated)
      const { data: keywordASINs, error: keywordError } = await supabase
        .from('keywords')
        .select('asin')
        .not('asin', 'is', null);

      if (keywordError) throw keywordError;
      keywordASINs?.forEach(item => {
        if (item.asin) asinSet.add(item.asin.toUpperCase());
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
