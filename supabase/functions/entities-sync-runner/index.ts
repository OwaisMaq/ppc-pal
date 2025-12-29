import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AmazonApiError extends Error {
  response?: {
    status: number;
    headers: Record<string, string>;
    data?: any;
  };
}

class HttpClient {
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const amazonError = error as AmazonApiError;
        
        // Don't retry on 4xx errors except 429
        if (amazonError.response?.status && amazonError.response.status >= 400 && amazonError.response.status < 500 && amazonError.response.status !== 429) {
          throw error;
        }
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff and jitter
        let delay = baseDelay * Math.pow(2, attempt);
        
        // Honor Retry-After header for 429 responses
        if (amazonError.response?.status === 429) {
          const retryAfter = amazonError.response.headers['retry-after'];
          if (retryAfter) {
            delay = parseInt(retryAfter) * 1000; // Convert to milliseconds
          }
        }
        
        // Add jitter (±25%)
        const jitter = delay * 0.25 * (Math.random() - 0.5);
        delay = Math.floor(delay + jitter);
        
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    return this.retryWithBackoff(async () => {
      const response = await fetch(url, options);
      
      // Log rate limit headers for observability
      const requestId = response.headers.get('x-amzn-RequestId');
      const rateLimit = response.headers.get('x-amzn-RateLimit-Limit');
      
      if (requestId) {
        console.log(`Amazon Request ID: ${requestId}`);
      }
      if (rateLimit) {
        console.log(`Amazon Rate Limit: ${rateLimit}`);
      }
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as AmazonApiError;
        error.response = {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data: await response.text().catch(() => null)
        };
        throw error;
      }
      
      return response;
    });
  }
}

interface FetchPageArgs {
  profileId: string;
  since?: string;
  pageCursor?: string | number;
}

interface SyncConfig {
  profileId: string;
  accessToken: string;
  baseUrl: string;
  clientId: string;
}

class EntitySyncer {
  private httpClient = new HttpClient();
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  private getApiHeaders(config: SyncConfig): Record<string, string> {
    return {
      'Authorization': `Bearer ${config.accessToken}`,
      'Amazon-Advertising-API-ClientId': config.clientId,
      'Amazon-Advertising-API-Scope': config.profileId,
      'Content-Type': 'application/json'
    };
  }

  private deriveBaseUrl(endpoint: string): string {
    // Extract region from endpoint and construct base URL
    if (!endpoint) {
      console.warn('No advertising API endpoint provided, using default');
      return 'https://advertising-api.amazon.com'; // Default to North America
    }
    
    // Strip protocol if present
    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
    
    // Handle hyphen-based format: advertising-api-eu.amazon.com
    const hyphenMatch = cleanEndpoint.match(/^advertising-api-([a-z]+)\.amazon\.com$/i);
    if (hyphenMatch) {
      const region = hyphenMatch[1];
      const baseUrl = `https://advertising-api-${region}.amazon.com`;
      
      // Validate URL doesn't contain duplicates
      if (baseUrl.includes('amazon.amazon')) {
        console.error(`Malformed URL detected: ${baseUrl}, using default`);
        return 'https://advertising-api.amazon.com';
      }
      
      console.log(`Using regional API endpoint: ${baseUrl}`);
      return baseUrl;
    }
    
    // Handle dot-based format
    const dotMatch = cleanEndpoint.match(/^advertising-api\.([a-z]+)\.amazon\.com$/i);
    if (dotMatch) {
      const region = dotMatch[1];
      const baseUrl = `https://advertising-api-${region}.amazon.com`;
      
      // Validate URL doesn't contain duplicates
      if (baseUrl.includes('amazon.amazon')) {
        console.error(`Malformed URL detected: ${baseUrl}, using default`);
        return 'https://advertising-api.amazon.com';
      }
      
      console.log(`Using regional API endpoint: ${baseUrl}`);
      return baseUrl;
    }
    
    // Handle base domain without region (North America)
    if (cleanEndpoint === 'advertising-api.amazon.com') {
      const baseUrl = 'https://advertising-api.amazon.com';
      console.log(`Using default API endpoint: ${baseUrl}`);
      return baseUrl;
    }
    
    console.warn(`Failed to parse endpoint: ${endpoint}, using default`);
    return 'https://advertising-api.amazon.com'; // fallback
  }

  async* listCampaignsPaged(config: SyncConfig, args: FetchPageArgs) {
    let cursor = args.pageCursor ?? 0;
    let hasMore = true;
    
    while (hasMore) {
      const url = new URL(`${config.baseUrl}/v2/sp/campaigns`);
      url.searchParams.set('startIndex', cursor.toString());
      url.searchParams.set('count', '100');
      url.searchParams.set('stateFilter', 'enabled,paused,archived');

      const response = await this.httpClient.makeRequest(url.toString(), {
        headers: this.getApiHeaders(config)
      });
      
      const data = await response.json();
      yield data;
      
      if (data.length < 100) {
        hasMore = false;
      } else {
        cursor = (cursor as number) + data.length;
      }
    }
  }

  async* listAdGroupsPaged(config: SyncConfig, args: FetchPageArgs) {
    let cursor = args.pageCursor ?? 0;
    let hasMore = true;
    
    while (hasMore) {
      const url = new URL(`${config.baseUrl}/v2/sp/adGroups`);
      url.searchParams.set('startIndex', cursor.toString());
      url.searchParams.set('count', '100');
      url.searchParams.set('stateFilter', 'enabled,paused,archived');

      const response = await this.httpClient.makeRequest(url.toString(), {
        headers: this.getApiHeaders(config)
      });
      
      const data = await response.json();
      yield data;
      
      if (data.length < 100) {
        hasMore = false;
      } else {
        cursor = (cursor as number) + data.length;
      }
    }
  }

  async* listAdsPaged(config: SyncConfig, args: FetchPageArgs) {
    let cursor = args.pageCursor ?? 0;
    let hasMore = true;
    
    while (hasMore) {
      const url = new URL(`${config.baseUrl}/v2/sp/productAds`);
      url.searchParams.set('startIndex', cursor.toString());
      url.searchParams.set('count', '100');
      url.searchParams.set('stateFilter', 'enabled,paused,archived');

      const response = await this.httpClient.makeRequest(url.toString(), {
        headers: this.getApiHeaders(config)
      });
      
      const data = await response.json();
      yield data;
      
      if (data.length < 100) {
        hasMore = false;
      } else {
        cursor = (cursor as number) + data.length;
      }
    }
  }

  async* listTargetsPaged(config: SyncConfig, args: FetchPageArgs) {
    // Sync both keywords and targets
    yield* this.listKeywordsPaged(config, args);
    yield* this.listProductTargetsPaged(config, args);
  }

  async* listKeywordsPaged(config: SyncConfig, args: FetchPageArgs) {
    let cursor = args.pageCursor ?? 0;
    let hasMore = true;
    
    while (hasMore) {
      const url = new URL(`${config.baseUrl}/v2/sp/keywords`);
      url.searchParams.set('startIndex', cursor.toString());
      url.searchParams.set('count', '100');
      url.searchParams.set('stateFilter', 'enabled,paused,archived');

      const response = await this.httpClient.makeRequest(url.toString(), {
        headers: this.getApiHeaders(config)
      });
      
      const data = await response.json();
      
      // Transform keywords to target format
      const transformedData = data.map((keyword: any) => ({
        ...keyword,
        targetId: keyword.keywordId,
        expression: { text: keyword.keywordText },
        matchType: keyword.matchType,
        bid_micros: keyword.bid ? Math.round(keyword.bid * 1000000) : null
      }));
      
      yield transformedData;
      
      if (data.length < 100) {
        hasMore = false;
      } else {
        cursor = (cursor as number) + data.length;
      }
    }
  }

  async* listProductTargetsPaged(config: SyncConfig, args: FetchPageArgs) {
    let cursor = args.pageCursor ?? 0;
    let hasMore = true;
    
    while (hasMore) {
      const url = new URL(`${config.baseUrl}/v2/sp/targets`);
      url.searchParams.set('startIndex', cursor.toString());
      url.searchParams.set('count', '100');
      url.searchParams.set('stateFilter', 'enabled,paused,archived');

      const response = await this.httpClient.makeRequest(url.toString(), {
        headers: this.getApiHeaders(config)
      });
      
      const data = await response.json();
      
      // Transform targets to unified format
      const transformedData = data.map((target: any) => ({
        ...target,
        targetId: target.targetId,
        expression: target.expression || target.expressions?.[0],
        matchType: 'product',
        bid_micros: target.bid ? Math.round(target.bid * 1000000) : null
      }));
      
      yield transformedData;
      
      if (data.length < 100) {
        hasMore = false;
      } else {
        cursor = (cursor as number) + data.length;
      }
    }
  }

  async* listPortfoliosPaged(config: SyncConfig, args: FetchPageArgs) {
    let nextToken: string | null = null;
    const url = `${config.baseUrl}/portfolios/list`;
    
    console.log(`📁 Fetching portfolios from ${url}`);
    
    do {
      const body: any = {
        includeExtendedDataFields: true,
        stateFilter: { include: ['ENABLED', 'PAUSED'] },
        maxResults: 100
      };
      
      if (nextToken) {
        body.nextToken = nextToken;
      }
      
      const headers = {
        ...this.getApiHeaders(config),
        'Content-Type': 'application/vnd.spPortfolio.v3+json',
        'Accept': 'application/vnd.spPortfolio.v3+json'
      };
      
      console.log(`📄 Fetching portfolios page, nextToken: ${nextToken ? 'yes' : 'no'}`);
      
      const response = await this.httpClient.makeRequest(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (data.portfolios && data.portfolios.length > 0) {
        console.log(`✅ Found ${data.portfolios.length} portfolios`);
        yield data.portfolios;
      } else {
        console.log(`⚠️ No portfolios in response:`, JSON.stringify(data).substring(0, 200));
      }
      
      nextToken = data.nextToken || null;
    } while (nextToken);
    
    console.log(`✅ Portfolio sync complete`);
  }

  async upsertPortfolios(profileId: string, portfolios: any[]): Promise<number> {
    if (portfolios.length === 0) return 0;

    console.log(`📝 Upserting ${portfolios.length} portfolios`);

    const upsertData = portfolios.map(portfolio => ({
      profile_id: profileId,
      portfolio_id: portfolio.portfolioId.toString(),
      name: portfolio.name,
      // v3 API returns uppercase state (ENABLED, PAUSED), normalize to lowercase
      state: (portfolio.state || 'enabled').toLowerCase(),
      budget_amount_micros: portfolio.budget?.amount ? Math.round(portfolio.budget.amount * 1000000) : null,
      budget_currency: portfolio.budget?.currencyCode || null,
      budget_policy: portfolio.budget?.policy || null,
      budget_start_date: portfolio.budget?.startDate || null,
      budget_end_date: portfolio.budget?.endDate || null,
      in_budget: portfolio.inBudget !== false,
      synced_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('portfolios')
      .upsert(upsertData, {
        onConflict: 'profile_id,portfolio_id',
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Failed to upsert portfolios: ${error.message}`);
    }

    console.log(`✅ Upserted ${portfolios.length} portfolios successfully`);
    return portfolios.length;
  }
  async upsertCampaigns(profileId: string, campaigns: any[]): Promise<number> {
    if (campaigns.length === 0) return 0;

    const upsertData = campaigns.map(campaign => ({
      profile_id: profileId,
      campaign_id: campaign.campaignId.toString(),
      name: campaign.name,
      campaign_type: campaign.campaignType || 'sp',
      state: campaign.state,
      serving_status: campaign.servingStatus,
      computed_status: campaign.computedStatus,
      daily_budget_micros: campaign.dailyBudget ? Math.round(campaign.dailyBudget * 1000000) : null,
      bidding: campaign.bidding || {},
      last_updated_time: campaign.lastUpdatedTime ? new Date(campaign.lastUpdatedTime).toISOString() : null,
      synced_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('entity_campaigns')
      .upsert(upsertData, {
        onConflict: 'profile_id,campaign_id',
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Failed to upsert campaigns: ${error.message}`);
    }

    return campaigns.length;
  }

  async upsertAdGroups(profileId: string, adGroups: any[]): Promise<number> {
    if (adGroups.length === 0) return 0;

    const upsertData = adGroups.map(adGroup => ({
      profile_id: profileId,
      ad_group_id: adGroup.adGroupId.toString(),
      campaign_id: adGroup.campaignId.toString(),
      name: adGroup.name,
      state: adGroup.state,
      default_bid_micros: adGroup.defaultBid ? Math.round(adGroup.defaultBid * 1000000) : null,
      last_updated_time: adGroup.lastUpdatedTime ? new Date(adGroup.lastUpdatedTime).toISOString() : null,
      synced_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('entity_ad_groups')
      .upsert(upsertData, {
        onConflict: 'profile_id,ad_group_id',
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Failed to upsert ad groups: ${error.message}`);
    }

    return adGroups.length;
  }

  async upsertAds(profileId: string, ads: any[]): Promise<number> {
    if (ads.length === 0) return 0;

    const upsertData = ads.map(ad => ({
      profile_id: profileId,
      ad_id: ad.adId.toString(),
      campaign_id: ad.campaignId.toString(),
      ad_group_id: ad.adGroupId.toString(),
      state: ad.state,
      creative: {
        asin: ad.asin,
        sku: ad.sku,
        ...ad.creative
      },
      last_updated_time: ad.lastUpdatedTime ? new Date(ad.lastUpdatedTime).toISOString() : null,
      synced_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('entity_ads')
      .upsert(upsertData, {
        onConflict: 'profile_id,ad_id',
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Failed to upsert ads: ${error.message}`);
    }

    return ads.length;
  }

  async upsertTargets(profileId: string, targets: any[]): Promise<number> {
    if (targets.length === 0) return 0;

    const upsertData = targets.map(target => ({
      profile_id: profileId,
      target_id: target.targetId.toString(),
      campaign_id: target.campaignId.toString(),
      ad_group_id: target.adGroupId.toString(),
      expression: target.expression || {},
      match_type: target.matchType,
      state: target.state,
      bid_micros: target.bid_micros,
      last_updated_time: target.lastUpdatedTime ? new Date(target.lastUpdatedTime).toISOString() : null,
      synced_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('entity_targets')
      .upsert(upsertData, {
        onConflict: 'profile_id,target_id',
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Failed to upsert targets: ${error.message}`);
    }

    return targets.length;
  }

  async getSyncState(profileId: string, entityType: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .select('*')
      .eq('profile_id', profileId)
      .eq('entity_type', entityType)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get sync state: ${error.message}`);
    }

    return data;
  }

  async updateSyncState(profileId: string, entityType: string, updates: any): Promise<void> {
    const { error } = await this.supabase
      .from('sync_state')
      .upsert({
        profile_id: profileId,
        entity_type: entityType,
        updated_at: new Date().toISOString(),
        ...updates
      }, {
        onConflict: 'profile_id,entity_type',
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Failed to update sync state: ${error.message}`);
    }
  }

  async createSyncRun(profileId: string, entityType: string, mode: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('sync_runs')
      .insert({
        profile_id: profileId,
        entity_type: entityType,
        mode: mode,
        status: 'running'
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create sync run: ${error.message}`);
    }

    return data.id;
  }

  async updateSyncRun(runId: string, updates: any): Promise<void> {
    const { error } = await this.supabase
      .from('sync_runs')
      .update({
        ...updates,
        finished_at: new Date().toISOString()
      })
      .eq('id', runId);

    if (error) {
      throw new Error(`Failed to update sync run: ${error.message}`);
    }
  }
}

async function getConnectionConfig(supabase: any, connectionId: string): Promise<SyncConfig> {
  console.log(`📋 [EntitySync] getConnectionConfig called with connectionId: ${connectionId}`);
  
  // First get the connection to find the profile_id
  const { data: connection, error: connectionError } = await supabase
    .from('amazon_connections')
    .select('profile_id, advertising_api_endpoint, marketplace_id')
    .eq('id', connectionId)
    .single();

  if (connectionError || !connection) {
    console.error(`❌ [EntitySync] Failed to get connection ${connectionId}:`, connectionError);
    throw new Error(`Failed to get connection ${connectionId}: ${connectionError?.message || 'No connection found'}`);
  }

  const profileId = connection.profile_id;
  console.log(`✅ [EntitySync] Found connection: profileId=${profileId}, endpoint=${connection.advertising_api_endpoint}, marketplace=${connection.marketplace_id}`);

  // CRITICAL: Refresh tokens FIRST to ensure we always have fresh tokens
  console.log(`Refreshing tokens for connection: ${connectionId}`);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const functionUrl = `${supabaseUrl}/functions/v1/refresh-amazon-token`;
  
  const refreshResponse = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ connectionId })
  });

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text();
    console.error(`Token refresh failed for connection ${connectionId}: ${refreshResponse.status} - ${errorText.substring(0, 200)}`);
    
    // Check if it's an expired refresh token (user needs to reconnect)
    if (refreshResponse.status === 400 && errorText.includes('refresh_token_expired')) {
      throw new Error(`Amazon connection expired for ${connectionId}. User must reconnect their Amazon account.`);
    }
    
    throw new Error(`Failed to refresh tokens: ${refreshResponse.status} - ${errorText.substring(0, 100)}`);
  }

  const refreshResult = await refreshResponse.json();
  console.log(`✓ Token refresh successful for connection ${connectionId}, profile ${profileId}`);

  // Get the freshly refreshed tokens from private storage
  // Using get_tokens_with_key to pass encryption key directly and avoid cross-transaction issues
  // CRITICAL: get_tokens_with_key returns an ARRAY of rows, not a single object
  const { data: tokensArray, error: tokensError } = await supabase.rpc('get_tokens_with_key', {
    p_profile_id: profileId,
    p_encryption_key: Deno.env.get('ENCRYPTION_KEY')
  });

  if (tokensError) {
    console.error(`Failed to retrieve tokens for profile ${profileId}:`, tokensError);
    throw new Error(`Failed to get tokens for profile ${profileId}: ${tokensError.message}`);
  }

  // Extract the first (and should be only) token row from the array
  const tokens = tokensArray?.[0];
  
  if (!tokens || !tokens.access_token) {
    console.error(`No valid tokens found for profile ${profileId}. Tokens array:`, tokensArray);
    throw new Error(`No valid access token found for profile ${profileId}. Connection may need to be re-authorized.`);
  }

  console.log(`Successfully retrieved tokens for profile ${profileId}, expires at: ${tokens.expires_at}`);
  const accessToken = tokens.access_token;

  const syncer = new EntitySyncer(supabase);
  const baseUrl = syncer.deriveBaseUrl(connection.advertising_api_endpoint);
  
  console.log(`Connection ${connectionId} (Profile ${profileId}) using endpoint: ${baseUrl} for marketplace: ${connection.marketplace_id}`);
  
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  if (!clientId) {
    throw new Error('AMAZON_CLIENT_ID environment variable not set');
  }

  return {
    connectionId,
    profileId,
    accessToken, // Using the validated token extracted above
    clientId,
    baseUrl,
    marketplaceId: connection.marketplace_id
  };
}

async function syncEntity(
  syncer: EntitySyncer, 
  config: SyncConfig, 
  entityType: string, 
  mode: string
): Promise<{ itemsUpserted: number; pagesFetched: number }> {
  console.log(`🔄 [EntitySync] syncEntity called: entityType=${entityType}, mode=${mode}, profileId=${config.profileId}`);
  
  const runId = await syncer.createSyncRun(config.profileId, entityType, mode);
  console.log(`📝 [EntitySync] Created sync_run record: ${runId} for ${entityType}`);
  
  let itemsUpserted = 0;
  let pagesFetched = 0;

  try {
    console.log(`🚀 [EntitySync] Starting ${mode} sync for ${entityType} in profile ${config.profileId}`);

    // Get sync state
    const syncState = await syncer.getSyncState(config.profileId, entityType);
    
    // Calculate since timestamp for incremental sync
    let since: string | undefined;
    if (mode === 'incremental' && syncState?.high_watermark) {
      // Use high watermark minus 25 hours for safety
      const watermark = new Date(syncState.high_watermark);
      watermark.setHours(watermark.getHours() - 25);
      since = watermark.toISOString();
    } else if (mode === 'incremental') {
      // First incremental run - go back 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      since = thirtyDaysAgo.toISOString();
    }

    // Get appropriate paginator
    let paginator: AsyncGenerator<any[]>;
    let upsertMethod: (profileId: string, items: any[]) => Promise<number>;

    switch (entityType) {
      case 'portfolios':
        paginator = syncer.listPortfoliosPaged(config, { profileId: config.profileId, since });
        upsertMethod = syncer.upsertPortfolios.bind(syncer);
        break;
      case 'campaigns':
        paginator = syncer.listCampaignsPaged(config, { profileId: config.profileId, since });
        upsertMethod = syncer.upsertCampaigns.bind(syncer);
        break;
      case 'ad_groups':
        paginator = syncer.listAdGroupsPaged(config, { profileId: config.profileId, since });
        upsertMethod = syncer.upsertAdGroups.bind(syncer);
        break;
      case 'ads':
        paginator = syncer.listAdsPaged(config, { profileId: config.profileId, since });
        upsertMethod = syncer.upsertAds.bind(syncer);
        break;
      case 'targets':
        paginator = syncer.listTargetsPaged(config, { profileId: config.profileId, since });
        upsertMethod = syncer.upsertTargets.bind(syncer);
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    let highWatermark: Date | null = null;

    // Process pages
    for await (const page of paginator) {
      pagesFetched++;
      const upserted = await upsertMethod(config.profileId, page);
      itemsUpserted += upserted;

      // Track high watermark
      for (const item of page) {
        if (item.lastUpdatedTime) {
          const updatedTime = new Date(item.lastUpdatedTime);
          if (!highWatermark || updatedTime > highWatermark) {
            highWatermark = updatedTime;
          }
        }
      }

      console.log(`${entityType}: Processed page ${pagesFetched}, upserted ${upserted} items`);
    }

    // Update sync state
    const now = new Date();
    const updates: any = {
      updated_at: now.toISOString()
    };

    if (mode === 'full') {
      updates.last_full_sync_at = now.toISOString();
    } else {
      updates.last_incremental_sync_at = now.toISOString();
    }

    if (highWatermark) {
      updates.high_watermark = highWatermark.toISOString();
    }

    await syncer.updateSyncState(config.profileId, entityType, updates);

    // Update sync run
    await syncer.updateSyncRun(runId, {
      status: 'success',
      items_upserted: itemsUpserted,
      pages_fetched: pagesFetched
    });

    console.log(`Completed ${mode} sync for ${entityType}: ${itemsUpserted} items, ${pagesFetched} pages`);
    
    return { itemsUpserted, pagesFetched };

  } catch (error) {
    console.error(`❌ [EntitySync] Failed to sync ${entityType}:`, error);
    console.error(`❌ [EntitySync] Error type: ${error?.constructor?.name}`);
    console.error(`❌ [EntitySync] Error message: ${(error as Error)?.message}`);
    console.error(`❌ [EntitySync] Items upserted before error: ${itemsUpserted}, pages fetched: ${pagesFetched}`);
    
    await syncer.updateSyncRun(runId, {
      status: 'error',
      error: (error as Error).message,
      items_upserted: itemsUpserted,
      pages_fetched: pagesFetched
    });

    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase configuration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const syncer = new EntitySyncer(supabase);

  try {
    const url = new URL(req.url);
    const connectionId = url.searchParams.get('connectionId');
    const entity = url.searchParams.get('entity') || 'all';
    const mode = url.searchParams.get('mode') || 'incremental';

    console.log(`🚀 [EntitySync] Function invoked at ${new Date().toISOString()}`);
    console.log(`🚀 [EntitySync] Full URL: ${req.url}`);
    console.log(`🚀 [EntitySync] Query params: connectionId=${connectionId}, entity=${entity}, mode=${mode}`);
    console.log(`🚀 [EntitySync] Request method: ${req.method}`);

    if (!connectionId) {
      console.error(`❌ [EntitySync] Missing connectionId parameter`);
      return new Response(
        JSON.stringify({ error: 'connectionId parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [EntitySync] Starting sync: connectionId=${connectionId}, entity=${entity}, mode=${mode}`);

    // Get connection configuration (which now includes automatic token refresh)
    console.log(`📋 [EntitySync] Fetching connection configuration...`);
    const config = await getConnectionConfig(supabase, connectionId);
    console.log(`✅ [EntitySync] Configuration retrieved: profileId=${config.profileId}, baseUrl=${config.baseUrl}, marketplace=${config.marketplaceId}`);

    const results: Record<string, any> = {};
    const entityTypes = entity === 'all' 
      ? ['portfolios', 'campaigns', 'ad_groups', 'ads', 'targets']
      : [entity];

    // Sync entities in order (campaigns first, then ad groups, etc.)
    for (const entityType of entityTypes) {
      const result = await syncEntity(syncer, config, entityType, mode);
      results[entityType] = result;
    }

    return new Response(
      JSON.stringify({
        success: true,
        connectionId,
        profileId: config.profileId,
        mode,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Sync error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        profileId: new URL(req.url).searchParams.get('profileId')
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});