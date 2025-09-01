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
    const urlParts = endpoint.split('.');
    if (urlParts.length >= 2) {
      const region = urlParts[1]; // e.g., 'eu' from 'advertising-api.eu.amazon.com'
      return `https://advertising-api.${region}.amazon.com`;
    }
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
      
      if (args.since) {
        url.searchParams.set('lastUpdatedAfter', args.since);
      }

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
      
      if (args.since) {
        url.searchParams.set('lastUpdatedAfter', args.since);
      }

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
      
      if (args.since) {
        url.searchParams.set('lastUpdatedAfter', args.since);
      }

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
      
      if (args.since) {
        url.searchParams.set('lastUpdatedAfter', args.since);
      }

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
      
      if (args.since) {
        url.searchParams.set('lastUpdatedAfter', args.since);
      }

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

async function refreshTokens(supabase: any, profileId: string): Promise<any> {
  console.log('Refreshing tokens for profile:', profileId);
  
  // Get connection ID from profile ID
  const { data: connection, error: connectionError } = await supabase
    .from('amazon_connections')
    .select('id')
    .eq('profile_id', profileId)
    .single();
  
  if (connectionError || !connection) {
    throw new Error(`Failed to find connection for profile ${profileId}`);
  }
  
  const { data, error } = await supabase.functions.invoke('refresh-amazon-token', {
    body: { connectionId: connection.id }
  });

  if (error) {
    throw new Error(`Failed to refresh tokens: ${error.message}`);
  }

  return data;
}

async function getConnectionConfig(supabase: any, profileId: string): Promise<SyncConfig> {
  // First set the encryption key for this session
  await supabase.rpc('set_config', {
    key: 'app.enc_key',
    value: Deno.env.get('ENCRYPTION_KEY')
  });

  // Get tokens from private storage
  const { data: tokens, error: tokensError } = await supabase.rpc('get_tokens', {
    p_profile_id: profileId
  });

  if (tokensError || !tokens) {
    throw new Error(`Failed to get tokens for profile ${profileId}: ${tokensError?.message || 'No tokens found'}`);
  }

  // Get connection details
  const { data: connection, error: connectionError } = await supabase
    .from('amazon_connections')
    .select('advertising_api_endpoint')
    .eq('profile_id', profileId)
    .single();

  if (connectionError || !connection) {
    throw new Error(`Failed to get connection for profile ${profileId}: ${connectionError?.message || 'No connection found'}`);
  }

  const syncer = new EntitySyncer(supabase);
  const baseUrl = syncer.deriveBaseUrl(connection.advertising_api_endpoint);
  
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  if (!clientId) {
    throw new Error('AMAZON_CLIENT_ID environment variable not set');
  }

  return {
    profileId,
    accessToken: tokens.access_token,
    baseUrl,
    clientId
  };
}

async function syncEntity(
  syncer: EntitySyncer, 
  config: SyncConfig, 
  entityType: string, 
  mode: string
): Promise<{ itemsUpserted: number; pagesFetched: number }> {
  const runId = await syncer.createSyncRun(config.profileId, entityType, mode);
  let itemsUpserted = 0;
  let pagesFetched = 0;

  try {
    console.log(`Starting ${mode} sync for ${entityType} in profile ${config.profileId}`);

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
    console.error(`Failed to sync ${entityType}:`, error);
    
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
    const profileId = url.searchParams.get('profileId');
    const entity = url.searchParams.get('entity') || 'all';
    const mode = url.searchParams.get('mode') || 'incremental';

    if (!profileId) {
      return new Response(
        JSON.stringify({ error: 'profileId parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting sync: profileId=${profileId}, entity=${entity}, mode=${mode}`);

    // Get connection configuration
    const config = await getConnectionConfig(supabase, profileId);

    // Refresh tokens before sync
    await refreshTokens(supabase, profileId);

    const results: Record<string, any> = {};
    const entityTypes = entity === 'all' 
      ? ['campaigns', 'ad_groups', 'ads', 'targets']
      : [entity];

    // Sync entities in order (campaigns first, then ad groups, etc.)
    for (const entityType of entityTypes) {
      const result = await syncEntity(syncer, config, entityType, mode);
      results[entityType] = result;
    }

    return new Response(
      JSON.stringify({
        success: true,
        profileId,
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