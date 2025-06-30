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

// Enhanced region detection with better UK handling
function determineRegion(marketplaceId: string): Region {
  console.log(`🌍 Determining region for marketplace: ${marketplaceId}`);
  
  // Normalize marketplace ID for comparison
  const normalizedMarketplace = marketplaceId?.toUpperCase() || '';
  
  // European marketplaces - UK is definitely in EU region
  const europeanMarketplaces = ['UK', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'TR'];
  // Far East marketplaces  
  const farEastMarketplaces = ['JP', 'AU', 'SG', 'AE', 'IN'];
  // North American marketplaces
  const northAmericanMarketplaces = ['US', 'CA', 'MX', 'BR'];
  
  // Check for exact matches first
  if (europeanMarketplaces.includes(normalizedMarketplace)) {
    console.log(`✅ Mapped ${marketplaceId} to EU region (exact match)`);
    return 'EU';
  }
  
  if (farEastMarketplaces.includes(normalizedMarketplace)) {
    console.log(`✅ Mapped ${marketplaceId} to FE region (exact match)`);
    return 'FE';
  }
  
  if (northAmericanMarketplaces.includes(normalizedMarketplace)) {
    console.log(`✅ Mapped ${marketplaceId} to NA region (exact match)`);
    return 'NA';
  }
  
  // Check for partial matches (in case marketplace ID contains additional info)
  if (europeanMarketplaces.some(market => normalizedMarketplace.includes(market))) {
    console.log(`✅ Mapped ${marketplaceId} to EU region (partial match)`);
    return 'EU';
  }
  
  if (farEastMarketplaces.some(market => normalizedMarketplace.includes(market))) {
    console.log(`✅ Mapped ${marketplaceId} to FE region (partial match)`);
    return 'FE';
  }
  
  if (northAmericanMarketplaces.some(market => normalizedMarketplace.includes(market))) {
    console.log(`✅ Mapped ${marketplaceId} to NA region (partial match)`);
    return 'NA';
  }
  
  // Default to EU for UK and unknown European marketplaces
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
  
  console.log(`=== ENHANCED AMAZON ADVERTISING API - UK CAMPAIGNS FOCUS ===`);
  console.log(`🇬🇧 Marketplace: ${marketplaceId} -> Region: ${region}`);
  console.log(`🔗 Base URL: ${baseUrl}`);
  console.log(`👤 Profile ID: ${profileId}`);
  console.log(`🔒 Access Token: ${accessToken.substring(0, 20)}...`);
  console.log(`🆔 Client ID: ${clientId}`);
  console.log(`⏰ Current time: ${new Date().toISOString()}`);

  // Amazon Advertising API endpoints with enhanced debugging
  const endpoints = [
    {
      url: `${baseUrl}/v2/sp/campaigns`,
      description: 'Sponsored Products v2 - Default',
      method: 'GET'
    },
    {
      url: `${baseUrl}/v2/sp/campaigns?stateFilter=enabled,paused,archived`,
      description: 'Sponsored Products v2 - All States (UK Focus)',
      method: 'GET'
    },
    {
      url: `${baseUrl}/v3/sp/campaigns`,
      description: 'Sponsored Products v3 - Latest API',
      method: 'GET'
    },
    {
      url: `${baseUrl}/v2/sb/campaigns`,
      description: 'Sponsored Brands v2',
      method: 'GET'
    },
    {
      url: `${baseUrl}/v2/hsa/campaigns`,
      description: 'Sponsored Display v2 (HSA)',
      method: 'GET'
    }
  ];

  // Enhanced token validation for UK campaigns
  const cleanAccessToken = accessToken.trim();
  
  const headers = {
    'Authorization': cleanAccessToken, // Amazon Ads API does NOT use Bearer prefix
    'Amazon-Advertising-API-ClientId': clientId.trim(),
    'Amazon-Advertising-API-Scope': profileId.trim(),
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'PPC-Pal-UK/1.0'
  };

  console.log('🔒 Enhanced Amazon Ads API headers for UK campaigns (sanitized):', {
    'Authorization': `${cleanAccessToken.substring(0, 20)}...`,
    'Amazon-Advertising-API-ClientId': clientId,
    'Amazon-Advertising-API-Scope': profileId,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'PPC-Pal-UK/1.0'
  });

  // Enhanced token format validation
  if (!cleanAccessToken.startsWith('Atza|') && !cleanAccessToken.startsWith('Atc|')) {
    console.error('❌ INVALID TOKEN FORMAT - Amazon tokens should start with Atza| or Atc|');
    console.error('🔍 Token preview:', cleanAccessToken.substring(0, 30));
    throw new Error('Invalid Amazon access token format');
  }

  let allCampaigns: (CampaignResponse & { sourceEndpoint?: string })[] = [];
  let successfulEndpoints: string[] = [];
  let lastError: Error | null = null;
  let detailedErrors: { endpoint: string; status: number; error: string }[] = [];

  // Test each endpoint with detailed UK-focused logging
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing UK Amazon Ads API: ${endpoint.url}`);
      console.log(`   Description: ${endpoint.description}`);
      console.log(`   Expected for UK marketplace: ${marketplaceId}`);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: headers
      });

      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
      console.log(`📡 Response Headers:`, Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS! Found ${data.length || 0} campaigns from Amazon Ads API`);
        console.log(`📊 Raw response structure:`, {
          isArray: Array.isArray(data),
          dataType: typeof data,
          firstItemKeys: data.length > 0 ? Object.keys(data[0]) : 'No items'
        });
        
        if (data && Array.isArray(data) && data.length > 0) {
          const campaignsWithSource = data.map((campaign: CampaignResponse) => ({
            ...campaign,
            sourceEndpoint: endpoint.url
          }));
          
          allCampaigns = [...allCampaigns, ...campaignsWithSource];
          successfulEndpoints.push(endpoint.url);
          
          console.log(`📊 UK Campaign sample (first 3):`, data.slice(0, 3).map((c: CampaignResponse) => ({
            campaignId: c.campaignId,
            name: c.name,
            state: c.state,
            campaignType: c.campaignType,
            servingStatus: c.servingStatus
          })));
        } else if (data && data.length === 0) {
          console.log(`⚠️ API call successful but returned empty array for UK marketplace`);
          successfulEndpoints.push(endpoint.url);
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${errorText}`);
        
        detailedErrors.push({
          endpoint: endpoint.url,
          status: response.status,
          error: errorText
        });
        
        // Enhanced error analysis for UK campaigns
        if (response.status === 403) {
          console.error('🔍 UK AUTHORIZATION ERROR ANALYSIS:');
          console.error('   - Token format:', cleanAccessToken.substring(0, 30) + '...');
          console.error('   - Token length:', cleanAccessToken.length);
          console.error('   - Profile ID:', profileId);
          console.error('   - Client ID:', clientId);
          console.error('   - Marketplace ID:', marketplaceId);
          console.error('   - Region determined:', region);
          console.error('   - Base URL used:', baseUrl);
          
          if (errorText.includes('Invalid scope') || errorText.includes('unauthorized')) {
            console.error('   - SCOPE ISSUE: UK profile may not have advertising permissions');
            console.error('   - Check if this UK profile has active campaigns in Amazon Seller Central');
            console.error('   - Verify the profile ID corresponds to the UK marketplace');
          }
        } else if (response.status === 401) {
          console.error('🔍 UK TOKEN ISSUE: Access token may be expired or invalid');
        } else if (response.status === 400) {
          console.error('🔍 UK REQUEST ISSUE: Malformed request for UK marketplace');
        }
        
        lastError = new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error(`💥 Network error for UK endpoint ${endpoint.url}:`, error.message);
      detailedErrors.push({
        endpoint: endpoint.url,
        status: 0,
        error: error.message
      });
      lastError = error as Error;
    }
  }

  // Remove duplicates based on campaignId
  const uniqueCampaigns = allCampaigns.filter((campaign, index, self) => 
    index === self.findIndex(c => c.campaignId === campaign.campaignId)
  );

  console.log(`\n=== UK AMAZON ADVERTISING API CAMPAIGN FETCH RESULTS ===`);
  console.log(`🇬🇧 Marketplace: ${marketplaceId}`);
  console.log(`🌍 Region: ${region}`);
  console.log(`🎯 Total unique campaigns: ${uniqueCampaigns.length}`);
  console.log(`✅ Successful endpoints: ${successfulEndpoints.length}`);
  console.log(`📡 Working endpoints: ${successfulEndpoints.join(', ')}`);
  console.log(`❌ Failed endpoints: ${detailedErrors.length}`);
  
  if (detailedErrors.length > 0) {
    console.log(`🔍 Error breakdown:`);
    detailedErrors.forEach(err => {
      console.log(`   - ${err.endpoint}: HTTP ${err.status} - ${err.error.substring(0, 100)}`);
    });
  }
  
  if (uniqueCampaigns.length === 0) {
    console.log(`❌ No campaigns found for UK marketplace ${marketplaceId}`);
    
    console.log(`💡 UK MARKETPLACE TROUBLESHOOTING:`);
    console.log(`   🔍 Profile ID: ${profileId}`);
    console.log(`   🔍 Region: ${region} (${baseUrl})`);
    console.log(`   🔍 Token valid: ${cleanAccessToken.length > 100 ? 'Yes' : 'Short/Invalid'}`);
    console.log(`   🔍 Successful API calls: ${successfulEndpoints.length}`);
    console.log(`   `);
    console.log(`   ❓ POSSIBLE CAUSES FOR UK CAMPAIGNS:`);
    console.log(`   1. UK Amazon Seller account has no active advertising campaigns`);
    console.log(`   2. Campaigns exist but are in 'draft' status (not enabled/paused/archived)`);
    console.log(`   3. Profile ID doesn't match the UK marketplace campaigns`);
    console.log(`   4. Access token doesn't have permissions for UK advertising campaigns`);
    console.log(`   5. Campaigns are Sponsored Brands/Display only (not Sponsored Products)`);
    console.log(`   6. UK marketplace ID mapping issue`);
    console.log(`   `);
    console.log(`   💡 NEXT STEPS FOR UK:`);
    console.log(`   - Verify active campaigns exist in Amazon UK Advertising Console`);
    console.log(`   - Check campaign types (Sponsored Products vs Brands vs Display)`);
    console.log(`   - Confirm the profile ID corresponds to UK marketplace operations`);
    console.log(`   - Ensure campaigns have generated impressions/clicks (not zero activity)`);
  } else {
    console.log(`🎉 Successfully found ${uniqueCampaigns.length} UK campaigns!`);
    console.log(`📊 Campaign types found:`, [...new Set(uniqueCampaigns.map(c => c.campaignType))]);
    console.log(`📊 Campaign states:`, [...new Set(uniqueCampaigns.map(c => c.state))]);
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
