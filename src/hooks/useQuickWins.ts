import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface QuickWin {
  type: 'wasted_spend' | 'high_acos_keywords' | 'missing_negatives' | 'budget_opportunity';
  count: number;
  potentialSavings: number;
  description: string;
}

interface QuickWinsData {
  wins: QuickWin[];
  totalPotentialSavings: number;
  loading: boolean;
}

export const useQuickWins = (profileId?: string): QuickWinsData => {
  const { user } = useAuth();
  const [data, setData] = useState<QuickWinsData>({
    wins: [],
    totalPotentialSavings: 0,
    loading: true
  });

  useEffect(() => {
    if (!user || !profileId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchQuickWins = async () => {
      try {
        const wins: QuickWin[] = [];
        let totalSavings = 0;

        // 1. Check for high ACoS keywords (ACoS > 50%)
        const { data: highAcosKeywords, count: highAcosCount } = await supabase
          .from('keywords')
          .select('*', { count: 'exact', head: false })
          .eq('profile_id', profileId)
          .gt('acos', 50)
          .gt('spend', 10)
          .limit(100);

        if (highAcosCount && highAcosCount > 0) {
          const estimatedWaste = highAcosKeywords?.reduce((sum, k) => sum + ((k.spend || 0) * 0.3), 0) || 0;
          wins.push({
            type: 'high_acos_keywords',
            count: highAcosCount,
            potentialSavings: Math.round(estimatedWaste),
            description: `${highAcosCount} keywords with ACoS over 50%`
          });
          totalSavings += estimatedWaste;
        }

        // 2. Check for targets that could use optimization (high spend, low ROAS)
        const { count: lowRoasCount } = await supabase
          .from('targets')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', profileId)
          .gt('spend', 10)
          .lt('roas', 1);

        if (lowRoasCount && lowRoasCount > 0) {
          // Estimate ~$10 avg waste per target
          const estimatedWaste = lowRoasCount * 10;
          wins.push({
            type: 'missing_negatives',
            count: lowRoasCount,
            potentialSavings: Math.round(estimatedWaste),
            description: `${lowRoasCount} targets with ROAS below 1x`
          });
          totalSavings += estimatedWaste;
        }

        // 3. Check campaigns with budget utilization issues
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, name, daily_budget, status')
          .eq('profile_id', profileId)
          .eq('status', 'enabled');

        if (campaigns && campaigns.length > 0) {
          // Look for campaigns that might be under-budgeted (high-performing but capped)
          const underBudgeted = campaigns.filter(c => c.daily_budget && c.daily_budget < 50);
          if (underBudgeted.length > 0) {
            wins.push({
              type: 'budget_opportunity',
              count: underBudgeted.length,
              potentialSavings: 0, // This is opportunity, not savings
              description: `${underBudgeted.length} campaigns may be under-budgeted`
            });
          }
        }

        setData({
          wins,
          totalPotentialSavings: Math.round(totalSavings),
          loading: false
        });
      } catch (error) {
        console.error('Error fetching quick wins:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchQuickWins();
  }, [user, profileId]);

  return data;
};
