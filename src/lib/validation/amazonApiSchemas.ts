
import { z } from 'zod';

// Amazon Profile Schema
export const amazonProfileSchema = z.object({
  profileId: z.number(),
  countryCode: z.string().min(2).max(2),
  currencyCode: z.string().min(3).max(3),
  dailyBudget: z.number().min(0).optional(),
  timezone: z.string().optional(),
  accountInfo: z.object({
    marketplaceStringId: z.string().optional(),
    id: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    subType: z.string().optional(),
    validPaymentMethod: z.boolean().optional()
  }).optional()
});

// Campaign Schema
export const amazonCampaignSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  campaignType: z.enum(['sponsoredProducts', 'sponsoredBrands', 'sponsoredDisplay']),
  targetingType: z.enum(['manual', 'auto']).optional(),
  state: z.enum(['enabled', 'paused', 'archived']),
  dailyBudget: z.number().min(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  premiumBidAdjustment: z.boolean().optional(),
  portfolioId: z.string().optional()
});

// Ad Group Schema
export const amazonAdGroupSchema = z.object({
  adGroupId: z.string(),
  name: z.string(),
  campaignId: z.string(),
  defaultBid: z.number().min(0),
  state: z.enum(['enabled', 'paused', 'archived'])
});

// Keyword Schema
export const amazonKeywordSchema = z.object({
  keywordId: z.string(),
  adGroupId: z.string(),
  campaignId: z.string(),
  keywordText: z.string(),
  matchType: z.enum(['exact', 'phrase', 'broad']),
  state: z.enum(['enabled', 'paused', 'archived']),
  bid: z.number().min(0)
});

// Metrics Schema
export const amazonMetricsSchema = z.object({
  impressions: z.number().min(0).default(0),
  clicks: z.number().min(0).default(0),
  cost: z.number().min(0).default(0),
  sales: z.number().min(0).default(0),
  orders: z.number().min(0).default(0),
  units: z.number().min(0).default(0),
  ctr: z.number().min(0).max(100).optional(),
  cpc: z.number().min(0).optional(),
  acos: z.number().min(0).optional(),
  roas: z.number().min(0).optional()
});

// API Response Schemas
export const amazonProfilesResponseSchema = z.array(amazonProfileSchema);

export const amazonCampaignsResponseSchema = z.array(amazonCampaignSchema);

export const amazonReportResponseSchema = z.object({
  reportId: z.string(),
  status: z.enum(['IN_PROGRESS', 'SUCCESS', 'FAILURE']),
  statusDetails: z.string().optional(),
  location: z.string().optional(),
  fileSize: z.number().optional()
});

// Sync Response Schema
export const syncResponseSchema = z.object({
  success: z.boolean(),
  profilesFound: z.number().min(0).optional(),
  campaignCount: z.number().min(0).optional(),
  campaigns_synced: z.number().min(0).optional(),
  error: z.string().optional(),
  details: z.string().optional(),
  warning: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  requiresReconnection: z.boolean().optional(),
  requiresSetup: z.boolean().optional(),
  errorType: z.string().optional()
});

// Connection Form Schema
export const amazonConnectionFormSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  profileName: z.string().optional(),
  marketplaceId: z.string().optional(),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
  tokenExpiresAt: z.string().datetime('Invalid expiration date')
});

// Validation helpers
export const validateAmazonProfiles = (data: unknown) => {
  return amazonProfilesResponseSchema.safeParse(data);
};

export const validateAmazonCampaigns = (data: unknown) => {
  return amazonCampaignsResponseSchema.safeParse(data);
};

export const validateSyncResponse = (data: unknown) => {
  return syncResponseSchema.safeParse(data);
};

export const validateConnectionForm = (data: unknown) => {
  return amazonConnectionFormSchema.safeParse(data);
};

// Type exports
export type AmazonProfile = z.infer<typeof amazonProfileSchema>;
export type AmazonCampaign = z.infer<typeof amazonCampaignSchema>;
export type AmazonAdGroup = z.infer<typeof amazonAdGroupSchema>;
export type AmazonKeyword = z.infer<typeof amazonKeywordSchema>;
export type AmazonMetrics = z.infer<typeof amazonMetricsSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;
export type ConnectionFormData = z.infer<typeof amazonConnectionFormSchema>;
