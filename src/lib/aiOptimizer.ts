
import { AdvertisingData } from '@/pages/Index';
import { supabase } from '@/integrations/supabase/client';

interface OptimizationSuggestion {
  type: 'bid_increase' | 'bid_decrease' | 'remove_keyword' | 'add_negative' | 'change_match_type';
  reason: string;
  originalValue?: any;
  suggestedValue?: any;
}

// Cache for storing optimization results
const optimizationCache = new Map<string, AdvertisingData>();

// Input validation and sanitization
const validateAndSanitizeData = (data: AdvertisingData): AdvertisingData => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }

  // Sanitize and validate keywords array
  if (data.keywords && Array.isArray(data.keywords)) {
    data.keywords = data.keywords.filter(keyword => {
      if (!keyword || typeof keyword !== 'object') return false;
      
      // Sanitize string fields to prevent injection
      Object.keys(keyword).forEach(key => {
        if (typeof keyword[key] === 'string') {
          keyword[key] = keyword[key].replace(/[<>]/g, ''); // Basic HTML tag removal
        }
      });
      
      return true;
    });
  }

  // Similar validation for campaigns and adGroups
  if (data.campaigns && Array.isArray(data.campaigns)) {
    data.campaigns = data.campaigns.filter(campaign => campaign && typeof campaign === 'object');
  }

  if (data.adGroups && Array.isArray(data.adGroups)) {
    data.adGroups = data.adGroups.filter(adGroup => adGroup && typeof adGroup === 'object');
  }

  return data;
};

// Generate a simple hash for the data to use as cache key
const generateDataHash = (data: AdvertisingData): string => {
  const keyData = {
    keywordCount: data.keywords?.length || 0,
    campaignCount: data.campaigns?.length || 0,
    firstKeywords: data.keywords?.slice(0, 5) || []
  };
  return btoa(JSON.stringify(keyData)).substring(0, 16);
};

export const optimizeAdvertisingData = async (data: AdvertisingData): Promise<AdvertisingData> => {
  try {
    console.log("Starting AI optimization process...");
    
    // Validate and sanitize input data
    const sanitizedData = validateAndSanitizeData(data);
    
    // Check cache first for consistent results
    const dataHash = generateDataHash(sanitizedData);
    console.log("Data hash:", dataHash);
    
    if (optimizationCache.has(dataHash)) {
      console.log("Returning cached optimization result");
      return optimizationCache.get(dataHash)!;
    }
    
    // Prepare data summary for AI analysis with size limits
    const maxKeywords = 50; // Limit to prevent excessive API usage
    const dataSummary = {
      totalKeywords: Math.min(sanitizedData.keywords?.length || 0, maxKeywords),
      totalCampaigns: sanitizedData.campaigns?.length || 0,
      totalAdGroups: sanitizedData.adGroups?.length || 0,
      sampleKeywords: sanitizedData.keywords?.slice(0, 10) || []
    };

    console.log("Data summary for AI:", dataSummary);

    // Call OpenAI API for optimization suggestions using Supabase edge function
    const suggestions = await getOptimizationSuggestions(dataSummary, dataHash);
    
    console.log("AI suggestions received:", suggestions);

    // Apply optimizations based on AI suggestions
    const optimizedData = applyOptimizations(sanitizedData, suggestions);
    
    // Cache the result
    optimizationCache.set(dataHash, optimizedData);
    
    console.log("Optimizations applied successfully");
    return optimizedData;

  } catch (error) {
    console.error("AI optimization error:", error);
    
    // Fallback to deterministic rule-based optimization if AI fails
    console.log("Falling back to deterministic rule-based optimization...");
    const sanitizedData = validateAndSanitizeData(data);
    const dataHash = generateDataHash(sanitizedData);
    
    if (optimizationCache.has(dataHash)) {
      console.log("Returning cached fallback result");
      return optimizationCache.get(dataHash)!;
    }
    
    const fallbackResult = applyDeterministicRuleBasedOptimization(sanitizedData);
    optimizationCache.set(dataHash, fallbackResult);
    return fallbackResult;
  }
};

const getOptimizationSuggestions = async (dataSummary: any, seed: string): Promise<OptimizationSuggestion[]> => {
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
const generateFallbackSuggestions = (dataSummary: any): OptimizationSuggestion[] => {
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

const applyOptimizations = (data: AdvertisingData, suggestions: OptimizationSuggestion[]): AdvertisingData => {
  const optimizedData = JSON.parse(JSON.stringify(data)); // Deep clone

  // Apply AI suggestions to keywords deterministically
  if (optimizedData.keywords && suggestions.length > 0) {
    optimizedData.keywords = optimizedData.keywords.map((keyword: any, index: number) => {
      const optimizedKeyword = { ...keyword };
      
      // Apply suggestions in a deterministic pattern
      for (const suggestion of suggestions) {
        // Use the correct field names for your data structure
        const currentBid = parseFloat(keyword.Bid || keyword.bid || keyword['Max CPC'] || '1.00');
        
        // Validate bid value to prevent injection
        if (isNaN(currentBid) || currentBid < 0 || currentBid > 100) {
          continue; // Skip invalid bids
        }
        
        switch (suggestion.type) {
          case 'bid_increase':
            if (currentBid < 2.0) { // Only increase low bids
              const newBid = Math.max(currentBid * 1.3, currentBid + 0.25).toFixed(2);
              optimizedKeyword.Bid = newBid;
              if (optimizedKeyword.bid) optimizedKeyword.bid = newBid;
              if (optimizedKeyword['Max CPC']) optimizedKeyword['Max CPC'] = newBid;
            }
            break;
            
          case 'bid_decrease':
            if (currentBid > 2.5) { // Only decrease high bids
              const newBid = Math.max(currentBid * 0.8, 0.25).toFixed(2);
              optimizedKeyword.Bid = newBid;
              if (optimizedKeyword.bid) optimizedKeyword.bid = newBid;
              if (optimizedKeyword['Max CPC']) optimizedKeyword['Max CPC'] = newBid;
            }
            break;
            
          case 'change_match_type':
            // Use the correct field name for match type
            if (keyword['Match type'] === 'broad') {
              optimizedKeyword['Match type'] = 'phrase';
              if (optimizedKeyword.matchType) optimizedKeyword.matchType = 'phrase';
            }
            break;
        }
      }
      
      return optimizedKeyword;
    });

    // Remove underperforming keywords deterministically (last 5% of keywords)
    const removeCount = suggestions.filter(s => s.type === 'remove_keyword').length;
    if (removeCount > 0) {
      const removeAmount = Math.min(Math.floor(optimizedData.keywords.length * 0.05), 5);
      if (removeAmount > 0) {
        optimizedData.keywords = optimizedData.keywords.slice(0, -removeAmount);
      }
    }
  }

  return optimizedData;
};

const applyDeterministicRuleBasedOptimization = (data: AdvertisingData): AdvertisingData => {
  console.log("Applying deterministic rule-based optimization as fallback...");
  
  const optimizedData = JSON.parse(JSON.stringify(data)); // Deep clone

  // Deterministic rule-based optimization for keywords
  if (optimizedData.keywords) {
    optimizedData.keywords = optimizedData.keywords.map((keyword: any) => {
      const optimizedKeyword = { ...keyword };
      
      // Deterministic optimization based on bid ranges using correct field names
      const currentBid = parseFloat(keyword.Bid || keyword.bid || keyword['Max CPC'] || '1.00');
      
      // Validate bid value
      if (isNaN(currentBid) || currentBid < 0 || currentBid > 100) {
        return optimizedKeyword; // Skip invalid bids
      }
      
      // Increase bids for low bids (likely high performers)
      if (currentBid < 1.00) {
        const newBid = (currentBid * 1.3).toFixed(2);
        optimizedKeyword.Bid = newBid;
        if (optimizedKeyword.bid) optimizedKeyword.bid = newBid;
        if (optimizedKeyword['Max CPC']) optimizedKeyword['Max CPC'] = newBid;
      }
      // Decrease high bids (likely underperformers)
      else if (currentBid > 3.00) {
        const newBid = (currentBid * 0.8).toFixed(2);
        optimizedKeyword.Bid = newBid;
        if (optimizedKeyword.bid) optimizedKeyword.bid = newBid;
        if (optimizedKeyword['Max CPC']) optimizedKeyword['Max CPC'] = newBid;
      }
      
      return optimizedKeyword;
    });

    // Remove keywords deterministically (last 5% instead of random)
    const removeCount = Math.floor(optimizedData.keywords.length * 0.05);
    if (removeCount > 0) {
      optimizedData.keywords = optimizedData.keywords.slice(0, -removeCount);
    }
  }

  return optimizedData;
};
