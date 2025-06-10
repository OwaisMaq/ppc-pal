
import { supabase } from '@/integrations/supabase/client';

export interface OptimizationSuggestion {
  type: 'bid_increase' | 'bid_decrease' | 'remove_keyword' | 'add_negative' | 'change_match_type';
  reason: string;
  originalValue?: any;
  suggestedValue?: any;
}

export const getOptimizationSuggestions = async (dataSummary: any, seed: string): Promise<OptimizationSuggestion[]> => {
  try {
    // Use Supabase edge function instead of direct OpenAI API call
    const { data, error } = await supabase.functions.invoke('ai-optimize', {
      body: {
        dataSummary,
        seed
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (data?.suggestions && Array.isArray(data.suggestions)) {
      return data.suggestions;
    }

    console.warn("No valid suggestions from edge function");
    return generateFallbackSuggestions(dataSummary);

  } catch (error) {
    console.error("Error calling optimization edge function:", error);
    return generateFallbackSuggestions(dataSummary);
  }
};

// Generate consistent fallback suggestions based on data characteristics
export const generateFallbackSuggestions = (dataSummary: any): OptimizationSuggestion[] => {
  const suggestions: OptimizationSuggestion[] = [];
  const keywordCount = dataSummary.totalKeywords;
  
  // Generate deterministic suggestions based on data size
  if (keywordCount > 0) {
    suggestions.push({
      type: 'bid_increase',
      reason: 'Systematic bid optimization for performance keywords',
      originalValue: 1.0,
      suggestedValue: 1.3
    });
  }
  
  if (keywordCount > 10) {
    suggestions.push({
      type: 'bid_decrease',
      reason: 'Cost optimization for high-bid keywords',
      originalValue: 3.0,
      suggestedValue: 2.4
    });
  }
  
  if (keywordCount > 20) {
    suggestions.push({
      type: 'remove_keyword',
      reason: 'Remove underperforming keywords',
      originalValue: null,
      suggestedValue: null
    });
  }
  
  return suggestions;
};
