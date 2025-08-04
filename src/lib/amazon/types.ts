
export interface AmazonConnection {
  id: string;
  user_id: string;
  profile_id: string; // Keep as string for now since DB stores it as string
  profile_name?: string;
  marketplace_id?: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  status: 'active' | 'expired' | 'error' | 'pending' | 'warning' | 'setup_required' | 'pending_approval' | 'rejected';
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  setup_required_reason?: string;
  advertising_api_endpoint?: string; // Add endpoint tracking
}

export interface Campaign {
  id: string;
  connection_id: string;
  amazon_campaign_id: string; // Keep as string for now since DB stores it as string
  name: string;
  campaign_type?: string;
  targeting_type?: string;
  product_type?: string;
  status: 'enabled' | 'paused' | 'archived';
  budget?: number;
  daily_budget?: number;
  start_date?: string;
  end_date?: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  // Enhanced 7-day attribution metrics
  impressions_7d?: number;
  clicks_7d?: number;
  spend_7d?: number;
  sales_7d?: number;
  orders_7d?: number;
  acos_7d?: number;
  roas_7d?: number;
  ctr_7d?: number;
  cpc_7d?: number;
  conversion_rate_7d?: number;
  // Enhanced 14-day attribution metrics
  impressions_14d?: number;
  clicks_14d?: number;
  spend_14d?: number;
  sales_14d?: number;
  orders_14d?: number;
  acos_14d?: number;
  roas_14d?: number;
  ctr_14d?: number;
  cpc_14d?: number;
  conversion_rate_14d?: number;
  last_updated?: string;
  created_at: string;
}

export interface AdGroup {
  id: string;
  campaign_id: string;
  amazon_adgroup_id: string; // Keep as string for now since DB stores it as string
  name: string;
  status: 'enabled' | 'paused' | 'archived';
  default_bid?: number;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  // Enhanced 7-day attribution metrics
  impressions_7d?: number;
  clicks_7d?: number;
  spend_7d?: number;
  sales_7d?: number;
  orders_7d?: number;
  acos_7d?: number;
  roas_7d?: number;
  ctr_7d?: number;
  cpc_7d?: number;
  conversion_rate_7d?: number;
  // Enhanced 14-day attribution metrics
  impressions_14d?: number;
  clicks_14d?: number;
  spend_14d?: number;
  sales_14d?: number;
  orders_14d?: number;
  acos_14d?: number;
  roas_14d?: number;
  ctr_14d?: number;
  cpc_14d?: number;
  conversion_rate_14d?: number;
  last_updated?: string;
  created_at: string;
}

export interface Keyword {
  id: string;
  adgroup_id: string;
  amazon_keyword_id: string; // Keep as string for now since DB stores it as string
  keyword_text: string;
  match_type: string;
  bid?: number;
  status: 'enabled' | 'paused' | 'archived';
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos?: number;
  roas?: number;
  ctr?: number;
  cpc?: number;
  conversion_rate?: number;
  // Enhanced 7-day attribution metrics
  impressions_7d?: number;
  clicks_7d?: number;
  spend_7d?: number;
  sales_7d?: number;
  orders_7d?: number;
  acos_7d?: number;
  roas_7d?: number;
  ctr_7d?: number;
  cpc_7d?: number;
  conversion_rate_7d?: number;
  // Enhanced 14-day attribution metrics
  impressions_14d?: number;
  clicks_14d?: number;
  spend_14d?: number;
  sales_14d?: number;
  orders_14d?: number;
  acos_14d?: number;
  roas_14d?: number;
  ctr_14d?: number;
  cpc_14d?: number;
  conversion_rate_14d?: number;
  last_updated?: string;
  created_at: string;
}

export interface OptimizationResult {
  id: string;
  user_id: string;
  connection_id: string;
  optimization_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  total_keywords_analyzed: number;
  total_recommendations: number;
  estimated_impact_spend?: number;
  estimated_impact_sales?: number;
  results_data?: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface OptimizationRecommendation {
  id: string;
  optimization_result_id: string;
  entity_type: 'keyword' | 'campaign' | 'adgroup';
  entity_id: string;
  recommendation_type: string;
  current_value?: string;
  recommended_value?: string;
  reasoning: string;
  impact_level: 'high' | 'medium' | 'low';
  estimated_impact?: number;
  applied: boolean;
  applied_at?: string;
  created_at: string;
}

// Amazon API specific types (what Amazon actually expects/returns)
export interface AmazonApiProfile {
  profileId: number;
  countryCode: string;
  currencyCode: string;
  dailyBudget?: number;
  timezone: string;
  accountInfo?: {
    marketplaceStringId: string;
    id: string;
    type: string;
    name?: string;
    validPaymentMethod: boolean;
  };
}

export interface AmazonApiCampaign {
  campaignId: number;
  name: string;
  campaignType: string;
  targetingType: string;
  state: string;
  dailyBudget?: number;
  startDate?: string;
  endDate?: string;
  premiumBidAdjustment?: boolean;
  portfolioId?: number;
  bidding?: {
    strategy: string;
    adjustments?: Array<{
      predicate: string;
      percentage: number;
    }>;
  };
}

export interface AmazonApiAdGroup {
  adGroupId: number;
  name: string;
  campaignId: number;
  defaultBid: number;
  state: string;
}

export interface AmazonApiKeyword {
  keywordId: number;
  adGroupId: number;
  campaignId: number;
  keywordText: string;
  matchType: string;
  state: string;
  bid?: number;
}

// Utility functions for type conversion
export const amazonApiUtils = {
  // Convert profile_id for API calls
  formatProfileId: (profileId: string): number => {
    const numericId = parseInt(profileId, 10);
    if (isNaN(numericId)) {
      throw new Error(`Invalid profile ID: ${profileId}`);
    }
    return numericId;
  },

  // Convert campaign ID for API calls
  formatCampaignId: (campaignId: string): number => {
    const numericId = parseInt(campaignId, 10);
    if (isNaN(numericId)) {
      throw new Error(`Invalid campaign ID: ${campaignId}`);
    }
    return numericId;
  },

  // Convert ad group ID for API calls
  formatAdGroupId: (adGroupId: string): number => {
    const numericId = parseInt(adGroupId, 10);
    if (isNaN(numericId)) {
      throw new Error(`Invalid ad group ID: ${adGroupId}`);
    }
    return numericId;
  },

  // Convert keyword ID for API calls
  formatKeywordId: (keywordId: string): number => {
    const numericId = parseInt(keywordId, 10);
    if (isNaN(numericId)) {
      throw new Error(`Invalid keyword ID: ${keywordId}`);
    }
    return numericId;
  },

  // Generate proper API headers for v3
  getApiHeaders: (accessToken: string, clientId: string, profileId: string) => ({
    'Authorization': `Bearer ${accessToken}`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Amazon-Advertising-API-Version': '3.0',
    'Content-Type': 'application/json'
  }),

  // Get regional endpoint based on marketplace
  getRegionalEndpoint: (marketplaceId?: string): string => {
    const marketplaceEndpoints: Record<string, string> = {
      // North America
      'ATVPDKIKX0DER': 'https://advertising-api.amazon.com', // US
      'A2EUQ1WTGCTBG2': 'https://advertising-api.amazon.ca', // Canada
      'A1AM78C64UM0Y8': 'https://advertising-api.amazon.com.mx', // Mexico
      
      // Europe
      'A1PA6795UKMFR9': 'https://advertising-api-eu.amazon.com', // Germany
      'A1RKKUPIHCS9HS': 'https://advertising-api-eu.amazon.com', // Spain
      'APJ6JRA9NG5V4': 'https://advertising-api-eu.amazon.com', // Italy
      'A1F83G8C2ARO7P': 'https://advertising-api-eu.amazon.com', // UK
      'A13V1IB3VIYZZH': 'https://advertising-api-eu.amazon.com', // France
      'A1805IZSGTT6HS': 'https://advertising-api-eu.amazon.com', // Netherlands
      'A2NODRKZP88ZB9': 'https://advertising-api-eu.amazon.com', // Sweden
      
      // Far East
      'A1VC38T7YXB528': 'https://advertising-api-fe.amazon.com', // Japan
      'AAHKV2X7AFYLW': 'https://advertising-api-fe.amazon.com',  // China
      'A39IBJ37TRP1C6': 'https://advertising-api-fe.amazon.com', // Australia
      'A2Q3Y263D00KWC': 'https://advertising-api-fe.amazon.com', // Brazil
      'A1MQXOICRS2Z7M': 'https://advertising-api-fe.amazon.com', // Canada (French)
      'A33AVAJ2PDY3EV': 'https://advertising-api-fe.amazon.com', // Turkey
      'AMEN7PMS3EDWL': 'https://advertising-api-fe.amazon.com'   // India
    };

    return marketplaceEndpoints[marketplaceId || ''] || 'https://advertising-api.amazon.com';
  }
};
