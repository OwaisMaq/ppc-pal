
import { z } from 'zod';

// Base response schema
export const BaseResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  details: z.string().optional(),
  timestamp: z.string().optional()
});

// Sync response specific schema
export const SyncResponseSchema = BaseResponseSchema.extend({
  campaignCount: z.number().optional(),
  campaigns_synced: z.number().optional(),
  profilesFound: z.number().optional(),
  profiles_found: z.number().optional(),
  requiresSetup: z.boolean().optional(),
  requiresReconnection: z.boolean().optional(),
  connectionId: z.string().optional(),
  message: z.string().optional()
});

// OAuth response schema
export const OAuthResponseSchema = BaseResponseSchema.extend({
  authUrl: z.string().url().optional(),
  profile_count: z.number().optional(),
  connection_id: z.string().optional(),
  status: z.enum(['active', 'setup_required', 'error', 'pending']).optional()
});

// Profile response schema
export const ProfileResponseSchema = BaseResponseSchema.extend({
  profiles: z.array(z.object({
    profileId: z.string(),
    countryCode: z.string().optional(),
    accountInfo: z.object({
      marketplaceStringId: z.string().optional()
    }).optional()
  })).optional(),
  profileCount: z.number().optional()
});

// Export types
export type SyncResponse = z.infer<typeof SyncResponseSchema>;
export type OAuthResponse = z.infer<typeof OAuthResponseSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;

// Validation result types
type ValidationSuccess<T> = { success: true; data: T };
type ValidationFailure = { success: false; error: z.ZodError };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// Validation functions
export function validateSyncResponse(data: unknown): ValidationResult<SyncResponse> {
  try {
    const validated = SyncResponseSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

export function validateOAuthResponse(data: unknown): ValidationResult<OAuthResponse> {
  try {
    const validated = OAuthResponseSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

export function validateProfileResponse(data: unknown): ValidationResult<ProfileResponse> {
  try {
    const validated = ProfileResponseSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}
