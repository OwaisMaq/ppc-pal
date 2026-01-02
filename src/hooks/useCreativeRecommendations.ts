import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreativeRecommendation {
  id: string;
  profile_id: string;
  asset_id: string;
  ad_id: string | null;
  recommendation_type: 'pause' | 'replace' | 'test' | 'boost';
  reason: string;
  confidence: number;
  impact_estimate: 'high' | 'medium' | 'low' | null;
  metrics: Record<string, number>;
  status: 'pending' | 'applied' | 'dismissed';
  created_at: string;
  applied_at: string | null;
  dismissed_at: string | null;
}

interface RecommendationStats {
  assetsAnalyzed: number;
  recommendationsGenerated: number;
  avgCtr: number;
  avgCpc: number;
  avgAcos: number;
}

export function useCreativeRecommendations(profileId?: string) {
  const [recommendations, setRecommendations] = useState<CreativeRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<RecommendationStats | null>(null);

  const fetchRecommendations = useCallback(async (status: 'pending' | 'applied' | 'dismissed' = 'pending') => {
    if (!profileId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('creative-recommendations', {
        body: null,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Fallback to direct table query if function fails
      const { data: recs, error: queryError } = await supabase
        .from('creative_recommendations')
        .select('*')
        .eq('profile_id', profileId)
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(100);

      if (queryError) throw queryError;
      
      setRecommendations(recs as CreativeRecommendation[] || []);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  const generateRecommendations = useCallback(async (config?: {
    min_impressions?: number;
    ctr_threshold_pct?: number;
    acos_threshold_pct?: number;
    lookback_days?: number;
  }) => {
    if (!profileId) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('creative-recommendations', {
        body: {
          profile_id: profileId,
          config
        },
        method: 'POST',
      });

      if (error) throw error;

      if (data?.stats) {
        setStats(data.stats);
      }

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
      }

      toast.success(`Generated ${data?.recommendations?.length || 0} recommendations`);
      
      // Refresh from DB
      await fetchRecommendations('pending');
    } catch (err) {
      console.error('Failed to generate recommendations:', err);
      toast.error('Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  }, [profileId, fetchRecommendations]);

  const applyRecommendation = useCallback(async (recommendationId: string) => {
    if (!profileId) return;

    try {
      const { error } = await supabase.functions.invoke('creative-recommendations', {
        body: {
          recommendation_id: recommendationId,
          profile_id: profileId
        },
        method: 'POST',
      });

      if (error) throw error;

      toast.success('Recommendation applied');
      
      // Update local state
      setRecommendations(prev => 
        prev.filter(r => r.id !== recommendationId)
      );
    } catch (err) {
      console.error('Failed to apply recommendation:', err);
      toast.error('Failed to apply recommendation');
    }
  }, [profileId]);

  const dismissRecommendation = useCallback(async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from('creative_recommendations')
        .update({ 
          status: 'dismissed', 
          dismissed_at: new Date().toISOString() 
        })
        .eq('id', recommendationId);

      if (error) throw error;

      toast.success('Recommendation dismissed');
      
      // Update local state
      setRecommendations(prev => 
        prev.filter(r => r.id !== recommendationId)
      );
    } catch (err) {
      console.error('Failed to dismiss recommendation:', err);
      toast.error('Failed to dismiss recommendation');
    }
  }, []);

  return {
    recommendations,
    loading,
    generating,
    stats,
    fetchRecommendations,
    generateRecommendations,
    applyRecommendation,
    dismissRecommendation,
  };
}
