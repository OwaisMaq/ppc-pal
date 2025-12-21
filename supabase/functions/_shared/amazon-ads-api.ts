/**
 * Amazon Advertising API Client
 * Shared module for making authenticated requests to Amazon Ads API
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// API Endpoints by region
const API_ENDPOINTS: Record<string, string> = {
  'NA': 'https://advertising-api.amazon.com',
  'EU': 'https://advertising-api-eu.amazon.com',
  'FE': 'https://advertising-api-fe.amazon.com',
};

// Rate limiting configuration
const RATE_LIMIT_DELAY_MS = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface AmazonApiConfig {
  profileId: string;
  clientId: string;
  accessToken: string;
  region?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  requestId?: string;
}

// Request/Response types for Amazon Ads API
export interface CampaignUpdateRequest {
  campaignId: string;
  state?: 'enabled' | 'paused' | 'archived';
  dailyBudget?: number;
  name?: string;
}

export interface KeywordCreateRequest {
  adGroupId: string;
  keywordText: string;
  matchType: 'broad' | 'phrase' | 'exact';
  bid?: number;
  state?: 'enabled' | 'paused';
}

export interface NegativeKeywordCreateRequest {
  campaignId?: string;
  adGroupId?: string;
  keywordText: string;
  matchType: 'negativeExact' | 'negativePhrase';
}

export interface TargetBidUpdateRequest {
  targetId: string;
  bid: number;
}

export interface KeywordBidUpdateRequest {
  keywordId: string;
  bid: number;
}

export interface PlacementAdjustmentRequest {
  campaignId: string;
  placementTop?: number;
  placementProductPage?: number;
}

export interface AmazonApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Amazon Advertising API Client
 */
export class AmazonAdsApiClient {
  private config: AmazonApiConfig;
  private baseUrl: string;

  constructor(config: AmazonApiConfig) {
    this.config = config;
    this.baseUrl = API_ENDPOINTS[config.region || 'EU'] || API_ENDPOINTS['EU'];
  }

  /**
   * Get default headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Amazon-Advertising-API-ClientId': this.config.clientId,
      'Amazon-Advertising-API-Scope': this.config.profileId,
      'Content-Type': 'application/vnd.spCampaign.v3+json',
      'Accept': 'application/vnd.spCampaign.v3+json',
    };
  }

  /**
   * Make an authenticated request to Amazon Ads API with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any,
    customHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers = { ...this.getHeaders(), ...customHeaders };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Amazon API] ${method} ${path} (attempt ${attempt}/${MAX_RETRIES})`);
        
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        const requestId = response.headers.get('x-amz-request-id') || undefined;

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
          console.log(`[Amazon API] Rate limited. Waiting ${retryAfter}s before retry...`);
          await this.delay(retryAfter * 1000);
          continue;
        }

        // Handle server errors with retry
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          console.log(`[Amazon API] Server error ${response.status}. Retrying in ${RETRY_DELAY_MS * attempt}ms...`);
          await this.delay(RETRY_DELAY_MS * attempt);
          continue;
        }

        // Parse response
        let data: any;
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          console.error(`[Amazon API] Error response:`, data);
          return {
            success: false,
            error: this.parseError(data),
            statusCode: response.status,
            requestId,
          };
        }

        // Apply rate limit delay between successful requests
        await this.delay(RATE_LIMIT_DELAY_MS);

        return {
          success: true,
          data,
          statusCode: response.status,
          requestId,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Amazon API] Request failed (attempt ${attempt}):`, lastError.message);
        
        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS * attempt);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed after max retries',
    };
  }

  /**
   * Parse Amazon API error response
   */
  private parseError(data: any): string {
    if (typeof data === 'string') return data;
    if (data?.message) return data.message;
    if (data?.errors && Array.isArray(data.errors)) {
      return data.errors.map((e: any) => e.message || e.errorType).join('; ');
    }
    if (data?.code) return `${data.code}: ${data.details || 'Unknown error'}`;
    return JSON.stringify(data);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== CAMPAIGN OPERATIONS ==========

  /**
   * Update campaign state (pause, enable, archive)
   */
  async updateCampaignState(campaignId: string, state: 'enabled' | 'paused' | 'archived'): Promise<ApiResponse> {
    return this.request('PUT', '/sp/campaigns', {
      campaigns: [{
        campaignId,
        state,
      }]
    });
  }

  /**
   * Update campaign budget
   */
  async updateCampaignBudget(campaignId: string, dailyBudget: number): Promise<ApiResponse> {
    return this.request('PUT', '/sp/campaigns', {
      campaigns: [{
        campaignId,
        budget: {
          budget: dailyBudget,
          budgetType: 'DAILY',
        }
      }]
    });
  }

  /**
   * Update campaign bidding strategy and placement adjustments
   */
  async updateCampaignBidding(
    campaignId: string, 
    bidding: {
      strategy?: 'LEGACY_FOR_SALES' | 'AUTO_FOR_SALES' | 'MANUAL' | 'RULE_BASED';
      adjustments?: Array<{
        predicate: 'PLACEMENT_TOP' | 'PLACEMENT_PRODUCT_PAGE';
        percentage: number;
      }>;
    }
  ): Promise<ApiResponse> {
    const campaignUpdate: any = { campaignId };
    
    if (bidding.strategy) {
      campaignUpdate.dynamicBidding = {
        strategy: bidding.strategy,
      };
    }
    
    if (bidding.adjustments) {
      campaignUpdate.dynamicBidding = {
        ...campaignUpdate.dynamicBidding,
        placementBidding: bidding.adjustments,
      };
    }

    return this.request('PUT', '/sp/campaigns', {
      campaigns: [campaignUpdate]
    });
  }

  // ========== KEYWORD OPERATIONS ==========

  /**
   * Create a new keyword
   */
  async createKeyword(request: KeywordCreateRequest): Promise<ApiResponse> {
    const keyword: any = {
      adGroupId: request.adGroupId,
      keywordText: request.keywordText,
      matchType: request.matchType.toUpperCase(),
      state: request.state || 'enabled',
    };
    
    if (request.bid) {
      keyword.bid = request.bid;
    }

    return this.request('POST', '/sp/keywords', {
      keywords: [keyword]
    }, {
      'Content-Type': 'application/vnd.spKeyword.v3+json',
      'Accept': 'application/vnd.spKeyword.v3+json',
    });
  }

  /**
   * Update keyword bid
   */
  async updateKeywordBid(keywordId: string, bid: number): Promise<ApiResponse> {
    return this.request('PUT', '/sp/keywords', {
      keywords: [{
        keywordId,
        bid,
      }]
    }, {
      'Content-Type': 'application/vnd.spKeyword.v3+json',
      'Accept': 'application/vnd.spKeyword.v3+json',
    });
  }

  /**
   * Update keyword state
   */
  async updateKeywordState(keywordId: string, state: 'enabled' | 'paused' | 'archived'): Promise<ApiResponse> {
    return this.request('PUT', '/sp/keywords', {
      keywords: [{
        keywordId,
        state,
      }]
    }, {
      'Content-Type': 'application/vnd.spKeyword.v3+json',
      'Accept': 'application/vnd.spKeyword.v3+json',
    });
  }

  // ========== NEGATIVE KEYWORD OPERATIONS ==========

  /**
   * Create campaign negative keyword
   */
  async createCampaignNegativeKeyword(campaignId: string, keywordText: string, matchType: 'negativeExact' | 'negativePhrase'): Promise<ApiResponse> {
    return this.request('POST', '/sp/campaignNegativeKeywords', {
      campaignNegativeKeywords: [{
        campaignId,
        keywordText,
        matchType: matchType.toUpperCase().replace('NEGATIVE', 'NEGATIVE_'),
        state: 'enabled',
      }]
    }, {
      'Content-Type': 'application/vnd.spCampaignNegativeKeyword.v3+json',
      'Accept': 'application/vnd.spCampaignNegativeKeyword.v3+json',
    });
  }

  /**
   * Create ad group negative keyword
   */
  async createAdGroupNegativeKeyword(
    campaignId: string, 
    adGroupId: string, 
    keywordText: string, 
    matchType: 'negativeExact' | 'negativePhrase'
  ): Promise<ApiResponse> {
    return this.request('POST', '/sp/negativeKeywords', {
      negativeKeywords: [{
        campaignId,
        adGroupId,
        keywordText,
        matchType: matchType.toUpperCase().replace('NEGATIVE', 'NEGATIVE_'),
        state: 'enabled',
      }]
    }, {
      'Content-Type': 'application/vnd.spNegativeKeyword.v3+json',
      'Accept': 'application/vnd.spNegativeKeyword.v3+json',
    });
  }

  // ========== TARGET OPERATIONS ==========

  /**
   * Update target bid
   */
  async updateTargetBid(targetId: string, bid: number): Promise<ApiResponse> {
    return this.request('PUT', '/sp/targets', {
      targets: [{
        targetId,
        bid,
      }]
    }, {
      'Content-Type': 'application/vnd.spTargetingClause.v3+json',
      'Accept': 'application/vnd.spTargetingClause.v3+json',
    });
  }

  /**
   * Update target state
   */
  async updateTargetState(targetId: string, state: 'enabled' | 'paused' | 'archived'): Promise<ApiResponse> {
    return this.request('PUT', '/sp/targets', {
      targets: [{
        targetId,
        state,
      }]
    }, {
      'Content-Type': 'application/vnd.spTargetingClause.v3+json',
      'Accept': 'application/vnd.spTargetingClause.v3+json',
    });
  }

  // ========== AD GROUP OPERATIONS ==========

  /**
   * Update ad group state
   */
  async updateAdGroupState(adGroupId: string, state: 'enabled' | 'paused' | 'archived'): Promise<ApiResponse> {
    return this.request('PUT', '/sp/adGroups', {
      adGroups: [{
        adGroupId,
        state,
      }]
    }, {
      'Content-Type': 'application/vnd.spAdGroup.v3+json',
      'Accept': 'application/vnd.spAdGroup.v3+json',
    });
  }

  /**
   * Update ad group default bid
   */
  async updateAdGroupBid(adGroupId: string, defaultBid: number): Promise<ApiResponse> {
    return this.request('PUT', '/sp/adGroups', {
      adGroups: [{
        adGroupId,
        defaultBid,
      }]
    }, {
      'Content-Type': 'application/vnd.spAdGroup.v3+json',
      'Accept': 'application/vnd.spAdGroup.v3+json',
    });
  }
}

/**
 * Helper function to get Amazon tokens from database
 */
export async function getAmazonTokens(
  supabase: SupabaseClient,
  profileId: string,
  encryptionKey: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: string } | null> {
  const { data: tokensArray, error } = await supabase.rpc('get_tokens_with_key', {
    p_profile_id: profileId,
    p_encryption_key: encryptionKey,
  });

  if (error || !tokensArray?.[0]) {
    console.error('[Amazon API] Failed to get tokens:', error);
    return null;
  }

  const tokens = tokensArray[0];
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_at,
  };
}

/**
 * Helper function to refresh token if expired
 */
export async function ensureValidToken(
  supabase: SupabaseClient,
  profileId: string,
  encryptionKey: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const tokens = await getAmazonTokens(supabase, profileId, encryptionKey);
  
  if (!tokens) {
    console.error('[Amazon API] No tokens found for profile:', profileId);
    return null;
  }

  // Check if token is expired or will expire in next 5 minutes
  const expiresAt = new Date(tokens.expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    // Token is still valid
    return tokens.accessToken;
  }

  console.log('[Amazon API] Token expired or expiring soon, refreshing...');

  // Refresh the token
  const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text();
    console.error('[Amazon API] Token refresh failed:', errorText);
    return null;
  }

  const tokenData = await refreshResponse.json();
  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

  // Get connection to find user_id
  const { data: connection } = await supabase
    .from('amazon_connections')
    .select('user_id, id')
    .eq('profile_id', profileId)
    .single();

  if (!connection) {
    console.error('[Amazon API] Connection not found for profile:', profileId);
    return null;
  }

  // Store the new tokens
  const { error: storeError } = await supabase.rpc('store_tokens_with_key', {
    p_user_id: connection.user_id,
    p_profile_id: profileId,
    p_access_token: tokenData.access_token,
    p_refresh_token: tokenData.refresh_token || tokens.refreshToken,
    p_expires_at: newExpiresAt.toISOString(),
    p_encryption_key: encryptionKey,
  });

  if (storeError) {
    console.error('[Amazon API] Failed to store refreshed tokens:', storeError);
    return null;
  }

  // Update connection status
  await supabase
    .from('amazon_connections')
    .update({
      token_expires_at: newExpiresAt.toISOString(),
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);

  console.log('[Amazon API] Token refreshed successfully');
  return tokenData.access_token;
}

/**
 * Determine API region from connection/marketplace
 */
export function getRegionFromMarketplace(marketplaceId: string | null): string {
  if (!marketplaceId) return 'EU';
  
  // NA marketplaces
  const naMarketplaces = ['ATVPDKIKX0DER', 'A2EUQ1WTGCTBG2', 'A1AM78C64UM0Y8'];
  // FE marketplaces  
  const feMarketplaces = ['A1VC38T7YXB528', 'A39IBJ37TRP1C6', 'A19VAU5U5O7RUS'];
  
  if (naMarketplaces.includes(marketplaceId)) return 'NA';
  if (feMarketplaces.includes(marketplaceId)) return 'FE';
  return 'EU';
}

/**
 * Create an Amazon Ads API client with automatic token management
 */
export async function createAmazonAdsClient(
  supabase: SupabaseClient,
  profileId: string
): Promise<AmazonAdsApiClient | null> {
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');

  if (!clientId || !clientSecret || !encryptionKey) {
    console.error('[Amazon API] Missing required environment variables');
    return null;
  }

  // Get valid access token
  const accessToken = await ensureValidToken(
    supabase,
    profileId,
    encryptionKey,
    clientId,
    clientSecret
  );

  if (!accessToken) {
    console.error('[Amazon API] Failed to get valid access token');
    return null;
  }

  // Get connection to determine region
  const { data: connection } = await supabase
    .from('amazon_connections')
    .select('marketplace_id')
    .eq('profile_id', profileId)
    .single();

  const region = getRegionFromMarketplace(connection?.marketplace_id);

  return new AmazonAdsApiClient({
    profileId,
    clientId,
    accessToken,
    region,
  });
}
