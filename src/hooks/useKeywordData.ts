
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface KeywordData {
  id: string;
  keyword_text: string;
  match_type: string;
  amazon_keyword_id: string;
  bid?: number;
  status: 'enabled' | 'paused' | 'archived';
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  ctr?: number;
  cpc?: number;
  conversion_rate?: number;
  adgroup_id: string;
  campaign_name?: string;
}

export const useKeywordData = (connectionId?: string) => {
  const { user } = useAuth();
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Since Amazon functionality has been removed, return empty data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(false);
    setKeywords([]);
    setError(null);
  }, [user, connectionId]);

  const refreshKeywords = () => {
    // No-op since Amazon functionality has been removed
  };

  return {
    keywords,
    loading,
    error,
    refreshKeywords
  };
};
