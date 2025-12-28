import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MarginalCurve {
  campaignId: string;
  campaignName: string;
  currentSpendMicros: number;
  marginalRoas: number;
  optimalSpendMicros: number | null;
  currentRoas: number | null;
  potentialGain: number;
}

export interface PortfolioHealthData {
  efficiencyScore: number; // 0-100
  totalSpend: number;
  optimalSpend: number;
  reallocationOpportunities: MarginalCurve[];
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export function usePortfolioHealth(profileId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['portfolio-health', profileId],
    queryFn: async (): Promise<PortfolioHealthData> => {
      if (!profileId) {
        return getEmptyData();
      }

      // Get latest portfolio optimization run
      const { data: latestRun, error: runError } = await supabase
        .from('portfolio_optimization_runs')
        .select('*')
        .eq('profile_id', profileId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (runError) throw runError;

      // Get marginal curves for this profile (not tied to run_id in the schema)
      const { data: curves, error: curvesError } = await supabase
        .from('portfolio_marginal_curves')
        .select('*')
        .eq('profile_id', profileId)
        .order('marginal_roas_at_current', { ascending: false });

      if (curvesError) throw curvesError;

      // Fetch campaign names
      const campaignIds = curves?.map(c => c.campaign_id) || [];
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds);

      const campaignNameMap = new Map(campaigns?.map(c => [c.id, c.name]) || []);

      const reallocationOpportunities: MarginalCurve[] = (curves || []).map(c => ({
        campaignId: c.campaign_id,
        campaignName: campaignNameMap.get(c.campaign_id) || c.campaign_id,
        currentSpendMicros: c.current_spend_micros || 0,
        marginalRoas: c.marginal_roas_at_current || 0,
        optimalSpendMicros: c.optimal_spend_micros,
        currentRoas: c.current_roas,
        potentialGain: c.optimal_spend_micros && c.current_spend_micros
          ? ((c.optimal_spend_micros - c.current_spend_micros) * (c.marginal_roas_at_current || 0)) / 1_000_000
          : 0,
      }));

      // Calculate efficiency score based on how aligned current vs optimal spends are
      const totalCurrent = reallocationOpportunities.reduce((sum, c) => sum + c.currentSpendMicros, 0);
      const totalOptimal = reallocationOpportunities.reduce((sum, c) => sum + (c.optimalSpendMicros || c.currentSpendMicros), 0);
      
      // Simple efficiency: inverse of deviation from optimal
      const deviation = reallocationOpportunities.reduce((sum, c) => {
        const optimal = c.optimalSpendMicros || c.currentSpendMicros;
        return sum + Math.abs(c.currentSpendMicros - optimal);
      }, 0);
      
      const maxDeviation = totalCurrent * 2;
      const efficiencyScore = maxDeviation > 0 
        ? Math.round(Math.max(0, 100 - (deviation / maxDeviation * 100)))
        : 100;

      return {
        efficiencyScore,
        totalSpend: totalCurrent / 1_000_000,
        optimalSpend: totalOptimal / 1_000_000,
        reallocationOpportunities: reallocationOpportunities.slice(0, 5), // Top 5
        lastRunAt: latestRun?.started_at || null,
        lastRunStatus: latestRun?.status || null,
      };
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 10,
  });

  const runOptimization = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error('No profile selected');

      const { data, error } = await supabase.functions.invoke('portfolio-optimizer', {
        body: { profileId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Portfolio optimization completed');
      queryClient.invalidateQueries({ queryKey: ['portfolio-health', profileId] });
    },
    onError: (error) => {
      toast.error(`Optimization failed: ${error.message}`);
    },
  });

  return {
    ...query,
    runOptimization: runOptimization.mutate,
    isOptimizing: runOptimization.isPending,
  };
}

function getEmptyData(): PortfolioHealthData {
  return {
    efficiencyScore: 0,
    totalSpend: 0,
    optimalSpend: 0,
    reallocationOpportunities: [],
    lastRunAt: null,
    lastRunStatus: null,
  };
}
