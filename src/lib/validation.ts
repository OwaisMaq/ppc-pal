import { z } from 'zod';
import { AdvertisingData } from '@/types/common';

// Re-export all validation schemas and functions
export * from './validation/amazonApiSchemas';
export * from './validation/formSchemas';

// Keep existing schemas for backward compatibility
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

// Enhanced validation with better error messages
export const validateWithContext = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new Error(`${context}: ${firstError.message} at ${firstError.path.join('.')}`);
    }
    throw error;
  }
};
