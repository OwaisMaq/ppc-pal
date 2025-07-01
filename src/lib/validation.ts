
import { z } from 'zod';
import { AdvertisingData } from '@/types/common';

export const advertisingDataSchema = z.object({
  campaigns: z.array(z.any()).default([]),
  keywords: z.array(z.any()).default([]),
  adGroups: z.array(z.any()).default([]),
  connections: z.array(z.any()).default([])
});

export const validateAdvertisingData = (data: unknown): AdvertisingData => {
  const result = advertisingDataSchema.safeParse(data);
  
  if (!result.success) {
    throw new Error('Invalid advertising data format');
  }
  
  return {
    campaigns: result.data.campaigns || [],
    keywords: result.data.keywords || [],
    adGroups: result.data.adGroups || [],
    connections: result.data.connections || []
  };
};
