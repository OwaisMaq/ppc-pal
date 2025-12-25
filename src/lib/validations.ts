import { z } from 'zod';

// Keyword validation schemas
export const keywordSchema = z.object({
  text: z.string()
    .min(1, 'Keyword cannot be empty')
    .max(80, 'Keyword too long (max 80 chars)'),
  matchType: z.enum(['exact', 'phrase', 'broad', 'modified_broad']),
  bid: z.number().positive().optional(),
  finalUrl: z.string().url().optional(),
});

// Ad copy validation - Google Ads character limits
export const adCopySchema = z.object({
  headlines: z.array(
    z.string().min(1, 'Headline required').max(30, 'Headline too long (max 30 chars)')
  ).min(3, 'At least 3 headlines required').max(15),
  descriptions: z.array(
    z.string().min(1, 'Description required').max(90, 'Description too long (max 90 chars)')
  ).min(2, 'At least 2 descriptions required').max(4),
  finalUrl: z.string().url('Must be a valid URL'),
  path1: z.string().max(15, 'Path too long (max 15 chars)').optional(),
  path2: z.string().max(15, 'Path too long (max 15 chars)').optional(),
});

// Campaign validation
export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name required').max(255),
  type: z.enum(['Search', 'Display', 'Shopping', 'Video']),
  budget: z.number().positive('Budget must be positive'),
  biddingStrategy: z.enum([
    'Manual CPC',
    'Target CPA',
    'Target ROAS',
    'Maximize Clicks',
    'Maximize Conversions'
  ]),
  locations: z.array(z.string()).min(1, 'Select at least one location'),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
});

// Search term validation
export const searchTermSchema = z.object({
  searchTerm: z.string().min(1, 'Search term required').max(255),
  action: z.enum(['add_keyword', 'add_negative', 'ignore']),
});

// ASIN validation (Amazon format)
export const asinSchema = z.string().regex(
  /^B[A-Z0-9]{9}$/,
  'Invalid ASIN format (should be B followed by 9 alphanumeric characters)'
);

// Budget validation
export const budgetSchema = z.object({
  amount: z.number().positive('Budget must be positive').max(1000000, 'Budget too large'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).default('USD'),
});

// Bid validation (in dollars/currency units)
export const bidSchema = z.number()
  .positive('Bid must be positive')
  .max(1000, 'Bid too high');

// Validate keywords in bulk
export const validateKeywordsBulk = (keywords: string[]): {
  valid: string[];
  errors: { index: number; error: string }[];
} => {
  const errors: { index: number; error: string }[] = [];
  const valid: string[] = [];
  
  keywords.forEach((keyword, index) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      errors.push({ index, error: 'Keyword cannot be empty' });
      return;
    }
    if (trimmed.length > 80) {
      errors.push({ index, error: 'Keyword too long (max 80 chars)' });
      return;
    }
    valid.push(trimmed);
  });
  
  return { valid, errors };
};

// Validate ad headlines
export const validateHeadlines = (headlines: string[]): {
  valid: string[];
  errors: { index: number; error: string }[];
} => {
  const errors: { index: number; error: string }[] = [];
  const valid: string[] = [];
  
  headlines.forEach((headline, index) => {
    const trimmed = headline.trim();
    if (!trimmed) {
      errors.push({ index, error: 'Headline cannot be empty' });
      return;
    }
    if (trimmed.length > 30) {
      errors.push({ index, error: `Headline too long (${trimmed.length}/30 chars)` });
      return;
    }
    valid.push(trimmed);
  });
  
  return { valid, errors };
};

// Validate ad descriptions
export const validateDescriptions = (descriptions: string[]): {
  valid: string[];
  errors: { index: number; error: string }[];
} => {
  const errors: { index: number; error: string }[] = [];
  const valid: string[] = [];
  
  descriptions.forEach((description, index) => {
    const trimmed = description.trim();
    if (!trimmed) {
      errors.push({ index, error: 'Description cannot be empty' });
      return;
    }
    if (trimmed.length > 90) {
      errors.push({ index, error: `Description too long (${trimmed.length}/90 chars)` });
      return;
    }
    valid.push(trimmed);
  });
  
  return { valid, errors };
};

// URL validation helper
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Export types
export type KeywordInput = z.infer<typeof keywordSchema>;
export type AdCopyInput = z.infer<typeof adCopySchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type SearchTermInput = z.infer<typeof searchTermSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
