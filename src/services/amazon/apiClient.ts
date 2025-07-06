
import { supabase } from '@/integrations/supabase/client';

export interface AmazonApiConfig {
  baseUrl: string;
  apiVersion: string;
  profileId: string;
  marketplaceId: string;
  region: string;
}

export interface RateLimitInfo {
  requestsPerSecond: number;
  dailyLimit: number;
  currentUsage: number;
  resetTime: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimitInfo?: RateLimitInfo;
  headers?: Record<string, string>;
}

export class AmazonApiClient {
  private config: AmazonApiConfig;
  private accessToken: string;
  private rateLimiter: RateLimiter;

  constructor(config: AmazonApiConfig, accessToken: string) {
    this.config = config;
    this.accessToken = accessToken;
    this.rateLimiter = new RateLimiter();
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Check rate limits before making request
    await this.rateLimiter.checkLimit();

    const url = `${this.config.baseUrl}/${this.config.apiVersion}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Amazon-Advertising-API-ClientId': await this.getClientId(),
      'Amazon-Advertising-API-Scope': this.config.profileId,
      'User-Agent': 'PPC-Pal/1.0',
      ...options.headers,
    };

    try {
      console.log(`Making API request to: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Extract rate limit info from headers
      const rateLimitInfo = this.extractRateLimitInfo(response.headers);
      this.rateLimiter.updateLimits(rateLimitInfo);

      const responseText = await response.text();
      let data;
      
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.warn('Failed to parse JSON response:', parseError);
        data = responseText;
      }

      if (!response.ok) {
        console.error('API request failed:', {
          status: response.status,
          statusText: response.statusText,
          data
        });

        return {
          success: false,
          error: data?.message || `HTTP ${response.status}: ${response.statusText}`,
          rateLimitInfo
        };
      }

      return {
        success: true,
        data,
        rateLimitInfo,
        headers: Object.fromEntries(response.headers.entries())
      };

    } catch (error) {
      console.error('Network error in API request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  private extractRateLimitInfo(headers: Headers): RateLimitInfo {
    return {
      requestsPerSecond: parseInt(headers.get('x-rate-limit-requests-per-second') || '0'),
      dailyLimit: parseInt(headers.get('x-rate-limit-daily-limit') || '0'),
      currentUsage: parseInt(headers.get('x-rate-limit-current-usage') || '0'),
      resetTime: parseInt(headers.get('x-rate-limit-reset') || '0')
    };
  }

  private async getClientId(): Promise<string> {
    // Get client ID from Supabase secrets
    const { data } = await supabase.functions.invoke('get-amazon-client-id');
    return data?.clientId || process.env.AMAZON_CLIENT_ID || '';
  }

  // Public API methods
  async getProfiles(): Promise<ApiResponse> {
    return this.makeRequest('/profiles');
  }

  async getCampaigns(params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.makeRequest(`/sp/campaigns${queryString}`);
  }

  async getCampaignMetrics(campaignIds: string[], reportDate: string): Promise<ApiResponse> {
    return this.makeRequest('/sp/campaigns/report', {
      method: 'POST',
      body: JSON.stringify({
        campaignType: 'sponsoredProducts',
        segment: 'campaign',
        reportDate,
        campaignIdFilter: campaignIds,
        columns: [
          'campaignId',
          'campaignName',
          'campaignStatus',
          'impressions',
          'clicks',
          'cost',
          'sales',
          'orders',
          'units'
        ]
      })
    });
  }

  async getAdGroups(campaignId: string): Promise<ApiResponse> {
    return this.makeRequest(`/sp/adGroups?campaignIdFilter=${campaignId}`);
  }

  async getKeywords(adGroupId: string): Promise<ApiResponse> {
    return this.makeRequest(`/sp/keywords?adGroupIdFilter=${adGroupId}`);
  }
}

class RateLimiter {
  private requestTimes: number[] = [];
  private dailyUsage = 0;
  private dailyLimit = 10000; // Default daily limit
  private requestsPerSecond = 10; // Default RPS limit

  async checkLimit(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests (older than 1 second)
    this.requestTimes = this.requestTimes.filter(time => now - time < 1000);
    
    // Check requests per second limit
    if (this.requestTimes.length >= this.requestsPerSecond) {
      const waitTime = 1000 - (now - this.requestTimes[0]);
      if (waitTime > 0) {
        console.log(`Rate limiting: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Check daily limit
    if (this.dailyUsage >= this.dailyLimit) {
      throw new Error('Daily API limit exceeded');
    }

    this.requestTimes.push(now);
    this.dailyUsage++;
  }

  updateLimits(rateLimitInfo: RateLimitInfo): void {
    if (rateLimitInfo.requestsPerSecond > 0) {
      this.requestsPerSecond = rateLimitInfo.requestsPerSecond;
    }
    if (rateLimitInfo.dailyLimit > 0) {
      this.dailyLimit = rateLimitInfo.dailyLimit;
    }
    if (rateLimitInfo.currentUsage >= 0) {
      this.dailyUsage = rateLimitInfo.currentUsage;
    }
  }
}
