
import { AmazonRegionalEndpoints } from './amazonRegionalEndpoints';
import { AmazonApiHeaders } from './amazonApiHeaders';
import { AmazonRateLimiter } from './amazonRateLimiter';
import { AmazonErrorHandler, AmazonApiError } from './amazonErrorHandler';

export interface AmazonApiConfig {
  profileId: string;
  countryCode: string;
  accessToken: string;
  clientId?: string;
  isTestMode?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AmazonApiError;
  nextToken?: string;
}

export class AmazonApiClient {
  private config: AmazonApiConfig;
  private rateLimiter: AmazonRateLimiter;
  private baseUrl: string;

  constructor(config: AmazonApiConfig) {
    this.config = config;
    this.rateLimiter = new AmazonRateLimiter();
    this.baseUrl = config.isTestMode 
      ? AmazonRegionalEndpoints.getTestEndpoint()
      : AmazonRegionalEndpoints.getEndpointForCountry(config.countryCode);
    
    console.log(`Amazon API Client initialized:`);
    console.log(`- Profile ID: ${config.profileId}`);
    console.log(`- Country: ${config.countryCode}`);
    console.log(`- Base URL: ${this.baseUrl}`);
    console.log(`- Test Mode: ${config.isTestMode || false}`);
  }

  async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}, 
    maxRetries = 3
  ): Promise<ApiResponse<T>> {
    let lastError: AmazonApiError | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check rate limits before making request
        await this.rateLimiter.checkRateLimit();
        
        const url = `${this.baseUrl}${endpoint}`;
        const headers = await AmazonApiHeaders.buildHeaders(
          this.config.accessToken,
          this.config.profileId,
          this.config.clientId
        );
        
        // Validate headers
        AmazonApiHeaders.validateRequiredHeaders(headers);
        
        console.log(`API Request (attempt ${attempt + 1}): ${options.method || 'GET'} ${url}`);
        
        const response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            ...options.headers,
          },
        });

        const responseText = await response.text();
        
        if (response.ok) {
          this.rateLimiter.recordSuccess();
          
          let data: T;
          try {
            data = responseText ? JSON.parse(responseText) : null;
          } catch (parseError) {
            console.warn('Failed to parse JSON response:', parseError);
            data = responseText as unknown as T;
          }
          
          // Extract nextToken if present (for pagination)
          let nextToken: string | undefined;
          if (typeof data === 'object' && data && 'nextToken' in data) {
            nextToken = (data as any).nextToken;
          }
          
          return {
            success: true,
            data,
            nextToken
          };
        } else {
          // Parse error response
          const error = AmazonErrorHandler.parseError(response, responseText);
          lastError = error;
          
          console.error(`API Error (attempt ${attempt + 1}):`, error);
          
          // Record error for rate limiting
          if (error.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            await this.rateLimiter.handleRateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
          } else {
            this.rateLimiter.recordError(error.status);
          }
          
          // Check if we should retry
          if (!AmazonErrorHandler.shouldRetry(error, attempt, maxRetries)) {
            break;
          }
          
          // Wait before retry (except for rate limiting which is handled above)
          if (error.status !== 429) {
            const delay = AmazonErrorHandler.getRetryDelay(attempt, error);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (networkError) {
        console.error(`Network error (attempt ${attempt + 1}):`, networkError);
        lastError = {
          status: 0,
          message: networkError instanceof Error ? networkError.message : 'Network error',
          retryable: true,
          requiresReauth: false
        };
        
        // Wait before retry for network errors
        if (attempt < maxRetries) {
          const delay = AmazonErrorHandler.getRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return {
      success: false,
      error: lastError || {
        status: 0,
        message: 'Unknown error occurred',
        retryable: false,
        requiresReauth: false
      }
    };
  }

  // Sponsored Products API methods
  async getCampaigns(filters?: { state?: string; nextToken?: string }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters?.state) params.append('stateFilter', filters.state);
    if (filters?.nextToken) params.append('nextToken', filters.nextToken);
    
    const queryString = params.toString();
    const endpoint = `/v2/sp/campaigns${queryString ? '?' + queryString : ''}`;
    
    return this.makeRequest(endpoint);
  }

  async getProfiles(): Promise<ApiResponse> {
    return this.makeRequest('/v2/profiles');
  }

  async getAdGroups(campaignId: string): Promise<ApiResponse> {
    return this.makeRequest(`/v2/sp/adGroups?campaignIdFilter=${campaignId}`);
  }

  async getKeywords(adGroupId?: string): Promise<ApiResponse> {
    const endpoint = adGroupId 
      ? `/v2/sp/keywords?adGroupIdFilter=${adGroupId}`
      : '/v2/sp/keywords';
    return this.makeRequest(endpoint);
  }

  // Report generation methods
  async requestReport(reportConfig: {
    recordType: 'campaigns' | 'adGroups' | 'keywords';
    reportDate: string;
    metrics: string[];
    segment?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest(`/v2/sp/${reportConfig.recordType}/report`, {
      method: 'POST',
      body: JSON.stringify({
        campaignType: 'sponsoredProducts',
        segment: reportConfig.segment || 'query',
        reportDate: reportConfig.reportDate,
        metrics: reportConfig.metrics
      })
    });
  }

  async getReportStatus(reportId: string): Promise<ApiResponse> {
    return this.makeRequest(`/v2/reports/${reportId}`);
  }

  // Utility methods
  getRateLimiterStatus() {
    return this.rateLimiter.getStatus();
  }

  updateConfig(newConfig: Partial<AmazonApiConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Update base URL if country changed
    if (newConfig.countryCode) {
      this.baseUrl = this.config.isTestMode 
        ? AmazonRegionalEndpoints.getTestEndpoint()
        : AmazonRegionalEndpoints.getEndpointForCountry(newConfig.countryCode);
    }
  }
}
