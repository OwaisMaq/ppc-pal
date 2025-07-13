
import { AdvertisingData } from '@/pages/Index';

// Input validation and sanitization
export const validateAndSanitizeData = (data: AdvertisingData): AdvertisingData => {
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
export const generateDataHash = (data: AdvertisingData): string => {
  const keyData = {
    keywordCount: data.keywords?.length || 0,
    campaignCount: data.campaigns?.length || 0,
    firstKeywords: data.keywords?.slice(0, 5) || []
  };
  return btoa(JSON.stringify(keyData)).substring(0, 16);
};
