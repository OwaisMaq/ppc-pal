import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAmazonConnections } from './useAmazonConnections';
import { toast } from 'sonner';

export interface SearchTerm {
  search_term: string;
  clicks: number;
  spend: number;
  sales: number;
  acos: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cvr: number;
  is_brand: boolean;
  is_ignored: boolean;
  ai_action?: 'add_negative' | 'increase_bid' | 'decrease_bid' | 'monitor' | null;
  ai_reason?: string;
}

export const useSearchTerms = (dateRange?: { from: Date; to: Date }) => {
  const { connections } = useAmazonConnections();
  const primaryConnection = connections[0];

  return useQuery({
    queryKey: ['search-terms', primaryConnection?.profile_id],
    queryFn: async () => {
      if (!primaryConnection) {
        throw new Error('No Amazon connection found');
      }

      const { data, error } = await supabase
        .from('v_studio_search_terms')
        .select('*')
        .eq('profile_id', primaryConnection.profile_id);

      if (error) {
        console.error('Error fetching search terms:', error);
        toast.error('Failed to load search terms. Please sync your Amazon data first.');
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Map to SearchTerm interface
      const terms: SearchTerm[] = data.map((row: any) => {
        const clicks = row.clicks_14d || 0;
        const impressions = row.impressions_14d || 0;
        const spend = row.spend_14d || 0;
        const sales = row.sales_14d || 0;
        const conversions = row.conv_14d || 0;
        
        const acos = row.acos_14d || 0;
        const ctr = row.ctr_14d || 0;
        const cvr = row.cvr_14d || 0;
        
        // AI Action Logic
        let ai_action: SearchTerm['ai_action'] = null;
        let ai_reason = '';

        if (row.is_ignored) {
          ai_action = null;
          ai_reason = '';
        } else if (spend > 50 && sales === 0 && clicks > 10) {
          ai_action = 'add_negative';
          ai_reason = 'High spend with no sales - likely waste';
        } else if (spend > 30 && acos > 50) {
          ai_action = 'add_negative';
          ai_reason = `High ACoS (${acos.toFixed(0)}%) - unprofitable`;
        } else if (sales > 100 && acos < 15 && clicks > 20) {
          ai_action = 'increase_bid';
          ai_reason = `Strong performer (ACoS: ${acos.toFixed(0)}%) - opportunity to scale`;
        } else if (acos > 30 && acos < 50 && spend > 20) {
          ai_action = 'decrease_bid';
          ai_reason = `Moderate ACoS (${acos.toFixed(0)}%) - reduce spend`;
        } else if (clicks < 5 && impressions > 500) {
          ai_action = 'monitor';
          ai_reason = 'Low CTR - may need better relevance';
        }

        return {
          search_term: row.search_term || 'Unknown',
          clicks,
          spend,
          sales,
          acos,
          impressions,
          conversions,
          ctr,
          cvr,
          is_brand: row.is_brand || false,
          is_ignored: row.is_ignored || false,
          ai_action,
          ai_reason,
        };
      });

      // Sort by spend descending
      return terms.sort((a, b) => b.spend - a.spend);
    },
    enabled: !!primaryConnection,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
