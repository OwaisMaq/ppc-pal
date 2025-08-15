import { useAmazonData } from './useAmazonData';
import { addLegacyFieldsToArray } from '@/lib/amazon/compatibilityLayer';

/**
 * Enhanced hook that provides Amazon data with legacy field compatibility
 */
export const useAmazonDataWithCompatibility = () => {
  const amazonData = useAmazonData();
  
  return {
    ...amazonData,
    // Add legacy field aliases for backward compatibility
    campaigns: addLegacyFieldsToArray(amazonData.campaigns),
    adGroups: addLegacyFieldsToArray(amazonData.adGroups),
    keywords: addLegacyFieldsToArray(amazonData.keywords),
    targets: addLegacyFieldsToArray(amazonData.targets),
  };
};