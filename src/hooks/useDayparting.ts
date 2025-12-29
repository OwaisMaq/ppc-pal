import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface DaypartSlot {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  enabled: boolean;
  multiplier: number; // bid multiplier (0 = paused, 1 = normal, 1.2 = +20%)
}

export interface DaypartSchedule {
  id: string;
  profile_id: string;
  campaign_id: string;
  campaign_name?: string;
  enabled: boolean;
  schedule: DaypartSlot[];
  pause_multiplier: number;
  last_applied_at: string | null;
  last_applied_state: string | null;
  created_at: string;
  updated_at: string;
}

export interface DaypartExecutionHistory {
  id: string;
  schedule_id: string;
  profile_id: string;
  campaign_id: string;
  executed_at: string;
  action: 'paused' | 'enabled' | 'bid_adjusted';
  previous_state: string | null;
  new_state: string | null;
  multiplier_applied: number | null;
  success: boolean;
  error: string | null;
}

// Generate default schedule (all hours enabled, multiplier 1)
export const generateDefaultSchedule = (): DaypartSlot[] => {
  const schedule: DaypartSlot[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      schedule.push({ day, hour, enabled: true, multiplier: 1.0 });
    }
  }
  return schedule;
};

// Generate business hours schedule (8am-10pm enabled)
export const generateBusinessHoursSchedule = (): DaypartSlot[] => {
  const schedule: DaypartSlot[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isBusinessHour = hour >= 8 && hour <= 22;
      schedule.push({ 
        day, 
        hour, 
        enabled: isBusinessHour, 
        multiplier: isBusinessHour ? 1.0 : 0.01 
      });
    }
  }
  return schedule;
};

// Generate peak hours schedule (higher bids during peak times)
export const generatePeakHoursSchedule = (): DaypartSlot[] => {
  const schedule: DaypartSlot[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Peak hours: 9am-12pm and 7pm-10pm
      const isPeakMorning = hour >= 9 && hour <= 12;
      const isPeakEvening = hour >= 19 && hour <= 22;
      const isOff = hour < 6 || hour > 23;
      
      let multiplier = 1.0;
      let enabled = true;
      
      if (isPeakMorning || isPeakEvening) {
        multiplier = 1.3;
      } else if (isOff) {
        multiplier = 0.01;
        enabled = false;
      }
      
      schedule.push({ day, hour, enabled, multiplier });
    }
  }
  return schedule;
};

export const useDayparting = (profileId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all daypart schedules for a profile
  const schedulesQuery = useQuery({
    queryKey: ['daypart-schedules', profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from('daypart_schedules')
        .select('*')
        .eq('profile_id', profileId);

      if (error) throw error;
      
      return (data || []).map(row => ({
        ...row,
        schedule: (row.schedule as unknown as DaypartSlot[]) || [],
      })) as DaypartSchedule[];
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch execution history
  const historyQuery = useQuery({
    queryKey: ['daypart-history', profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from('daypart_execution_history')
        .select('*')
        .eq('profile_id', profileId)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as DaypartExecutionHistory[];
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 2,
  });

  // Create or update schedule
  const saveScheduleMutation = useMutation({
    mutationFn: async (input: {
      campaignId: string;
      campaignName?: string;
      schedule: DaypartSlot[];
      enabled?: boolean;
      pauseMultiplier?: number;
    }) => {
      if (!profileId || !user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('daypart_schedules')
        .select('id')
        .eq('profile_id', profileId)
        .eq('campaign_id', input.campaignId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('daypart_schedules')
          .update({
            schedule: JSON.stringify(input.schedule),
            enabled: input.enabled ?? true,
            pause_multiplier: input.pauseMultiplier ?? 0.01,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('daypart_schedules')
          .insert([{
            profile_id: profileId,
            campaign_id: input.campaignId,
            user_id: user.id,
            schedule: JSON.stringify(input.schedule),
            enabled: input.enabled ?? true,
            pause_multiplier: input.pauseMultiplier ?? 0.01,
          }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daypart-schedules', profileId] });
      toast.success('Daypart schedule saved');
    },
    onError: (error) => {
      console.error('Error saving daypart schedule:', error);
      toast.error('Failed to save schedule');
    },
  });

  // Toggle schedule enabled/disabled
  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, enabled }: { scheduleId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('daypart_schedules')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daypart-schedules', profileId] });
      toast.success('Schedule updated');
    },
    onError: () => {
      toast.error('Failed to update schedule');
    },
  });

  // Delete schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('daypart_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daypart-schedules', profileId] });
      toast.success('Schedule deleted');
    },
    onError: () => {
      toast.error('Failed to delete schedule');
    },
  });

  return {
    schedules: schedulesQuery.data || [],
    history: historyQuery.data || [],
    loading: schedulesQuery.isLoading,
    historyLoading: historyQuery.isLoading,
    saveSchedule: saveScheduleMutation.mutateAsync,
    toggleSchedule: toggleScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutateAsync,
    isSaving: saveScheduleMutation.isPending,
    refetch: schedulesQuery.refetch,
  };
};
