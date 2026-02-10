import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGlobalFilters } from '@/context/GlobalFiltersContext';

interface SavingsBreakdown {
  negativeKeywords: number;
  pausedTargets: number;
  bidOptimisation: number;
  acosImprovement: number;
  total: number;
}

interface OutcomeBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  winRate: number;
}

interface MonthOverMonth {
  thisMonthSpend: number;
  lastMonthSpend: number;
  spendDelta: number;
  thisMonthSales: number;
  lastMonthSales: number;
  salesDelta: number;
  thisMonthAcos: number;
  lastMonthAcos: number;
}

export interface ReportCardData {
  savings: SavingsBreakdown;
  outcomes: OutcomeBreakdown;
  actionsApplied: number;
  alertsRaised: number;
  mom: MonthOverMonth;
  monthLabel: string;
}

export const useReportCard = () => {
  const [data, setData] = useState<ReportCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { selectedProfileId } = useGlobalFilters();

  useEffect(() => {
    const fetchReportCard = async () => {
      if (!user || !selectedProfileId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        // Fetch data
        const actionsRes = await supabase
          .from('action_queue')
          .select('*')
          .eq('status', 'applied')
          .eq('profile_id', selectedProfileId)
          .gte('applied_at', monthStart.toISOString())
          .lte('applied_at', now.toISOString());

        const outcomesRes = await supabase
          .from('action_outcomes')
          .select('outcome_status')
          .eq('profile_id', selectedProfileId)
          .gte('created_at', monthStart.toISOString());

        const alertsRes = await supabase
          .from('alerts')
          .select('id')
          .eq('profile_id', selectedProfileId)
          .gte('created_at', monthStart.toISOString());

        // Get campaign IDs for this profile to query performance history
        const campaignsRes = await supabase
          .from('campaigns')
          .select('id')
          .eq('profile_id', selectedProfileId);

        const campaignIds = (campaignsRes.data || []).map(c => c.id);

        let thisMonthPerf: { spend: number | null; sales: number | null }[] = [];
        let lastMonthPerf: { spend: number | null; sales: number | null }[] = [];

        if (campaignIds.length > 0) {
          const thisMonthPerfRes = await supabase
            .from('campaign_performance_history')
            .select('spend, sales')
            .in('campaign_id', campaignIds)
            .gte('date', monthStart.toISOString().split('T')[0])
            .lte('date', now.toISOString().split('T')[0]);

          const lastMonthPerfRes = await supabase
            .from('campaign_performance_history')
            .select('spend, sales')
            .in('campaign_id', campaignIds)
            .gte('date', lastMonthStart.toISOString().split('T')[0])
            .lte('date', lastMonthEnd.toISOString().split('T')[0]);

          thisMonthPerf = thisMonthPerfRes.data || [];
          lastMonthPerf = lastMonthPerfRes.data || [];
        }

        const actions = actionsRes.data || [];
        const outcomes = outcomesRes.data || [];
        const alerts = alertsRes.data || [];

        // Calculate savings
        let negativeKeywords = 0, pausedTargets = 0, bidOptimisation = 0, acosImprovement = 0;

        actions.forEach((action) => {
          const payload = action.payload as any;
          switch (action.action_type) {
            case 'negative_keyword':
            case 'negative_product': {
              const avgCpc = payload?.estimated_cpc || 1.50;
              const preventedClicks = (payload?.historical_clicks || 10) * 30;
              negativeKeywords += preventedClicks * avgCpc;
              break;
            }
            case 'pause_target':
            case 'pause_campaign': {
              const dailySpend = payload?.daily_spend || payload?.avg_daily_spend || 10;
              const daysSincePause = Math.ceil(
                (now.getTime() - new Date(action.applied_at || action.created_at).getTime()) /
                (1000 * 60 * 60 * 24)
              );
              pausedTargets += dailySpend * daysSincePause * 0.8;
              break;
            }
            case 'set_bid': {
              const oldBid = payload?.old_bid || payload?.current_bid || 0;
              const newBid = payload?.new_bid || 0;
              if (oldBid > newBid) {
                bidOptimisation += (oldBid - newBid) * (payload?.estimated_clicks || 100);
              }
              break;
            }
            case 'acos_optimization': {
              const oldAcos = payload?.old_acos || 0;
              const newAcos = payload?.new_acos || 0;
              const sales = payload?.attributed_sales || 0;
              if (oldAcos > newAcos) {
                acosImprovement += ((oldAcos - newAcos) / 100) * sales;
              }
              break;
            }
          }
        });

        const totalSavings = negativeKeywords + pausedTargets + bidOptimisation + acosImprovement;

        // Outcomes
        const positive = outcomes.filter(o => o.outcome_status === 'positive').length;
        const negative = outcomes.filter(o => o.outcome_status === 'negative').length;
        const neutral = outcomes.length - positive - negative;
        const winRate = outcomes.length > 0 ? (positive / outcomes.length) * 100 : 0;

        // Month-over-month
        const thisMonthSpend = thisMonthPerf.reduce((s, r) => s + (r.spend || 0), 0);
        const thisMonthSales = thisMonthPerf.reduce((s, r) => s + (r.sales || 0), 0);
        const lastMonthSpend = lastMonthPerf.reduce((s, r) => s + (r.spend || 0), 0);
        const lastMonthSales = lastMonthPerf.reduce((s, r) => s + (r.sales || 0), 0);

        const spendDelta = lastMonthSpend > 0 ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;
        const salesDelta = lastMonthSales > 0 ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0;
        const thisMonthAcos = thisMonthSales > 0 ? (thisMonthSpend / thisMonthSales) * 100 : 0;
        const lastMonthAcos = lastMonthSales > 0 ? (lastMonthSpend / lastMonthSales) * 100 : 0;

        setData({
          savings: { negativeKeywords, pausedTargets, bidOptimisation, acosImprovement, total: totalSavings },
          outcomes: { positive, neutral, negative, total: outcomes.length, winRate },
          actionsApplied: actions.length,
          alertsRaised: alerts.length,
          mom: { thisMonthSpend, lastMonthSpend, spendDelta, thisMonthSales, lastMonthSales, salesDelta, thisMonthAcos, lastMonthAcos },
          monthLabel,
        });
      } catch (error) {
        console.error('Error fetching report card:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReportCard();
  }, [user, selectedProfileId]);

  return { data, loading };
};
