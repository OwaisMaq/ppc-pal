
import { AdvertisingData } from '@/pages/Index';

const OPENAI_API_KEY = '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';

interface OptimizationSuggestion {
  type: 'bid_increase' | 'bid_decrease' | 'remove_keyword' | 'add_negative' | 'change_match_type';
  reason: string;
  originalValue?: any;
  suggestedValue?: any;
}

// Cache for storing optimization results
const optimizationCache = new Map<string, AdvertisingData>();

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
    
    // Check cache first for consistent results
    const dataHash = generateDataHash(data);
    console.log("Data hash:", dataHash);
    
    if (optimizationCache.has(dataHash)) {
      console.log("Returning cached optimization result");
      return optimizationCache.get(dataHash)!;
    }
    
    // Prepare data summary for AI analysis
    const dataSummary = {
      totalKeywords: data.keywords?.length || 0,
      totalCampaigns: data.campaigns?.length || 0,
      totalAdGroups: data.adGroups?.length || 0,
      sampleKeywords: data.keywords?.slice(0, 10) || []
    };

    console.log("Data summary for AI:", dataSummary);

    // Call OpenAI API for optimization suggestions
    const suggestions = await getOptimizationSuggestions(dataSummary, dataHash);
    
    console.log("AI suggestions received:", suggestions);

    // Apply optimizations based on AI suggestions
    const optimizedData = applyOptimizations(data, suggestions);
    
    // Cache the result
    optimizationCache.set(dataHash, optimizedData);
    
    console.log("Optimizations applied successfully");
    return optimizedData;

  } catch (error) {
    console.error("AI optimization error:", error);
    
    // Fallback to deterministic rule-based optimization if AI fails
    console.log("Falling back to deterministic rule-based optimization...");
    const dataHash = generateDataHash(data);
    
    if (optimizationCache.has(dataHash)) {
      console.log("Returning cached fallback result");
      return optimizationCache.get(dataHash)!;
    }
    
    const fallbackResult = applyDeterministicRuleBasedOptimization(data);
    optimizationCache.set(dataHash, fallbackResult);
    return fallbackResult;
  }
};

const getOptimizationSuggestions = async (dataSummary: any, seed: string): Promise<OptimizationSuggestion[]> => {
  const prompt = `
As an Amazon advertising optimization expert, analyze this advertising data and provide specific optimization suggestions:

Data Summary:
- Total Keywords: ${dataSummary.totalKeywords}
- Total Campaigns: ${dataSummary.totalCampaigns}
- Total Ad Groups: ${dataSummary.totalAdGroups}

Sample Keywords:
${JSON.stringify(dataSummary.sampleKeywords, null, 2)}

Please provide optimization suggestions focusing on:
1. Bid adjustments for keywords
2. Underperforming keywords to remove
3. Match type optimizations
4. Budget allocation improvements

Respond with a JSON array of suggestions in this format:
[
  {
    "type": "bid_increase",
    "reason": "High conversion rate, low impression share",
    "originalValue": 1.50,
    "suggestedValue": 2.25
  }
]
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Amazon advertising optimizer. Always provide consistent, actionable, data-driven optimization suggestions in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0, // Deterministic results
        seed: parseInt(seed.substring(0, 8), 16), // Consistent seed based on data
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    console.log("Raw AI response:", content);

    // Improved JSON parsing
    if (!content) {
      console.error("Empty response from OpenAI");
      return generateFallbackSuggestions(dataSummary);
    }

    try {
      // Try to find JSON array in the response
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          return suggestions;
        }
      }
      
      // If no valid JSON found, generate fallback suggestions
      console.warn("No valid JSON suggestions found in AI response");
      return generateFallbackSuggestions(dataSummary);
      
    } catch (parseError) {
      console.error("Error parsing AI suggestions:", parseError);
      return generateFallbackSuggestions(dataSummary);
    }

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
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
        const currentBid = parseFloat(keyword.bid || keyword.Bid || keyword['Max CPC'] || '1.00');
        
        switch (suggestion.type) {
          case 'bid_increase':
            if (currentBid < 2.0) { // Only increase low bids
              optimizedKeyword.bid = Math.max(currentBid * 1.3, currentBid + 0.25).toFixed(2);
              optimizedKeyword['Max CPC'] = optimizedKeyword.bid;
              optimizedKeyword.Bid = optimizedKeyword.bid;
            }
            break;
            
          case 'bid_decrease':
            if (currentBid > 2.5) { // Only decrease high bids
              optimizedKeyword.bid = Math.max(currentBid * 0.8, 0.25).toFixed(2);
              optimizedKeyword['Max CPC'] = optimizedKeyword.bid;
              optimizedKeyword.Bid = optimizedKeyword.bid;
            }
            break;
            
          case 'change_match_type':
            if (keyword.matchType === 'broad') {
              optimizedKeyword.matchType = 'phrase';
              optimizedKeyword['Match Type'] = 'phrase';
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
      
      // Deterministic optimization based on bid ranges
      const currentBid = parseFloat(keyword.bid || keyword.Bid || keyword['Max CPC'] || '1.00');
      
      // Increase bids for low bids (likely high performers)
      if (currentBid < 1.00) {
        optimizedKeyword.bid = (currentBid * 1.3).toFixed(2);
        optimizedKeyword['Max CPC'] = optimizedKeyword.bid;
        optimizedKeyword.Bid = optimizedKeyword.bid;
      }
      // Decrease high bids (likely underperformers)
      else if (currentBid > 3.00) {
        optimizedKeyword.bid = (currentBid * 0.8).toFixed(2);
        optimizedKeyword['Max CPC'] = optimizedKeyword.bid;
        optimizedKeyword.Bid = optimizedKeyword.bid;
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
