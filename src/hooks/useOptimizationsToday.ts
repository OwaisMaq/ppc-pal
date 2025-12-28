import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useOptimizationsToday = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        // Get start of today in UTC
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Count applied actions from today
        const { count: appliedCount, error } = await supabase
          .from("action_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "applied")
          .gte("applied_at", todayISO);

        if (error) {
          console.error("Error fetching optimizations count:", error);
          setCount(0);
        } else {
          setCount(appliedCount || 0);
        }
      } catch (err) {
        console.error("Error in useOptimizationsToday:", err);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return { count, loading };
};
