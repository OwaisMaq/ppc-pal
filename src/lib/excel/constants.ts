
import { EntityType, ProductType, CampaignType, MatchType } from './types';

// Amazon required headers for each entity type - comprehensive Amazon Partner API requirements
export const AMAZON_REQUIRED_HEADERS: Record<EntityType, string[]> = {
  keyword: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Max Bid', 'Keyword ID'
  ],
  campaign: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Campaign Budget', 'Campaign Budget Type', 'Campaign ID', 'Campaign Type'
  ],
  adgroup: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Ad Group Default Bid', 'Ad Group ID'
  ],
  portfolio: [
    'Product', 'Entity', 'Operation', 'Portfolio', 'Portfolio Budget', 'Portfolio Budget Type', 'Portfolio ID'
  ],
  product_targeting: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Target', 'Target Type', 'Bid', 'Target ID'
  ],
  asset_group: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Asset Group', 'Asset Group Default Bid', 'Asset Group ID'
  ],
  negative_keyword: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Keyword ID'
  ]
};

// Valid Amazon product types with enhanced support
export const AMAZON_PRODUCT_TYPES: Record<string, ProductType> = {
  'Sponsored Products': 'Sponsored Products',
  'Sponsored Brands': 'Sponsored Brands', 
  'Sponsored Display': 'Sponsored Display'
};

// Valid Amazon campaign types
export const AMAZON_CAMPAIGN_TYPES: Record<string, CampaignType> = {
  'Automatic': 'Automatic',
  'Manual': 'Manual',
  'Video': 'Video',
  'Audio': 'Audio',
  'Custom': 'Custom'
};

// Valid match types including negative variations
export const AMAZON_MATCH_TYPES: Record<string, MatchType> = {
  'broad': 'broad',
  'phrase': 'phrase',
  'exact': 'exact',
  'negative broad': 'negative_broad',
  'negative phrase': 'negative_phrase',
  'negative exact': 'negative_exact'
};

// Performance thresholds for optimization decisions
export const PERFORMANCE_THRESHOLDS = {
  HIGH_ACOS: 50, // ACOS above 50% considered high
  LOW_CTR: 0.5, // CTR below 0.5% considered low
  HIGH_CPC: 3.0, // CPC above $3 considered high
  LOW_CONVERSION_RATE: 5, // Conversion rate below 5% considered low
  MIN_IMPRESSIONS: 1000, // Minimum impressions for statistical significance
  MIN_CLICKS: 10, // Minimum clicks for statistical significance
  TARGET_ROAS: 3.0, // Target ROAS of 3.0
  PROFITABLE_ACOS: 25 // ACOS below 25% considered profitable
};
