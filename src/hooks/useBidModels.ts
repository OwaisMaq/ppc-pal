import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BidModel {
  id: string;
  entityId: string;
  entityType: string;
  modelType: string;
  rSquared: number | null;
  rmse: number | null;
  samplesUsed: number | null;
  optimalBidMicros: number | null;
  kneeBidMicros: number | null;
  saturationBidMicros: number | null;
  lastFittedAt: string | null;
}

export interface BidModelsStats {
  totalModels: number;
  averageRSquared: number;
  averageRmse: number;
  modelsFitted: number;
  modelsWithOptimalBid: number;
}

export function useBidModels(profileId?: string) {
  return useQuery({
    queryKey: ['bid-models', profileId],
    queryFn: async (): Promise<{ models: BidModel[]; stats: BidModelsStats }> => {
      if (!profileId) {
        return { models: [], stats: getEmptyStats() };
      }

      const { data, error } = await supabase
        .from('bid_response_models')
        .select('*')
        .eq('profile_id', profileId)
        .order('last_fitted_at', { ascending: false });

      if (error) throw error;

      const models: BidModel[] = (data || []).map(m => ({
        id: m.id,
        entityId: m.entity_id,
        entityType: m.entity_type,
        modelType: m.model_type,
        rSquared: m.r_squared,
        rmse: m.rmse,
        samplesUsed: m.samples_used,
        optimalBidMicros: m.optimal_bid_micros,
        kneeBidMicros: m.knee_bid_micros,
        saturationBidMicros: m.saturation_bid_micros,
        lastFittedAt: m.last_fitted_at,
      }));

      // Calculate stats
      const modelsWithRSquared = models.filter(m => m.rSquared !== null);
      const modelsWithRmse = models.filter(m => m.rmse !== null);
      const modelsFitted = models.filter(m => m.lastFittedAt !== null).length;
      const modelsWithOptimalBid = models.filter(m => m.optimalBidMicros !== null).length;

      const averageRSquared = modelsWithRSquared.length > 0
        ? modelsWithRSquared.reduce((sum, m) => sum + (m.rSquared || 0), 0) / modelsWithRSquared.length
        : 0;

      const averageRmse = modelsWithRmse.length > 0
        ? modelsWithRmse.reduce((sum, m) => sum + (m.rmse || 0), 0) / modelsWithRmse.length
        : 0;

      return {
        models,
        stats: {
          totalModels: models.length,
          averageRSquared: Math.round(averageRSquared * 100) / 100,
          averageRmse: Math.round(averageRmse * 100) / 100,
          modelsFitted,
          modelsWithOptimalBid,
        },
      };
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 5,
  });
}

function getEmptyStats(): BidModelsStats {
  return {
    totalModels: 0,
    averageRSquared: 0,
    averageRmse: 0,
    modelsFitted: 0,
    modelsWithOptimalBid: 0,
  };
}
