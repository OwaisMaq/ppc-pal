import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SavingsCalculation {
  totalSavings: number;
  negativeKeywordsSavings: number;
  pausedTargetsSavings: number;
  bidOptimizationSavings: number;
  acosImprovementSavings: number;
  actionCount: number;
}

export const useSavingsMetric = (profileId?: string, from?: Date, to?: Date) => {
  const [savings, setSavings] = useState<SavingsCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const calculateSavings = async () => {
      if (!user || !profileId || !from || !to) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch applied actions in the date range
        const { data: actions, error } = await supabase
          .from('action_queue')
          .select('*')
          .eq('status', 'applied')
          .gte('applied_at', from.toISOString())
          .lte('applied_at', to.toISOString());

        if (error) throw error;

        let negativeKeywordsSavings = 0;
        let pausedTargetsSavings = 0;
        let bidOptimizationSavings = 0;
        let acosImprovementSavings = 0;

        // Calculate savings for each action type
        actions?.forEach((action) => {
          const payload = action.payload as any;

          switch (action.action_type) {
            case 'negative_keyword':
            case 'negative_product':
              // Estimate: avg 10 clicks prevented per day × 30 days × avg CPC of $1.50
              const avgCpc = payload?.estimated_cpc || 1.50;
              const preventedClicks = (payload?.historical_clicks || 10) * 30;
              negativeKeywordsSavings += preventedClicks * avgCpc;
              break;

            case 'pause_target':
            case 'pause_campaign':
              // Daily spend × days since pause × 80% waste factor
              const dailySpend = payload?.daily_spend || payload?.avg_daily_spend || 10;
              const daysSincePause = Math.ceil(
                (to.getTime() - new Date(action.applied_at || action.created_at).getTime()) / 
                (1000 * 60 * 60 * 24)
              );
              pausedTargetsSavings += dailySpend * daysSincePause * 0.8;
              break;

            case 'set_bid':
              // (Old bid - New bid) × estimated clicks in period
              const oldBid = payload?.old_bid || payload?.current_bid || 0;
              const newBid = payload?.new_bid || 0;
              const bidReduction = oldBid - newBid;
              
              if (bidReduction > 0) {
                // Only count bid reductions as savings
                const estimatedClicks = payload?.estimated_clicks || 100;
                bidOptimizationSavings += bidReduction * estimatedClicks;
              }
              break;

            case 'acos_optimization':
              // (Old ACOS - New ACOS) × Sales
              const oldAcos = payload?.old_acos || 0;
              const newAcos = payload?.new_acos || 0;
              const sales = payload?.attributed_sales || 0;
              
              if (oldAcos > newAcos) {
                acosImprovementSavings += ((oldAcos - newAcos) / 100) * sales;
              }
              break;
          }
        });

        const totalSavings = 
          negativeKeywordsSavings + 
          pausedTargetsSavings + 
          bidOptimizationSavings + 
          acosImprovementSavings;

        setSavings({
          totalSavings,
          negativeKeywordsSavings,
          pausedTargetsSavings,
          bidOptimizationSavings,
          acosImprovementSavings,
          actionCount: actions?.length || 0,
        });
      } catch (error) {
        console.error('Error calculating savings:', error);
        setSavings(null);
      } finally {
        setLoading(false);
      }
    };

    calculateSavings();
  }, [user, profileId, from, to]);

  return { savings, loading };
};
