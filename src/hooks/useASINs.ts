import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ASINInfo {
  asin: string;
  sources: string[]; // Which tables the ASIN appears in (campaigns, targets, keywords)
}

export const useASINs = () => {
  const { user } = useAuth();
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
      const asinMap = new Map<string, Set<string>>();

      campaignASINs?.forEach(item => {
        if (item.asin) {
          if (!asinMap.has(item.asin)) {
            asinMap.set(item.asin, new Set());
          }
          asinMap.get(item.asin)!.add('campaigns');
        }
      });

      targetASINs?.forEach(item => {
        if (item.asin) {
          if (!asinMap.has(item.asin)) {
            asinMap.set(item.asin, new Set());
          }
          asinMap.get(item.asin)!.add('targets');
        }
      });

      keywordASINs?.forEach(item => {
        if (item.asin) {
          if (!asinMap.has(item.asin)) {
            asinMap.set(item.asin, new Set());
          }
          asinMap.get(item.asin)!.add('keywords');
        }
      });

      const asinList: ASINInfo[] = Array.from(asinMap.entries()).map(([asin, sources]) => ({
        asin,
        sources: Array.from(sources)
      }));

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
  }, [user]);

  return {
    asins,
    loading,
    error,
    refetch: fetchASINs
  };
};