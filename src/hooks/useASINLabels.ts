import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ASINLabel {
  id: string;
  asin: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export const useASINLabels = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [labels, setLabels] = useState<ASINLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('asin_labels')
        .select('*')
        .order('asin');

      if (error) throw error;
      setLabels(data || []);
    } catch (err) {
      console.error('Error fetching ASIN labels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ASIN labels');
    } finally {
      setLoading(false);
    }
  };

  const createLabel = async (asin: string, label: string) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('asin_labels')
        .insert({ asin, label, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setLabels(prev => [...prev, data].sort((a, b) => a.asin.localeCompare(b.asin)));
      toast({ title: "ASIN label created successfully" });
      return data;
    } catch (err) {
      console.error('Error creating ASIN label:', err);
      toast({ 
        title: "Error creating ASIN label", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateLabel = async (id: string, label: string) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('asin_labels')
        .update({ label })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setLabels(prev => prev.map(l => l.id === id ? data : l));
      toast({ title: "ASIN label updated successfully" });
      return data;
    } catch (err) {
      console.error('Error updating ASIN label:', err);
      toast({ 
        title: "Error updating ASIN label", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteLabel = async (id: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('asin_labels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setLabels(prev => prev.filter(l => l.id !== id));
      toast({ title: "ASIN label deleted successfully" });
      return true;
    } catch (err) {
      console.error('Error deleting ASIN label:', err);
      toast({ 
        title: "Error deleting ASIN label", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchLabels();
  }, [user]);

  return {
    labels,
    loading,
    error,
    createLabel,
    updateLabel,
    deleteLabel,
    refetch: fetchLabels
  };
};