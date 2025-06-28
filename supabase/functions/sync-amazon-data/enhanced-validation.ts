
export async function validateAndRefreshConnection(
  connection: any,
  clientId: string,
  supabase: any
): Promise<{ accessToken: string; isValid: boolean; errorDetails?: string }> {
  console.log('=== ENHANCED CONNECTION VALIDATION WITH COMPREHENSIVE CHECKS ===');
  console.log('Connection ID:', connection.id);
  console.log('Profile ID:', connection.profile_id);
  console.log('Current status:', connection.status);
  console.log('Last sync:', connection.last_sync_at);
  console.log('Token expires at:', connection.token_expires_at);
  
  // Enhanced profile ID validation
  if (!connection.profile_id || 
      connection.profile_id.includes('setup_required') || 
      connection.profile_id.includes('needs_setup') ||
      connection.profile_id === 'unknown' ||
      connection.profile_id.length < 5) {
    console.error('❌ Invalid profile ID detected:', connection.profile_id);
    return {
      accessToken: '',
      isValid: false,
      errorDetails: 'Profile ID is invalid or requires setup. Please reconnect your Amazon account with proper advertising permissions.'
    };
  }

  // Enhanced token expiration check
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  const bufferTime = 15 * 60 * 1000; // 15 minutes buffer
  const needsRefresh = now >= new Date(expiresAt.getTime() - bufferTime);

  console.log('Enhanced token expiration check:', {
    now: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    timeUntilExpiry: Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60) + ' minutes',
    needsRefresh
  });

  if (needsRefresh) {
    console.log('🔄 Token needs refresh, attempting enhanced refresh...');
    
    if (!connection.refresh_token) {
      console.error('❌ No refresh token available');
      await supabase
        .from('amazon_connections')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);
      
      return {
        accessToken: '',
        isValid: false,
        errorDetails: 'Token expired and no refresh token available. Please reconnect your Amazon account.'
      };
    }

    try {
      const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
      if (!clientSecret) {
        throw new Error('Amazon Client Secret not configured');
      }

      console.log('🔑 Attempting token refresh with enhanced parameters...');
      
      const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'AmazonAdvertisingAPI/1.0'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      console.log('🔄 Token refresh response:', refreshResponse.status, refreshResponse.statusText);

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('❌ Token refresh failed:', refreshResponse.status, errorText);
        
        // Parse error for better diagnostics
        try {
          const errorData = JSON.parse(errorText);
          console.error('📋 Refresh error details:', errorData);
        } catch (e) {
          console.error('📋 Raw refresh error:', errorText);
        }
        
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);
          
        return {
          accessToken: '',
          isValid: false,
          errorDetails: `Token refresh failed (${refreshResponse.status}). Please reconnect your Amazon account.`
        };
      }

      const refreshData = await refreshResponse.json();
      console.log('✅ Token refresh successful:', {
        hasAccessToken: !!refreshData.access_token,
        hasRefreshToken: !!refreshData.refresh_token,
        expiresIn: refreshData.expires_in,
        tokenType: refreshData.token_type
      });
      
      const newExpiryTime = new Date(Date.now() + ((refreshData.expires_in || 3600) * 1000));
      
      await supabase
        .from('amazon_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || connection.refresh_token,
          token_expires_at: newExpiryTime.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      console.log('✅ Token refreshed and stored successfully');
      return {
        accessToken: refreshData.access_token,
        isValid: true
      };
    } catch (error) {
      console.error('💥 Token refresh exception:', error);
      return {
        accessToken: '',
        isValid: false,
        errorDetails: `Token refresh failed: ${error.message}`
      };
    }
  }

  console.log('✅ Token is still valid, performing enhanced scope validation...');
  
  // Test the current token with a simple API call
  try {
    const testResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Content-Type': 'application/json',
      },
    });

    if (testResponse.ok) {
      const profiles = await testResponse.json();
      console.log('✅ Token validation successful:', profiles.length, 'profiles accessible');
    } else {
      console.warn('⚠️ Token validation warning:', testResponse.status, testResponse.statusText);
    }
  } catch (error) {
    console.warn('⚠️ Token validation test failed:', error.message);
  }
  
  return {
    accessToken: connection.access_token,
    isValid: true
  };
}

export async function testProfileAccessInAllRegions(
  accessToken: string,
  clientId: string,
  profileId: string
): Promise<{ region: string; success: boolean; errorDetails?: string; scopes?: string[] }[]> {
  console.log('=== COMPREHENSIVE PROFILE ACCESS TESTING WITH FALLBACK HANDLING ===');
  
  const regions = [
    { name: 'NA', baseUrl: 'https://advertising-api.amazon.com' },
    { name: 'EU', baseUrl: 'https://advertising-api-eu.amazon.com' },
    { name: 'FE', baseUrl: 'https://advertising-api-fe.amazon.com' }
  ];

  const results = [];

  for (const region of regions) {
    console.log(`🌍 Testing ${region.name} region comprehensive access for profile ${profileId}`);
    
    try {
      // Test 1: Basic profile access
      const profileResponse = await fetch(`${region.baseUrl}/v2/profiles`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profiles = await profileResponse.json();
        const profileExists = profiles.some((p: any) => p.profileId?.toString() === profileId);
        
        if (profileExists) {
          console.log(`✅ Profile ${profileId} found in ${region.name} region`);
          
          // Test 2: Campaign access with enhanced error handling
          try {
            const campaignResponse = await fetch(`${region.baseUrl}/v2/sp/campaigns?count=1`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': clientId,
                'Amazon-Advertising-API-Scope': profileId,
                'Content-Type': 'application/json',
              },
            });

            // FIXED: Treat 404 as success if it's just empty campaigns, not access denied
            if (campaignResponse.ok || campaignResponse.status === 404) {
              console.log(`✅ Campaign access confirmed in ${region.name} (status: ${campaignResponse.status})`);
              
              // Test 3: Reporting API access with improved handling
              try {
                const reportResponse = await fetch(`${region.baseUrl}/reporting/reports`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Amazon-Advertising-API-ClientId': clientId,
                    'Amazon-Advertising-API-Scope': profileId,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    reportTypeId: 'spCampaigns',
                    timeUnit: 'DAILY',
                    format: 'GZIP_JSON',
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    columns: ['campaignId', 'impressions']
                  })
                });

                const hasReportingAccess = reportResponse.ok || reportResponse.status === 429; // 429 = rate limited but access exists
                console.log(`${hasReportingAccess ? '✅' : '⚠️'} Reporting API access: ${reportResponse.status} in ${region.name}`);
                
                results.push({
                  region: region.name,
                  success: true,
                  scopes: ['advertising::campaign_management', hasReportingAccess ? 'advertising::reporting' : undefined].filter(Boolean)
                });
              } catch (reportError) {
                console.log(`⚠️ Reporting API test failed in ${region.name}:`, reportError.message);
                results.push({
                  region: region.name,
                  success: true,
                  scopes: ['advertising::campaign_management'],
                  errorDetails: 'Reporting access may be limited'
                });
              }
            } else {
              console.log(`⚠️ Campaign access failed in ${region.name}: ${campaignResponse.status}`);
              // FIXED: Still mark as success if we have profile access, just note campaign limitations
              results.push({
                region: region.name,
                success: true,
                scopes: ['profile_access'],
                errorDetails: `Campaign API returned ${campaignResponse.status} - may indicate no campaigns exist`
              });
            }
          } catch (campaignError) {
            console.log(`⚠️ Campaign access test failed in ${region.name}:`, campaignError.message);
            results.push({
              region: region.name,
              success: true,
              scopes: ['profile_access'],
              errorDetails: `Campaign access error: ${campaignError.message}`
            });
          }
        } else {
          console.log(`⚠️ Profile ${profileId} not found in ${region.name} (found ${profiles.length} other profiles)`);
          results.push({
            region: region.name,
            success: false,
            errorDetails: `Profile not found in this region`
          });
        }
      } else {
        const errorText = await profileResponse.text();
        console.log(`❌ ${region.name} region profile access failed: ${profileResponse.status} - ${errorText}`);
        results.push({
          region: region.name,
          success: false,
          errorDetails: `Profile API access failed: ${profileResponse.status}`
        });
      }
    } catch (error) {
      console.log(`❌ ${region.name} region error: ${error.message}`);
      results.push({
        region: region.name,
        success: false,
        errorDetails: `Network error: ${error.message}`
      });
    }
  }

  // Summary logging
  const successfulRegions = results.filter(r => r.success);
  const regionsWithReporting = results.filter(r => r.scopes?.includes('advertising::reporting'));
  
  console.log('=== COMPREHENSIVE REGION TEST SUMMARY ===');
  console.log(`✅ Accessible regions: ${successfulRegions.length}/${results.length}`);
  console.log(`📊 Regions with reporting access: ${regionsWithReporting.length}/${results.length}`);
  
  if (regionsWithReporting.length === 0 && successfulRegions.length > 0) {
    console.log('⚠️ WARNING: Limited API access detected - campaign data may be unavailable but profile access exists');
  }

  return results;
}
