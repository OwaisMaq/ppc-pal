
import { AdvertisingData } from '@/pages/Index';
import { OptimizationSuggestion } from './aiService';

export const applyOptimizationsPreservingStructure = (data: AdvertisingData, suggestions: OptimizationSuggestion[]): AdvertisingData => {
  const optimizedData = JSON.parse(JSON.stringify(data)); // Deep clone to preserve all original structure

  // Apply AI suggestions to keywords deterministically while preserving all columns
  if (optimizedData.keywords && suggestions.length > 0) {
    optimizedData.keywords = optimizedData.keywords.map((keyword: any, index: number) => {
      const optimizedKeyword = { ...keyword }; // Preserve all original fields
      
      // Apply suggestions in a deterministic pattern
      for (const suggestion of suggestions) {
        // Get current bid using multiple possible field names
        const currentBid = parseFloat(
          keyword.Bid || keyword.bid || keyword['Max CPC'] || keyword['Max Bid'] || 
          keyword['Suggested Bid'] || keyword.cpc || keyword.CPC || '1.00'
        );
        
        // Validate bid value to prevent injection
        if (isNaN(currentBid) || currentBid < 0 || currentBid > 100) {
          continue; // Skip invalid bids
        }
        
        switch (suggestion.type) {
          case 'bid_increase':
            if (currentBid < 2.0) { // Only increase low bids
              const newBid = Math.max(currentBid * 1.3, currentBid + 0.25).toFixed(2);
              // Update all possible bid field names that exist in the original data
              if (keyword.Bid !== undefined) optimizedKeyword.Bid = newBid;
              if (keyword.bid !== undefined) optimizedKeyword.bid = newBid;
              if (keyword['Max CPC'] !== undefined) optimizedKeyword['Max CPC'] = newBid;
              if (keyword['Max Bid'] !== undefined) optimizedKeyword['Max Bid'] = newBid;
              if (keyword['Suggested Bid'] !== undefined) optimizedKeyword['Suggested Bid'] = newBid;
              if (keyword.cpc !== undefined) optimizedKeyword.cpc = newBid;
              if (keyword.CPC !== undefined) optimizedKeyword.CPC = newBid;
            }
            break;
            
          case 'bid_decrease':
            if (currentBid > 2.5) { // Only decrease high bids
              const newBid = Math.max(currentBid * 0.8, 0.25).toFixed(2);
              // Update all possible bid field names that exist in the original data
              if (keyword.Bid !== undefined) optimizedKeyword.Bid = newBid;
              if (keyword.bid !== undefined) optimizedKeyword.bid = newBid;
              if (keyword['Max CPC'] !== undefined) optimizedKeyword['Max CPC'] = newBid;
              if (keyword['Max Bid'] !== undefined) optimizedKeyword['Max Bid'] = newBid;
              if (keyword['Suggested Bid'] !== undefined) optimizedKeyword['Suggested Bid'] = newBid;
              if (keyword.cpc !== undefined) optimizedKeyword.cpc = newBid;
              if (keyword.CPC !== undefined) optimizedKeyword.CPC = newBid;
            }
            break;
            
          case 'change_match_type':
            // Update all possible match type field names that exist in the original data
            if (keyword['Match type'] === 'broad' || keyword['Match Type'] === 'broad' || keyword.matchType === 'broad') {
              if (keyword['Match type'] !== undefined) optimizedKeyword['Match type'] = 'phrase';
              if (keyword['Match Type'] !== undefined) optimizedKeyword['Match Type'] = 'phrase';
              if (keyword.matchType !== undefined) optimizedKeyword.matchType = 'phrase';
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

  // Preserve all other data arrays exactly as they were
  return optimizedData;
};

export const applyDeterministicRuleBasedOptimizationPreservingStructure = (data: AdvertisingData): AdvertisingData => {
  console.log("Applying deterministic rule-based optimization as fallback...");
  
  const optimizedData = JSON.parse(JSON.stringify(data)); // Deep clone to preserve all structure

  // Deterministic rule-based optimization for keywords while preserving all columns
  if (optimizedData.keywords) {
    optimizedData.keywords = optimizedData.keywords.map((keyword: any) => {
      const optimizedKeyword = { ...keyword }; // Preserve all original fields
      
      // Deterministic optimization based on bid ranges using all possible field names
      const currentBid = parseFloat(
        keyword.Bid || keyword.bid || keyword['Max CPC'] || keyword['Max Bid'] || 
        keyword['Suggested Bid'] || keyword.cpc || keyword.CPC || '1.00'
      );
      
      // Validate bid value
      if (isNaN(currentBid) || currentBid < 0 || currentBid > 100) {
        return optimizedKeyword; // Skip invalid bids
      }
      
      // Increase bids for low bids (likely high performers)
      if (currentBid < 1.00) {
        const newBid = (currentBid * 1.3).toFixed(2);
        // Update all possible bid field names that exist in the original data
        if (keyword.Bid !== undefined) optimizedKeyword.Bid = newBid;
        if (keyword.bid !== undefined) optimizedKeyword.bid = newBid;
        if (keyword['Max CPC'] !== undefined) optimizedKeyword['Max CPC'] = newBid;
        if (keyword['Max Bid'] !== undefined) optimizedKeyword['Max Bid'] = newBid;
        if (keyword['Suggested Bid'] !== undefined) optimizedKeyword['Suggested Bid'] = newBid;
        if (keyword.cpc !== undefined) optimizedKeyword.cpc = newBid;
        if (keyword.CPC !== undefined) optimizedKeyword.CPC = newBid;
      }
      // Decrease high bids (likely underperformers)
      else if (currentBid > 3.00) {
        const newBid = (currentBid * 0.8).toFixed(2);
        // Update all possible bid field names that exist in the original data
        if (keyword.Bid !== undefined) optimizedKeyword.Bid = newBid;
        if (keyword.bid !== undefined) optimizedKeyword.bid = newBid;
        if (keyword['Max CPC'] !== undefined) optimizedKeyword['Max CPC'] = newBid;
        if (keyword['Max Bid'] !== undefined) optimizedKeyword['Max Bid'] = newBid;
        if (keyword['Suggested Bid'] !== undefined) optimizedKeyword['Suggested Bid'] = newBid;
        if (keyword.cpc !== undefined) optimizedKeyword.cpc = newBid;
        if (keyword.CPC !== undefined) optimizedKeyword.CPC = newBid;
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
