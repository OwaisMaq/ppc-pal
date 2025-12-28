import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Experiment {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  experimentType: string;
  entityId: string;
  entityType: string;
  treatmentStartDate: string | null;
  treatmentEndDate: string | null;
  incrementalLiftPercent: number | null;
  statisticalSignificance: number | null;
  isSignificant: boolean | null;
  treatmentMetrics: Record<string, number> | null;
  baselineMetrics: Record<string, number> | null;
  createdAt: string;
}

export interface CreateExperimentInput {
  name: string;
  experimentType: string;
  entityId: string;
  entityType: string;
  treatmentStartDate: string;
  treatmentEndDate: string;
}

export function useExperiments(profileId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['experiments', profileId],
    queryFn: async (): Promise<Experiment[]> => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from('incrementality_experiments')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(e => ({
        id: e.id,
        name: e.name,
        status: e.status as Experiment['status'],
        experimentType: e.experiment_type,
        entityId: e.entity_id,
        entityType: e.entity_type,
        treatmentStartDate: e.treatment_start_date,
        treatmentEndDate: e.treatment_end_date,
        incrementalLiftPercent: e.incremental_lift_percent,
        statisticalSignificance: e.statistical_significance,
        isSignificant: e.is_significant,
        treatmentMetrics: e.treatment_metrics as Record<string, number> | null,
        baselineMetrics: e.baseline_metrics as Record<string, number> | null,
        createdAt: e.created_at,
      }));
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 5,
  });

  const createExperiment = useMutation({
    mutationFn: async (input: CreateExperimentInput) => {
      if (!profileId) throw new Error('No profile selected');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('incrementality_experiments')
        .insert({
          profile_id: profileId,
          user_id: userData.user.id,
          name: input.name,
          experiment_type: input.experimentType,
          entity_id: input.entityId,
          entity_type: input.entityType,
          treatment_start_date: input.treatmentStartDate,
          treatment_end_date: input.treatmentEndDate,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Experiment created successfully');
      queryClient.invalidateQueries({ queryKey: ['experiments', profileId] });
    },
    onError: (error) => {
      toast.error(`Failed to create experiment: ${error.message}`);
    },
  });

  const runAnalysis = useMutation({
    mutationFn: async (experimentId: string) => {
      const { data, error } = await supabase.functions.invoke('incrementality-analyzer', {
        body: { experimentId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Incrementality analysis completed');
      queryClient.invalidateQueries({ queryKey: ['experiments', profileId] });
    },
    onError: (error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  return {
    experiments: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createExperiment: createExperiment.mutate,
    isCreating: createExperiment.isPending,
    runAnalysis: runAnalysis.mutate,
    isAnalyzing: runAnalysis.isPending,
  };
}
