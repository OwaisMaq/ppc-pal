import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAmazonConnections } from "./useAmazonConnections";
import { toast } from "sonner";

export interface TrackedKeyword {
  id: string;
  profile_id: string;
  asin: string;
  keyword: string;
  current_sponsored_rank: number | null;
  current_organic_rank: number | null;
  best_sponsored_rank: number | null;
  best_organic_rank: number | null;
  rank_trend: number;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RankHistoryPoint {
  id: string;
  tracking_id: string;
  sponsored_rank: number | null;
  organic_rank: number | null;
  checked_at: string;
}

export function useRankTracker() {
  const { connections } = useAmazonConnections();
  const queryClient = useQueryClient();
  // Use first active connection as the active profile
  const activeConnection = connections.find(c => c.status === 'active') ?? connections[0];
  const profileId = activeConnection?.profile_id;

  const {
    data: trackedKeywords = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rank-tracking", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from("keyword_rank_tracking")
        .select("*")
        .eq("profile_id", profileId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TrackedKeyword[];
    },
    enabled: !!profileId,
  });

  const addKeywordMutation = useMutation({
    mutationFn: async ({ asin, keyword }: { asin: string; keyword: string }) => {
      if (!profileId) throw new Error("No profile selected");

      const { data, error } = await supabase
        .from("keyword_rank_tracking")
        .insert({
          profile_id: profileId,
          asin: asin.toUpperCase(),
          keyword: keyword.toLowerCase().trim(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("This keyword is already being tracked for this ASIN");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rank-tracking", profileId] });
      toast.success("Keyword added to tracking");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeKeywordMutation = useMutation({
    mutationFn: async (trackingId: string) => {
      const { error } = await supabase
        .from("keyword_rank_tracking")
        .update({ is_active: false })
        .eq("id", trackingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rank-tracking", profileId] });
      toast.success("Keyword removed from tracking");
    },
    onError: () => {
      toast.error("Failed to remove keyword");
    },
  });

  return {
    trackedKeywords,
    isLoading,
    error,
    addKeyword: addKeywordMutation.mutate,
    removeKeyword: removeKeywordMutation.mutate,
    isAdding: addKeywordMutation.isPending,
    isRemoving: removeKeywordMutation.isPending,
  };
}

export function useRankHistory(trackingId: string | null) {
  return useQuery({
    queryKey: ["rank-history", trackingId],
    queryFn: async () => {
      if (!trackingId) return [];

      const { data, error } = await supabase
        .from("keyword_rank_history")
        .select("*")
        .eq("tracking_id", trackingId)
        .order("checked_at", { ascending: true })
        .limit(90); // Last 90 days

      if (error) throw error;
      return data as RankHistoryPoint[];
    },
    enabled: !!trackingId,
  });
}
