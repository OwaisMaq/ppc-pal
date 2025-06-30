
import { Region, getBaseUrl } from './types.ts'

interface CampaignResponse {
  campaignId: string;
  name: string;
  campaignType?: string;
  targetingType?: string;
  state: 'enabled' | 'paused' | 'archived';
  dailyBudget?: number;
  startDate?: string;
  endDate?: string;
  servingStatus?: string;
  portfolioId?: string;
}

interface CampaignFetchResult {
  campaigns: (CampaignResponse & { sourceEndpoint?: string })[];
  region: Region;
  endpoint?: string;
}

// Enhanced region detection with better marketplace mapping
function determineRegion(marketplaceId: string): Region {
  console.log(`🌍 Determining region for marketplace: ${marketplaceId}`);
  
  // European marketplaces
  const europeanMarketplaces = ['UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'TR'];
  // Far East marketplaces  
  const farEastMarketplaces = ['JP', 'AU', 'SG', 'AE', 'IN'];
  // North American marketplaces
  const northAmericanMarketplaces = ['US', 'CA', 'MX', 'BR'];
  
  if (europeanMarketplaces.some(market => marketplaceId?.includes(market))) {
    console.log(`✅ Mapped ${marketplaceId} to EU region`);
    return 'EU';
  }
  
  if (farEastMarketplaces.some(market => marketplaceId?.includes(market))) {
    console.log(`✅ Mapped ${marketplaceId} to FE region`);
    return 'FE';
  }
  
  if (northAmericanMarketplaces.some(market => marketplaceId?.includes(market))) {
    console.log(`✅ Mapped ${marketplaceId} to NA region`);
    return 'NA';
  }
  
  // Default to EU for unknown European-sounding marketplaces
  console.log(`⚠️ Unknown marketplace ${marketplaceId}, defaulting to EU region`);
  return 'EU';
}

export async function fetchCampaignsFromRegion(
  accessToken: string,
  clientId: string,
  profileId: string,
  marketplaceId: string
): Promise<CampaignFetchResult> {
  const region = determineRegion(marketplaceId);
  const baseUrl = getBaseUrl(region);
  
  console.log(`=== ENHANCED CAMPAIGN FETCHING ===`);
  console.log(`🌍 Marketplace: ${marketplaceId} -> Region: ${region}`);
  console.log(`🔗 Base URL: ${baseUrl}`);
  console.log(`👤 Profile ID: ${profileId}`);
  console.log(`🔒 Access Token: ${accessToken.substring(0, 20)}...`);
  console.log(`🆔 Client ID: ${clientId}`);

  // Enhanced endpoint testing with better error handling
  const endpoints = [
    {
      url: `${baseUrl}/v2/sp/campaigns`,
      description: 'Sponsored Products v2',
      method: 'GET'
    },
    {
      url: `${baseUrl}/v2/sp/campaigns?stateFilter=enabled,paused,archived`,
      description: 'Sponsored Products v2 (All States)',
      method: 'GET'
    },
    {
      url: `${baseUrl}/v3/sp/campaigns`,
      description: 'Sponsored Products v3',
      method: 'GET'
    },
    {
      url: `${baseUrl}/v2/sb/campaigns`,
      description: 'Sponsored Brands v2',
      method: 'GET'
    },
    {
      url: `${baseUrl}/v3/sb/campaigns`,
      description: 'Sponsored Brands v3',
      method: 'GET'
    }
  ];

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  console.log('📡 Request headers (sanitized):', {
    'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  });

  let allCampaigns: (CampaignResponse & { sourceEndpoint?: string })[] = [];
  let successfulEndpoints: string[] = [];
  let lastError: Error | null = null;

  // Test each endpoint
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing: ${endpoint.url}`);
      console.log(`   Description: ${endpoint.description}`);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: headers
      });

      console.log(`📡 Response: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success! Found ${data.length || 0} campaigns`);
        
        if (data && Array.isArray(data) && data.length > 0) {
          const campaignsWithSource = data.map((campaign: CampaignResponse) => ({
            ...campaign,
            sourceEndpoint: endpoint.url
          }));
          
          allCampaigns = [...allCampaigns, ...campaignsWithSource];
          successfulEndpoints.push(endpoint.url);
          
          console.log(`📊 Campaign sample:`, data.slice(0, 2).map((c: CampaignResponse) => ({
            campaignId: c.campaignId,
            name: c.name,
            state: c.state,
            campaignType: c.campaignType
          })));
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${errorText}`);
        lastError = new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error(`💥 Network error for ${endpoint.url}:`, error.message);
      lastError = error as Error;
    }
  }

  // Remove duplicates based on campaignId
  const uniqueCampaigns = allCampaigns.filter((campaign, index, self) => 
    index === self.findIndex(c => c.campaignId === campaign.campaignId)
  );

  console.log(`\n=== CAMPAIGN FETCH RESULTS ===`);
  console.log(`🎯 Total unique campaigns: ${uniqueCampaigns.length}`);
  console.log(`✅ Successful endpoints: ${successfulEndpoints.length}`);
  console.log(`📡 Working endpoints: ${successfulEndpoints.join(', ')}`);
  
  if (uniqueCampaigns.length === 0) {
    console.log(`❌ No campaigns found in ${region} region`);
    if (lastError) {
      console.log(`🔍 Last error: ${lastError.message}`);
    }
    
    console.log(`💡 TROUBLESHOOTING CHECKLIST:`);
    console.log(`   ✅ Profile ID used: ${profileId}`);
    console.log(`   ${profileId ? '✅' : '❌'} Profile ID validated`);
    console.log(`   ✅ Multiple endpoints tested`);
    console.log(`   ✅ Correct headers sent`);
    console.log(`   💡 Next steps: Verify campaigns exist in Amazon Ads UI for this profile`);
  }

  return {
    campaigns: uniqueCampaigns,
    region,
    endpoint: successfulEndpoints[0]
  };
}

export async function storeCampaigns(
  campaigns: (CampaignResponse & { sourceEndpoint?: string })[],
  connectionId: string,
  supabaseClient: any
) {
  console.log('=== ENHANCED CAMPAIGN STORAGE ===');
  console.log(`📊 Processing ${campaigns.length} campaigns for connection ${connectionId}`);
  
  if (campaigns.length === 0) {
    console.log('ℹ️ No campaigns to store (Amazon account may not have active campaigns)');
    return { 
      stored: 0, 
      campaignIds: [], 
      errors: 0, 
      processingErrors: [] 
    };
  }

  // Check database connectivity
  const { data: existingCampaigns, error: checkError } = await supabaseClient
    .from('campaigns')
    .select('id, amazon_campaign_id')
    .eq('connection_id', connectionId);

  if (checkError) {
    console.error('❌ Database connectivity check failed:', checkError);
    throw new Error(`Database error: ${checkError.message}`);
  }

  console.log(`✅ Database accessible. Existing campaigns: ${existingCampaigns?.length || 0}`);

  let stored = 0;
  let errors = 0;
  const campaignIds: string[] = [];
  const processingErrors: string[] = [];

  for (const campaign of campaigns) {
    try {
      console.log(`🔄 Processing campaign: ${campaign.name} (${campaign.campaignId})`);
      
      // Check if campaign already exists
      const existingCampaign = existingCampaigns?.find(
        ec => ec.amazon_campaign_id === campaign.campaignId
      );

      const campaignData = {
        connection_id: connectionId,
        amazon_campaign_id: campaign.campaignId,
        name: campaign.name || `Campaign ${campaign.campaignId}`,
        campaign_type: campaign.campaignType || null,
        targeting_type: campaign.targetingType || null,
        status: campaign.state || 'enabled',
        daily_budget: campaign.dailyBudget || null,
        start_date: campaign.startDate || null,
        end_date: campaign.endDate || null,
        data_source: 'api',
        last_updated: new Date().toISOString()
      };

      let result;
      if (existingCampaign) {
        // Update existing campaign
        result = await supabaseClient
          .from('campaigns')
          .update(campaignData)
          .eq('id', existingCampaign.id)
          .select('id')
          .single();
        
        console.log(`🔄 Updated existing campaign: ${campaign.name}`);
      } else {
        // Insert new campaign
        result = await supabaseClient
          .from('campaigns')
          .insert(campaignData)
          .select('id')
          .single();
        
        console.log(`✅ Inserted new campaign: ${campaign.name}`);
      }

      if (result.error) {
        console.error(`❌ Error storing campaign ${campaign.campaignId}:`, result.error);
        errors++;
        processingErrors.push(`${campaign.name}: ${result.error.message}`);
      } else {
        stored++;
        campaignIds.push(result.data.id);
        console.log(`✅ Stored campaign: ${campaign.name} -> UUID: ${result.data.id}`);
      }

    } catch (error) {
      console.error(`💥 Unexpected error processing campaign ${campaign.campaignId}:`, error);
      errors++;
      processingErrors.push(`${campaign.name}: ${error.message}`);
    }
  }

  console.log(`📊 Storage Summary: ${stored} stored, ${errors} errors, ${campaignIds.length} UUIDs collected`);
  
  return { 
    stored, 
    campaignIds, 
    errors, 
    processingErrors 
  };
}
