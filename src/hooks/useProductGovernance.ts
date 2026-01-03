import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ProductGovernance {
  id: string;
  profile_id: string;
  asin: string;
  target_acos: number | null;
  created_at: string;
  updated_at: string;
}

export const useProductGovernance = (profileId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targets, setTargets] = useState<ProductGovernance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTargets = useCallback(async () => {
    if (!user || !profileId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_governance')
        .select('*')
        .eq('profile_id', profileId)
        .order('asin');

      if (error) throw error;
      setTargets(data || []);
    } catch (err) {
      console.error('Error fetching product governance:', err);
    } finally {
      setLoading(false);
    }
  }, [user, profileId]);

  const upsertTarget = async (asin: string, targetAcos: number | null) => {
    if (!user || !profileId) return null;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('product_governance')
        .upsert(
          { 
            profile_id: profileId, 
            asin, 
            target_acos: targetAcos,
            user_id: user.id 
          },
          { onConflict: 'profile_id,asin' }
        )
        .select()
        .single();

      if (error) throw error;
      
      setTargets(prev => {
        const existing = prev.findIndex(t => t.asin === asin);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data].sort((a, b) => a.asin.localeCompare(b.asin));
      });
      
      toast({ title: "Product target saved" });
      return data;
    } catch (err) {
      console.error('Error saving product target:', err);
      toast({ 
        title: "Error saving target", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const deleteTarget = async (asin: string) => {
    if (!user || !profileId) return false;
    
    try {
      const { error } = await supabase
        .from('product_governance')
        .delete()
        .eq('profile_id', profileId)
        .eq('asin', asin);

      if (error) throw error;
      
      setTargets(prev => prev.filter(t => t.asin !== asin));
      toast({ title: "Product target removed" });
      return true;
    } catch (err) {
      console.error('Error deleting product target:', err);
      toast({ 
        title: "Error removing target", 
        variant: "destructive"
      });
      return false;
    }
  };

  const getEffectiveTarget = (asin: string, globalTargetAcos: number): number => {
    const productTarget = targets.find(t => t.asin === asin);
    return productTarget?.target_acos ?? globalTargetAcos;
  };

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  return {
    targets,
    loading,
    saving,
    upsertTarget,
    deleteTarget,
    getEffectiveTarget,
    refetch: fetchTargets
  };
};
