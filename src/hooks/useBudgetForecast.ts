import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BudgetForecast {
  month: string;
  predictedSpend: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface BudgetRecommendation {
  title: string;
  description: string;
  suggestedAmount: number;
  priority: 'high' | 'medium' | 'low';
}

export interface BudgetInsights {
  averageMonthlySpend: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalPattern?: string;
}

export interface BudgetForecastData {
  forecasts: BudgetForecast[];
  recommendations: BudgetRecommendation[];
  insights: BudgetInsights;
  generatedAt: string;
  profileId: string;
}

export function useBudgetForecast(profileId?: string, monthsToForecast: number = 3) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['budget-forecast', profileId, monthsToForecast],
    queryFn: async () => {
      if (!profileId) return null;

      const { data, error } = await supabase.functions.invoke('budget-forecast', {
        body: { profileId, monthsToForecast }
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message?.includes('402')) {
          toast.error('Payment required. Please add credits to continue.');
        }
        throw error;
      }

      return data as BudgetForecastData;
    },
    enabled: false, // Manual fetch only
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const generateForecast = async () => {
    if (!profileId) {
      toast.error('Please select a profile first');
      return;
    }

    setIsGenerating(true);
    try {
      await refetch();
      toast.success('Budget forecast generated successfully');
    } catch (err) {
      console.error('Error generating forecast:', err);
      toast.error('Failed to generate forecast');
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    forecast: data,
    isLoading: isLoading || isGenerating,
    error,
    generateForecast,
  };
}
