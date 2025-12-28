import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserCount() {
  return useQuery({
    queryKey: ["user-count"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("user-count");
      if (error) throw error;
      return data.count as number;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: false,
  });
}

export function formatUserCount(count: number): string {
  if (count < 100) return "10+";
  if (count < 1000) return `${Math.floor(count / 10) * 10}+`;
  if (count < 10000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  return `${Math.floor(count / 1000)}k+`;
}
