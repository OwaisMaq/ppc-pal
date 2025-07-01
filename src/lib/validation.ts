
import { z } from 'zod';
import { AdvertisingData } from '@/types/common';

export const advertisingDataSchema = z.object({
  campaigns: z.array(z.any()),
  keywords: z.array(z.any()),
  adGroups: z.array(z.any()),
  connections: z.array(z.any())
});

export const validateAdvertisingData = (data: unknown): AdvertisingData => {
  const result = advertisingDataSchema.safeParse(data);
  
  if (!result.success) {
    throw new Error('Invalid advertising data format');
  }
  
  return result.data;
};
