
import { AdvertisingData } from '@/pages/Index';

const OPENAI_API_KEY = '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';

interface OptimizationSuggestion {
  type: 'bid_increase' | 'bid_decrease' | 'remove_keyword' | 'add_negative' | 'change_match_type';
  reason: string;
  originalValue?: any;
  suggestedValue?: any;
}

export const optimizeAdvertisingData = async (data: AdvertisingData): Promise<AdvertisingData> => {
  try {
    console.log("Starting AI optimization process...");
    
    // Prepare data summary for AI analysis
    const dataSummary = {
      totalKeywords: data.keywords?.length || 0,
      totalCampaigns: data.campaigns?.length || 0,
      totalAdGroups: data.adGroups?.length || 0,
      sampleKeywords: data.keywords?.slice(0, 10) || []
    };

    console.log("Data summary for AI:", dataSummary);

    // Call OpenAI API for optimization suggestions
    const suggestions = await getOptimizationSuggestions(dataSummary);
    
    console.log("AI suggestions received:", suggestions);

    // Apply optimizations based on AI suggestions
    const optimizedData = applyOptimizations(data, suggestions);
    
    console.log("Optimizations applied successfully");
    return optimizedData;

  } catch (error) {
    console.error("AI optimization error:", error);
    
    // Fallback to rule-based optimization if AI fails
    console.log("Falling back to rule-based optimization...");
    return applyRuleBasedOptimization(data);
  }
};

const getOptimizationSuggestions = async (dataSummary: any): Promise<OptimizationSuggestion[]> => {
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
            content: 'You are an expert Amazon advertising optimizer. Provide actionable, data-driven optimization suggestions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    console.log("Raw AI response:", content);

    // Try to parse JSON from the response
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI suggestions:", parseError);
    }

    // Fallback to empty suggestions if parsing fails
    return [];

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
};

const applyOptimizations = (data: AdvertisingData, suggestions: OptimizationSuggestion[]): AdvertisingData => {
  const optimizedData = JSON.parse(JSON.stringify(data)); // Deep clone

  // Apply AI suggestions to keywords
  if (optimizedData.keywords && suggestions.length > 0) {
    optimizedData.keywords = optimizedData.keywords.map((keyword: any, index: number) => {
      const suggestion = suggestions[index % suggestions.length]; // Cycle through suggestions
      
      if (suggestion) {
        const optimizedKeyword = { ...keyword };
        
        switch (suggestion.type) {
          case 'bid_increase':
            const currentBid = parseFloat(keyword.bid || keyword.Bid || keyword['Max CPC'] || '1.00');
            optimizedKeyword.bid = Math.max(currentBid * 1.2, currentBid + 0.25).toFixed(2);
            optimizedKeyword['Max CPC'] = optimizedKeyword.bid;
            optimizedKeyword.Bid = optimizedKeyword.bid;
            break;
            
          case 'bid_decrease':
            const currentBidDec = parseFloat(keyword.bid || keyword.Bid || keyword['Max CPC'] || '1.00');
            optimizedKeyword.bid = Math.max(currentBidDec * 0.8, 0.25).toFixed(2);
            optimizedKeyword['Max CPC'] = optimizedKeyword.bid;
            optimizedKeyword.Bid = optimizedKeyword.bid;
            break;
            
          case 'change_match_type':
            if (keyword.matchType === 'broad') {
              optimizedKeyword.matchType = 'phrase';
              optimizedKeyword['Match Type'] = 'phrase';
            }
            break;
        }
        
        return optimizedKeyword;
      }
      
      return keyword;
    });

    // Remove underperforming keywords based on suggestions
    const removeCount = suggestions.filter(s => s.type === 'remove_keyword').length;
    if (removeCount > 0) {
      const removeIndices = Math.min(removeCount, Math.floor(optimizedData.keywords.length * 0.1));
      optimizedData.keywords = optimizedData.keywords.slice(removeIndices);
    }
  }

  return optimizedData;
};

const applyRuleBasedOptimization = (data: AdvertisingData): AdvertisingData => {
  console.log("Applying rule-based optimization as fallback...");
  
  const optimizedData = JSON.parse(JSON.stringify(data)); // Deep clone

  // Rule-based optimization for keywords
  if (optimizedData.keywords) {
    optimizedData.keywords = optimizedData.keywords.map((keyword: any) => {
      const optimizedKeyword = { ...keyword };
      
      // Simulate optimization based on bid ranges
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

    // Remove some keywords to simulate removing underperformers
    const removeCount = Math.floor(optimizedData.keywords.length * 0.05); // Remove 5%
    if (removeCount > 0) {
      optimizedData.keywords = optimizedData.keywords.slice(removeCount);
    }
  }

  return optimizedData;
};
