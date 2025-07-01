
import { AdvertisingData } from '@/types/common';

export const cache = {
  get: (key: string): AdvertisingData | null => {
    // Mock cache implementation
    return null;
  },
  
  set: (key: string, data: AdvertisingData): void => {
    // Mock cache implementation
    console.log('Cache set (mock):', key);
  },
  
  clear: (): void => {
    // Mock cache implementation
    console.log('Cache cleared (mock)');
  }
};
