
import { Region, getBaseUrl } from './types.ts';

interface CampaignResult {
  campaigns: any[];
  region: Region;
  endpoint?: string;
  totalFound?: number;
}

export async function fetchCampaignsFromRegion(
  accessToken: string,
  clientId: string,
  profileId: string,
  region: Region
): Promise<CampaignResult> {
  const baseUrl = getBaseUrl(region);
  
  console.log(`=== ENHANCED CAMPAIGN FETCHING FOR ${region} REGION ===`);
  console.log(`🔍 Base URL: ${baseUrl}`);
  console.log(`🎯 Profile ID: ${profileId}`);
  console.log(`🔑 Client ID: ${clientId ? 'Present' : 'Missing'}`);
  
  // Enhanced endpoint testing with multiple API versions and campaign types
  const campaignEndpoints = [
    // Modern API v3 endpoints
    { path: '/v3/sp/campaigns', description: 'Sponsored Products v3', priority: 1 },
    { path: '/v3/sb/campaigns', description: 'Sponsored Brands v3', priority: 2 },
    { path: '/v3/sd/campaigns', description: 'Sponsored Display v3', priority: 3 },
    
    // Legacy v2 endpoints (more widely supported)
    { path: '/v2/sp/campaigns', description: 'Sponsored Products v2', priority: 4 },
    { path: '/v2/sb/campaigns', description: 'Sponsored Brands v2', priority: 5 },
    { path: '/v2/campaigns', description: 'Generic Campaigns v2', priority: 6 },
    
    // Alternative endpoints for different account types
    { path: '/campaigns', description: 'Basic Campaigns API', priority: 7 },
    { path: '/sp/campaigns', description: 'SP Campaigns (no version)', priority: 8 },
    { path: '/advertising/v1/campaigns', description: 'Alternative v1', priority: 9 },
    
    // DSP endpoints for larger advertisers
    { path: '/dsp/campaigns', description: 'DSP Campaigns', priority: 10 },
    { path: '/v1/dsp/campaigns', description: 'DSP v1 Campaigns', priority: 11 }
  ];

  let allCampaigns: any[] = [];
  let successfulEndpoints: string[] = [];
  let lastError: string = '';

  console.log(`🚀 Testing ${campaignEndpoints.length} different campaign endpoints...`);

  for (const endpoint of campaignEndpoints.sort((a, b) => a.priority - b.priority)) {
    try {
      console.log(`\n📡 Testing endpoint: ${endpoint.path} (${endpoint.description})`);
      
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`📊 Response status: ${response.status} for ${endpoint.path}`);

      if (response.status === 200) {
        const data = await response.json();
        const campaigns = Array.isArray(data) ? data : (data.campaigns || []);
        
        console.log(`✅ SUCCESS: Found ${campaigns.length} campaigns from ${endpoint.description}`);
        
        if (campaigns.length > 0) {
          // Process and standardize campaign data
          const processedCampaigns = campaigns.map(campaign => ({
            campaignId: campaign.campaignId || campaign.id || campaign.campaign_id,
            name: campaign.name || campaign.campaignName || `Campaign ${campaign.campaignId}`,
            state: campaign.state || campaign.status || 'ENABLED',
            campaignType: campaign.campaignType || endpoint.description,
            dailyBudget: campaign.dailyBudget || campaign.budget?.amount || 0,
            targetingType: campaign.targetingType || 'AUTO',
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            // Enhanced metadata for better tracking
            sourceEndpoint: endpoint.path,
            apiVersion: extractApiVersion(endpoint.path),
            region: region,
            profileId: profileId,
            lastFetched: new Date().toISOString()
          }));

          allCampaigns.push(...processedCampaigns);
          successfulEndpoints.push(endpoint.path);
          
          console.log(`📋 Sample campaigns from ${endpoint.description}:`);
          processedCampaigns.slice(0, 3).forEach((campaign, index) => {
            console.log(`   ${index + 1}. ${campaign.name} (ID: ${campaign.campaignId}, State: ${campaign.state})`);
          });
        } else {
          console.log(`ℹ️ No campaigns found in ${endpoint.description} (empty response)`);
        }
      } else if (response.status === 401) {
        const errorText = await response.text();
        console.log(`🔑 Authentication error for ${endpoint.path}: ${errorText}`);
        lastError = `Authentication failed: ${errorText}`;
      } else if (response.status === 403) {
        const errorText = await response.text();
        console.log(`🚫 Authorization error for ${endpoint.path}: ${errorText}`);
        lastError = `Access denied: ${errorText}`;
      } else if (response.status === 404) {
        console.log(`❌ Endpoint not found: ${endpoint.path}`);
        lastError = `Endpoint not available: ${endpoint.path}`;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ Unexpected response ${response.status} for ${endpoint.path}: ${errorText}`);
        lastError = `HTTP ${response.status}: ${errorText}`;
      }
    } catch (error) {
      console.error(`💥 Exception testing ${endpoint.path}:`, error.message);
      lastError = `Network error: ${error.message}`;
    }
  }

  // Remove duplicates based on campaignId
  const uniqueCampaigns = allCampaigns.reduce((unique, campaign) => {
    const exists = unique.find(c => c.campaignId === campaign.campaignId);
    if (!exists) {
      unique.push(campaign);
    }
    return unique;
  }, [] as any[]);

  console.log(`\n=== ENHANCED CAMPAIGN FETCH RESULTS ===`);
  console.log(`🎯 Total unique campaigns found: ${uniqueCampaigns.length}`);
  console.log(`✅ Successful endpoints: ${successfulEndpoints.length}`);
  console.log(`📡 Working endpoints: ${successfulEndpoints.join(', ')}`);
  
  if (uniqueCampaigns.length === 0) {
    console.log(`❌ No campaigns found in ${region} region`);
    console.log(`🔍 Last error: ${lastError}`);
    console.log(`💡 This could indicate:`);
    console.log(`   - New Amazon account with no campaigns yet`);
    console.log(`   - Different account type requiring different API access`);
    console.log(`   - Regional API differences`);
    console.log(`   - Account permissions or API scope limitations`);
  } else {
    console.log(`🎉 Campaign fetch successful!`);
    
    // Log campaign distribution by type
    const campaignsByType = uniqueCampaigns.reduce((acc, campaign) => {
      const type = campaign.campaignType || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`📊 Campaigns by type:`, campaignsByType);
    
    // Log campaign states
    const campaignsByState = uniqueCampaigns.reduce((acc, campaign) => {
      const state = campaign.state || 'Unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`🎮 Campaigns by state:`, campaignsByState);
  }

  return {
    campaigns: uniqueCampaigns,
    region,
    endpoint: successfulEndpoints[0],
    totalFound: uniqueCampaigns.length
  };
}

function extractApiVersion(endpoint: string): string {
  if (endpoint.includes('/v3/')) return 'v3';
  if (endpoint.includes('/v2/')) return 'v2';
  if (endpoint.includes('/v1/')) return 'v1';
  return 'legacy';
}

export async function storeCampaigns(
  campaigns: any[],
  connectionId: string,
  supabase: any
): Promise<{
  stored: number;
  campaignIds: string[];
  errors: number;
  processingErrors: string[];
}> {
  console.log('=== ENHANCED CAMPAIGN STORAGE WITH GUARANTEED UUID EXTRACTION ===');
  console.log(`Processing ${campaigns.length} campaigns for connection ${connectionId}`);
  
  let stored = 0;
  let errors = 0;
  const campaignIds: string[] = [];
  const processingErrors: string[] = [];

  // Verify database access
  try {
    const { data: existingCampaigns, error: checkError } = await supabase
      .from('campaigns')
      .select('id, amazon_campaign_id')
      .eq('connection_id', connectionId)
      .limit(1);

    if (checkError) {
      console.error('❌ Database access error:', checkError);
      throw new Error(`Database access failed: ${checkError.message}`);
    }

    console.log(`✅ Database access confirmed. Existing campaigns for this connection: ${existingCampaigns?.length || 0}`);
  } catch (error) {
    console.error('💥 Database verification failed:', error);
    throw error;
  }

  if (campaigns.length === 0) {
    console.log('ℹ️ No campaigns to store (this is normal for new Amazon accounts)');
    return { stored: 0, campaignIds: [], errors: 0, processingErrors: [] };
  }

  console.log('🔄 Processing campaigns for storage...');

  for (const [index, campaign] of campaigns.entries()) {
    try {
      console.log(`\n📝 Processing campaign ${index + 1}/${campaigns.length}: ${campaign.name}`);
      
      // Enhanced campaign data preparation
      const campaignData = {
        name: campaign.name || `Campaign ${campaign.campaignId}`,
        amazon_campaign_id: campaign.campaignId?.toString() || '',
        campaign_type: campaign.campaignType || 'SPONSORED_PRODUCTS',
        targeting_type: campaign.targetingType || 'AUTO',
        status: mapCampaignStatus(campaign.state),
        daily_budget: parseFloat(campaign.dailyBudget?.toString() || '0'),
        start_date: campaign.startDate || null,
        end_date: campaign.endDate || null,
        connection_id: connectionId,
        data_source: 'api',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        // Enhanced metadata
        source_endpoint: campaign.sourceEndpoint,
        api_version: campaign.apiVersion,
        region: campaign.region,
        profile_id: campaign.profileId
      };

      console.log(`   📊 Campaign data prepared:`, {
        name: campaignData.name,
        amazonId: campaignData.amazon_campaign_id,
        type: campaignData.campaign_type,
        status: campaignData.status,
        source: campaignData.data_source
      });

      // Upsert campaign with enhanced conflict resolution
      const { data: insertedCampaign, error: insertError } = await supabase
        .from('campaigns')
        .upsert(campaignData, {
          onConflict: 'amazon_campaign_id,connection_id',
          ignoreDuplicates: false
        })
        .select('id, amazon_campaign_id')
        .single();

      if (insertError) {
        console.error(`❌ Failed to store campaign ${campaign.name}:`, insertError);
        errors++;
        processingErrors.push(`Campaign ${campaign.name}: ${insertError.message}`);
        continue;
      }

      if (insertedCampaign?.id) {
        campaignIds.push(insertedCampaign.id);
        stored++;
        console.log(`✅ Stored campaign: ${campaign.name} (UUID: ${insertedCampaign.id})`);
      } else {
        console.warn(`⚠️ Campaign stored but no UUID returned for ${campaign.name}`);
        errors++;
        processingErrors.push(`Campaign ${campaign.name}: No UUID returned after storage`);
      }

    } catch (error) {
      console.error(`💥 Exception processing campaign ${campaign.name}:`, error);
      errors++;
      processingErrors.push(`Campaign ${campaign.name}: ${error.message}`);
    }
  }

  // Verification query
  try {
    const { data: verificationData, error: verifyError } = await supabase
      .from('campaigns')
      .select('id, name, amazon_campaign_id, data_source')
      .eq('connection_id', connectionId)
      .eq('data_source', 'api')
      .order('created_at', { ascending: false });

    if (!verifyError && verificationData) {
      console.log(`✅ VERIFICATION: ${verificationData.length} API campaigns in database`);
    }
  } catch (verifyError) {
    console.warn('⚠️ Verification query failed:', verifyError);
  }

  console.log('\n=== ENHANCED CAMPAIGN STORAGE SUMMARY ===');
  console.log(`✅ Campaigns stored: ${stored}`);
  console.log(`❌ Storage errors: ${errors}`);
  console.log(`🎯 UUIDs extracted: ${campaignIds.length}`);
  console.log(`📊 Success rate: ${campaigns.length > 0 ? ((stored / campaigns.length) * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log(`🎉 PIPELINE SUCCESS: ${stored} campaigns stored with ${campaignIds.length} UUIDs ready for metrics`);

  return {
    stored,
    campaignIds,
    errors,
    processingErrors
  };
}

function mapCampaignStatus(state: string): 'enabled' | 'paused' | 'archived' {
  if (!state) return 'enabled';
  
  const normalizedState = state.toUpperCase();
  
  switch (normalizedState) {
    case 'ENABLED':
    case 'ACTIVE':
    case 'RUNNING':
      return 'enabled';
    case 'PAUSED':
    case 'SUSPENDED':
      return 'paused';
    case 'ARCHIVED':
    case 'DELETED':
    case 'ENDED':
      return 'archived';
    default:
      return 'enabled';
  }
}
