import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BudgetRecommendation {
  id: string;
  profile_id: string;
  campaign_id: string;
  day: string;
  current_budget_micros: number;
  spend_so_far_micros: number;
  forecast_eod_spend_micros: number;
  pace_ratio: number;
  action: 'increase' | 'decrease' | 'hold';
  suggested_budget_micros?: number;
  reason?: string;
  mode: 'dry_run' | 'auto';
  state: 'open' | 'applied' | 'dismissed' | 'expired';
  created_at: string;
  applied_at?: string;
}

export interface BudgetPacingData {
  campaign_id: string;
  campaign_name: string;
  current_budget: number;
  spend_so_far: number;
  forecast_eod_spend: number;
  pace_ratio: number;
  budget_utilization: number;
  recommendation?: BudgetRecommendation;
}

export const useBudgetCopilot = () => {
  const [recommendations, setRecommendations] = useState<BudgetRecommendation[]>([]);
  const [pacingData, setPacingData] = useState<BudgetPacingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRecommendations = useCallback(async (profileId?: string) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('budget_recommendations')
        .select('*')
        .eq('state', 'open')
        .eq('day', new Date().toISOString().slice(0, 10))
        .order('created_at', { ascending: false });

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setRecommendations((data || []) as BudgetRecommendation[]);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch budget recommendations';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchPacingData = useCallback(async (profileId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get campaigns with budgets for this profile
      const { data: connection } = await supabase
        .from('amazon_connections')
        .select('id')
        .eq('profile_id', profileId)
        .single();

      if (!connection) {
        throw new Error('Profile not found');
      }

      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, amazon_campaign_id, name, daily_budget, status')
        .eq('connection_id', connection.id)
        .eq('status', 'enabled')
        .not('daily_budget', 'is', null)
        .gt('daily_budget', 0);

      if (campaignsError) {
        throw new Error(campaignsError.message);
      }

      if (!campaigns || campaigns.length === 0) {
        setPacingData([]);
        return;
      }

      // Get today's spend data from AMS
      const today = new Date().toISOString().slice(0, 10);
      const campaignIds = campaigns.map(c => c.amazon_campaign_id);

      const { data: spendData } = await supabase
        .from('ams_messages_sp_traffic')
        .select('campaign_id, cost')
        .eq('profile_id', profileId)
        .in('campaign_id', campaignIds)
        .gte('hour_start', today + 'T00:00:00.000Z')
        .lt('hour_start', today + 'T23:59:59.999Z');

      // Get recommendations for these campaigns
      const { data: recs } = await supabase
        .from('budget_recommendations')
        .select('*')
        .eq('profile_id', profileId)
        .in('campaign_id', campaignIds)
        .eq('day', today)
        .eq('state', 'open');

      // Build pacing data
      const pacingResults: BudgetPacingData[] = campaigns.map(campaign => {
        const campaignSpend = spendData
          ?.filter(s => s.campaign_id === campaign.amazon_campaign_id)
          ?.reduce((sum, s) => sum + (s.cost || 0), 0) || 0;

        const recommendation = recs?.find(r => r.campaign_id === campaign.amazon_campaign_id);

        const forecastEodSpend = recommendation 
          ? recommendation.forecast_eod_spend_micros / 1000000
          : campaignSpend; // Fallback to current spend if no forecast

        const paceRatio = recommendation?.pace_ratio || 0;
        const budgetUtilization = campaign.daily_budget > 0 
          ? (campaignSpend / campaign.daily_budget) * 100 
          : 0;

        return {
          campaign_id: campaign.amazon_campaign_id,
          campaign_name: campaign.name,
          current_budget: campaign.daily_budget,
          spend_so_far: campaignSpend,
          forecast_eod_spend: forecastEodSpend,
          pace_ratio: paceRatio,
          budget_utilization: budgetUtilization,
          recommendation: recommendation as BudgetRecommendation | undefined,
        };
      });

      setPacingData(pacingResults);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch pacing data';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const applyRecommendation = useCallback(async (recommendationId: string) => {
    try {
      // Get the recommendation details
      const { data: recommendation, error: fetchError } = await supabase
        .from('budget_recommendations')
        .select('*')
        .eq('id', recommendationId)
        .single();

      if (fetchError || !recommendation) {
        throw new Error('Recommendation not found');
      }

      // Create action queue entry
      const action = {
        action_type: 'set_campaign_budget',
        profile_id: recommendation.profile_id,
        rule_id: null,
        payload: {
          campaign_id: recommendation.campaign_id,
          budget_micros: recommendation.suggested_budget_micros,
          reason: 'budget_copilot_manual',
        },
        idempotency_key: `budget_manual_${recommendationId}_${Date.now()}`,
        status: 'queued',
      };

      const { error: queueError } = await supabase
        .from('action_queue')
        .insert(action);

      if (queueError) {
        throw new Error(queueError.message);
      }

      // Update recommendation state
      const { error: updateError } = await supabase
        .from('budget_recommendations')
        .update({ 
          state: 'applied',
          applied_at: new Date().toISOString(),
        })
        .eq('id', recommendationId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update local state
      setRecommendations(prev => prev.map(rec => 
        rec.id === recommendationId 
          ? { ...rec, state: 'applied', applied_at: new Date().toISOString() }
          : rec
      ));

      toast({
        title: "Success",
        description: "Budget recommendation applied successfully",
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to apply recommendation';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const dismissRecommendation = useCallback(async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from('budget_recommendations')
        .update({ state: 'dismissed' })
        .eq('id', recommendationId);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));

      toast({
        title: "Success",
        description: "Recommendation dismissed",
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to dismiss recommendation';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const runBudgetAnalysis = useCallback(async (profileId?: string) => {
    try {
      const params = new URLSearchParams();
      if (profileId) params.append('profileId', profileId);

      const { data, error: runError } = await supabase.functions.invoke('budget-copilot-runner', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (runError) {
        throw new Error(runError.message);
      }

      toast({
        title: "Success",
        description: `Budget analysis completed. Created ${data.recommendationsCreated} recommendations.`,
      });

      // Refresh data
      await fetchRecommendations(profileId);
      if (profileId) {
        await fetchPacingData(profileId);
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to run budget analysis';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast, fetchRecommendations, fetchPacingData]);

  const getBudgetMetrics = useCallback((pacingData: BudgetPacingData[]) => {
    const totalCampaigns = pacingData.length;
    const overPaced = pacingData.filter(p => p.pace_ratio > 1.25).length;
    const underPaced = pacingData.filter(p => p.pace_ratio < 0.75).length;
    const onTrack = totalCampaigns - overPaced - underPaced;
    const totalBudget = pacingData.reduce((sum, p) => sum + p.current_budget, 0);
    const totalSpend = pacingData.reduce((sum, p) => sum + p.spend_so_far, 0);
    const totalForecast = pacingData.reduce((sum, p) => sum + p.forecast_eod_spend, 0);

    return {
      totalCampaigns,
      overPaced,
      underPaced,
      onTrack,
      totalBudget,
      totalSpend,
      totalForecast,
      utilizationRate: totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0,
    };
  }, []);

  return {
    recommendations,
    pacingData,
    loading,
    error,
    fetchRecommendations,
    fetchPacingData,
    applyRecommendation,
    dismissRecommendation,
    runBudgetAnalysis,
    getBudgetMetrics,
  };
};