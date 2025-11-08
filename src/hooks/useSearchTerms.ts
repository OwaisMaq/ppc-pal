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
  campaign_name?: string;
  ai_action?: 'add_negative' | 'increase_bid' | 'decrease_bid' | 'monitor' | null;
  ai_reason?: string;
}

export const useSearchTerms = (dateRange?: { from: Date; to: Date }) => {
  const { connections } = useAmazonConnections();
  const primaryConnection = connections[0];

  return useQuery({
    queryKey: ['search-terms', primaryConnection?.profile_id, dateRange],
    queryFn: async () => {
      if (!primaryConnection) {
        throw new Error('No Amazon connection found');
      }

      const thirtyDaysAgo = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const today = dateRange?.to || new Date();

      const { data, error } = await supabase
        .from('v_studio_search_terms')
        .select('*')
        .eq('profile_id', primaryConnection.profile_id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching search terms:', error);
        toast.error('Failed to load search terms');
        throw error;
      }

      // Aggregate by search term
      const termMap = new Map<string, SearchTerm>();
      
      data?.forEach((row: any) => {
        const term = row.search_term || 'Unknown';
        
        if (!termMap.has(term)) {
          termMap.set(term, {
            search_term: term,
            clicks: 0,
            spend: 0,
            sales: 0,
            acos: 0,
            impressions: 0,
            conversions: 0,
            ctr: 0,
            cvr: 0,
            campaign_name: row.campaign_name,
          });
        }
        
        const termData = termMap.get(term)!;
        termData.clicks += row.clicks || 0;
        termData.spend += row.spend || 0;
        termData.sales += row.sales || 0;
        termData.impressions += row.impressions || 0;
        termData.conversions += row.conversions || 0;
      });

      // Calculate metrics and AI recommendations
      const terms = Array.from(termMap.values()).map(term => {
        const acos = term.sales > 0 ? (term.spend / term.sales) * 100 : 0;
        const ctr = term.impressions > 0 ? (term.clicks / term.impressions) * 100 : 0;
        const cvr = term.clicks > 0 ? (term.conversions / term.clicks) * 100 : 0;
        
        // AI Action Logic
        let ai_action: SearchTerm['ai_action'] = null;
        let ai_reason = '';

        if (term.spend > 50 && term.sales === 0 && term.clicks > 10) {
          ai_action = 'add_negative';
          ai_reason = 'High spend with no sales - likely waste';
        } else if (term.spend > 30 && acos > 50) {
          ai_action = 'add_negative';
          ai_reason = `High ACoS (${acos.toFixed(0)}%) - unprofitable`;
        } else if (term.sales > 100 && acos < 15 && term.clicks > 20) {
          ai_action = 'increase_bid';
          ai_reason = `Strong performer (ACoS: ${acos.toFixed(0)}%) - opportunity to scale`;
        } else if (acos > 30 && acos < 50 && term.spend > 20) {
          ai_action = 'decrease_bid';
          ai_reason = `Moderate ACoS (${acos.toFixed(0)}%) - reduce spend`;
        } else if (term.clicks < 5 && term.impressions > 500) {
          ai_action = 'monitor';
          ai_reason = 'Low CTR - may need better relevance';
        }

        return {
          ...term,
          acos,
          ctr,
          cvr,
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
