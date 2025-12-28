import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BidOptimizerStatus {
  totalEntities: number;
  highConfidenceEntities: number;
  mediumConfidenceEntities: number;
  lowConfidenceEntities: number;
  averageConfidence: number;
  learningProgress: number; // 0-100%
  daysSinceStart: number;
  totalObservations: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  bidsOptimizedToday: number;
}

export function useBidOptimizerStatus(profileId?: string) {
  return useQuery({
    queryKey: ['bid-optimizer-status', profileId],
    queryFn: async (): Promise<BidOptimizerStatus> => {
      if (!profileId) {
        return getEmptyStatus();
      }

      // Fetch bid states for confidence distribution
      const { data: bidStates, error: statesError } = await supabase
        .from('bid_states')
        .select('confidence_level, observations_count, created_at, updated_at')
        .eq('profile_id', profileId);

      if (statesError) throw statesError;

      // Fetch latest optimizer run
      const { data: latestRun, error: runError } = await supabase
        .from('bid_optimizer_runs')
        .select('*')
        .eq('profile_id', profileId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (runError) throw runError;

      // Fetch today's runs for bids optimized count
      const today = new Date().toISOString().split('T')[0];
      const { data: todayRuns, error: todayError } = await supabase
        .from('bid_optimizer_runs')
        .select('bids_changed')
        .eq('profile_id', profileId)
        .gte('started_at', today)
        .eq('status', 'completed');

      if (todayError) throw todayError;

      // Calculate metrics
      const totalEntities = bidStates?.length || 0;
      const highConfidence = bidStates?.filter(s => s.confidence_level === 'high').length || 0;
      const mediumConfidence = bidStates?.filter(s => s.confidence_level === 'medium').length || 0;
      const lowConfidence = bidStates?.filter(s => s.confidence_level === 'low').length || 0;

      const totalObservations = bidStates?.reduce((sum, s) => sum + (s.observations_count || 0), 0) || 0;

      // Learning progress: % of entities with high confidence
      const learningProgress = totalEntities > 0 
        ? Math.round((highConfidence / totalEntities) * 100) 
        : 0;

      // Average confidence based on distribution
      const avgConfidence = totalEntities > 0
        ? Math.round(((highConfidence * 90 + mediumConfidence * 60 + lowConfidence * 30) / totalEntities))
        : 0;

      // Days since first entity was created
      const firstCreated = bidStates?.reduce((min, s) => {
        const date = new Date(s.created_at);
        return date < min ? date : min;
      }, new Date());
      const daysSinceStart = firstCreated 
        ? Math.floor((Date.now() - firstCreated.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const bidsOptimizedToday = todayRuns?.reduce((sum, r) => sum + (r.bids_changed || 0), 0) || 0;

      return {
        totalEntities,
        highConfidenceEntities: highConfidence,
        mediumConfidenceEntities: mediumConfidence,
        lowConfidenceEntities: lowConfidence,
        averageConfidence: avgConfidence,
        learningProgress,
        daysSinceStart,
        totalObservations,
        lastRunAt: latestRun?.started_at || null,
        lastRunStatus: latestRun?.status || null,
        bidsOptimizedToday,
      };
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

function getEmptyStatus(): BidOptimizerStatus {
  return {
    totalEntities: 0,
    highConfidenceEntities: 0,
    mediumConfidenceEntities: 0,
    lowConfidenceEntities: 0,
    averageConfidence: 0,
    learningProgress: 0,
    daysSinceStart: 0,
    totalObservations: 0,
    lastRunAt: null,
    lastRunStatus: null,
    bidsOptimizedToday: 0,
  };
}
