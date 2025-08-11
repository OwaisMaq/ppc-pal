import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BudgetUsage {
  date: string;
  currency: string | null;
  budget_amount: number | null;
  usage_amount: number | null;
  usage_percentage: number | null;
}

export type BudgetUsageMap = Record<string, BudgetUsage>; // campaign_id -> usage snapshot

export const useBudgetUsage = (campaignIds: string[]) => {
  const [data, setData] = useState<BudgetUsageMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uniqueIds = useMemo(() => Array.from(new Set(campaignIds)).filter(Boolean), [campaignIds]);

  const fetchUsage = useCallback(async () => {
    if (!uniqueIds.length) {
      setData({});
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Casting supabase to any to bypass types for newly added table
      const { data: rows, error } = await (supabase as any)
        .from("campaign_budget_usage")
        .select("campaign_id, date, currency, budget_amount, usage_amount, usage_percentage")
        .in("campaign_id", uniqueIds)
        .order("date", { ascending: false });

      if (error) throw error;

      const map: BudgetUsageMap = {};
      for (const r of (rows as any[]) || []) {
        // Take the latest row per campaign_id
        if (!map[r.campaign_id]) {
          const usagePct = r.usage_percentage ?? (
            r.budget_amount && Number(r.budget_amount) > 0 && r.usage_amount != null
              ? Number(((Number(r.usage_amount) / Number(r.budget_amount)) * 100).toFixed(2))
              : null
          );
          map[r.campaign_id] = {
            date: String(r.date),
            currency: r.currency ?? null,
            budget_amount: r.budget_amount ?? null,
            usage_amount: r.usage_amount ?? null,
            usage_percentage: usagePct,
          };
        }
      }
      setData(map);
    } catch (e: any) {
      console.error("Failed to fetch budget usage:", e);
      setError(e?.message || "Failed to fetch budget usage");
    } finally {
      setLoading(false);
    }
  }, [uniqueIds]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { data, loading, error, refetch: fetchUsage };
};
