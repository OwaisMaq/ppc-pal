
import { AdvertisingData } from '@/pages/Index';

// Cache for storing optimization results
const optimizationCache = new Map<string, AdvertisingData>();

export const getCachedOptimization = (dataHash: string): AdvertisingData | null => {
  return optimizationCache.get(dataHash) || null;
};

export const setCachedOptimization = (dataHash: string, data: AdvertisingData): void => {
  optimizationCache.set(dataHash, data);
};

export const hasCachedOptimization = (dataHash: string): boolean => {
  return optimizationCache.has(dataHash);
};
