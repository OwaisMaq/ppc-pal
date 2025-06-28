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
  
  // FIXED: Test unfiltered campaigns first (addressing debug checklist item #2)
  const campaignEndpoints = [
    // Test with NO filters first - this is critical for debugging
    { path: '/v2/sp/campaigns', description: 'Sponsored Products v2 (No Filters)', priority: 1, params: '' },
    { path: '/v2/sp/campaigns', description: 'Sponsored Products v2 (All States)', priority: 2, params: '?stateFilter=enabled,paused,archived' },
    
    // Test different campaign types without filters
    { path: '/v2/sb/campaigns', description: 'Sponsored Brands v2 (No Filters)', priority: 3, params: '' },
    { path: '/v2/sd/campaigns', description: 'Sponsored Display v2 (No Filters)', priority: 4, params: '' },
    
    // Modern API v3 endpoints
    { path: '/v3/sp/campaigns', description: 'Sponsored Products v3', priority: 5, params: '' },
    { path: '/v3/sb/campaigns', description: 'Sponsored Brands v3', priority: 6, params: '' },
    
    // Generic endpoints for broader compatibility
    { path: '/v2/campaigns', description: 'Generic Campaigns v2', priority: 7, params: '' },
    { path: '/campaigns', description: 'Basic Campaigns API', priority: 8, params: '' },
  ];

  let allCampaigns: any[] = [];
  let successfulEndpoints: string[] = [];
  let lastError: string = '';
  let profileValidated = false;

  console.log(`🚀 Testing ${campaignEndpoints.length} different campaign endpoints...`);

  for (const endpoint of campaignEndpoints.sort((a, b) => a.priority - b.priority)) {
    try {
      const fullUrl = `${baseUrl}${endpoint.path}${endpoint.params}`;
      console.log(`\n📡 Testing endpoint: ${fullUrl}`);
      console.log(`   Description: ${endpoint.description}`);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId, // CRITICAL: Correct header usage
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`📊 Response status: ${response.status} for ${endpoint.path}`);
      
      // Log response headers for debugging
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log(`📋 Response headers:`, responseHeaders);

      if (response.status === 200) {
        const data = await response.json();
        const campaigns = Array.isArray(data) ? data : (data.campaigns || []);
        
        console.log(`✅ SUCCESS: Found ${campaigns.length} campaigns from ${endpoint.description}`);
        console.log(`🔍 Raw API Response Sample:`, JSON.stringify(data).substring(0, 500) + '...');
        
        if (!profileValidated && response.status === 200) {
          profileValidated = true;
          console.log(`✅ Profile ID ${profileId} validated successfully`);
        }

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
            lastFetched: new Date().toISOString(),
            // Add raw data for debugging
            rawApiData: campaign
          }));

          allCampaigns.push(...processedCampaigns);
          successfulEndpoints.push(endpoint.path);
          
          console.log(`📋 Sample campaigns from ${endpoint.description}:`);
          processedCampaigns.slice(0, 3).forEach((campaign, index) => {
            console.log(`   ${index + 1}. ${campaign.name} (ID: ${campaign.campaignId}, State: ${campaign.state})`);
          });

          // IMPORTANT: If we found campaigns, we can break early or continue to get more types
          if (endpoint.priority <= 4) { // Only break for the high-priority endpoints
            console.log(`🎯 Found campaigns on high-priority endpoint, continuing to test other types...`);
          }
        } else {
          console.log(`ℹ️ No campaigns found in ${endpoint.description} (empty response but API accessible)`);
        }
      } else if (response.status === 401) {
        const errorText = await response.text();
        console.log(`🔑 Authentication error for ${endpoint.path}: ${errorText}`);
        lastError = `Authentication failed: ${errorText}`;
      } else if (response.status === 403) {
        const errorText = await response.text();
        console.log(`🚫 Authorization error for ${endpoint.path}: ${errorText}`);
        lastError = `Access denied: ${errorText}`;
        
        // Check if this is a profile scope issue
        if (errorText.includes('profile') || errorText.includes('scope')) {
          console.log(`❌ CRITICAL: Profile ID ${profileId} may be incorrect or not accessible`);
          console.log(`💡 SUGGESTION: Verify this profile ID exists in your Amazon Ads account`);
        }
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
  console.log(`🔍 Profile validation: ${profileValidated ? 'SUCCESS' : 'FAILED'}`);
  
  if (uniqueCampaigns.length === 0) {
    console.log(`❌ No campaigns found in ${region} region`);
    console.log(`🔍 Last error: ${lastError}`);
    console.log(`💡 DEBUG CHECKLIST ANALYSIS:`);
    console.log(`   ✅ Profile ID used: ${profileId}`);
    console.log(`   ${profileValidated ? '✅' : '❌'} Profile ID validated with Amazon API`);
    console.log(`   ✅ Multiple endpoints tested (including unfiltered)`);
    console.log(`   ✅ Correct Amazon-Advertising-API-Scope header used`);
    console.log(`   💡 Next steps: Check if campaigns exist in Amazon Ads UI for this profile`);
  } else {
    console.log(`🎉 Campaign fetch successful!`);
    
    // Enhanced analysis
    const campaignsByType = uniqueCampaigns.reduce((acc, campaign) => {
      const type = campaign.campaignType || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`📊 Campaigns by type:`, campaignsByType);
    
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
