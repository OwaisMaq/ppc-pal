
import { AdvertisingData } from '@/pages/Index';
import { validateAndSanitizeData, generateDataHash } from './validation';
import { getCachedOptimization, setCachedOptimization, hasCachedOptimization } from './cache';
import { getOptimizationSuggestions } from './aiService';
import { applyOptimizationsPreservingStructure, applyDeterministicRuleBasedOptimizationPreservingStructure } from './optimizationEngine';

export const optimizeAdvertisingData = async (data: AdvertisingData): Promise<AdvertisingData> => {
  try {
    console.log("Starting AI optimization process...");
    
    // Validate and sanitize input data
    const sanitizedData = validateAndSanitizeData(data);
    
    // Check cache first for consistent results
    const dataHash = generateDataHash(sanitizedData);
    console.log("Data hash:", dataHash);
    
    if (hasCachedOptimization(dataHash)) {
      console.log("Returning cached optimization result");
      return getCachedOptimization(dataHash)!;
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

    // Apply optimizations based on AI suggestions while preserving exact structure
    const optimizedData = applyOptimizationsPreservingStructure(sanitizedData, suggestions);
    
    // Cache the result
    setCachedOptimization(dataHash, optimizedData);
    
    console.log("Optimizations applied successfully");
    return optimizedData;

  } catch (error) {
    console.error("AI optimization error:", error);
    
    // Fallback to deterministic rule-based optimization if AI fails
    console.log("Falling back to deterministic rule-based optimization...");
    const sanitizedData = validateAndSanitizeData(data);
    const dataHash = generateDataHash(sanitizedData);
    
    if (hasCachedOptimization(dataHash)) {
      console.log("Returning cached fallback result");
      return getCachedOptimization(dataHash)!;
    }
    
    const fallbackResult = applyDeterministicRuleBasedOptimizationPreservingStructure(sanitizedData);
    setCachedOptimization(dataHash, fallbackResult);
    return fallbackResult;
  }
};
