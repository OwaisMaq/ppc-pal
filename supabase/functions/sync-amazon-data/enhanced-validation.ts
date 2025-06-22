
export async function validateAndRefreshConnection(
  connection: any,
  clientId: string,
  supabase: any
): Promise<{ accessToken: string; isValid: boolean; errorDetails?: string }> {
  console.log('=== ENHANCED CONNECTION VALIDATION ===');
  console.log('Connection ID:', connection.id);
  console.log('Profile ID:', connection.profile_id);
  console.log('Current status:', connection.status);
  console.log('Last sync:', connection.last_sync_at);
  
  // Check if profile ID looks valid
  if (!connection.profile_id || 
      connection.profile_id.includes('setup_required') || 
      connection.profile_id.includes('needs_setup') ||
      connection.profile_id === 'unknown') {
    console.error('Invalid profile ID detected:', connection.profile_id);
    return {
      accessToken: '',
      isValid: false,
      errorDetails: 'Profile ID is invalid or requires setup. Please reconnect your Amazon account.'
    };
  }

  // Check token expiration with buffer
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  const bufferTime = 10 * 60 * 1000; // 10 minutes buffer
  const needsRefresh = now >= new Date(expiresAt.getTime() - bufferTime);

  console.log('Token expiration check:', {
    now: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    needsRefresh
  });

  if (needsRefresh) {
    console.log('Token needs refresh, attempting...');
    
    if (!connection.refresh_token) {
      console.error('No refresh token available');
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
      const refreshResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: clientId,
          client_secret: Deno.env.get('AMAZON_CLIENT_SECRET') ?? '',
        }),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Token refresh failed:', refreshResponse.status, errorText);
        
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

      console.log('✓ Token refreshed successfully');
      return {
        accessToken: refreshData.access_token,
        isValid: true
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        accessToken: '',
        isValid: false,
        errorDetails: `Token refresh failed: ${error.message}`
      };
    }
  }

  console.log('✓ Token is still valid');
  return {
    accessToken: connection.access_token,
    isValid: true
  };
}

export async function testProfileAccessInAllRegions(
  accessToken: string,
  clientId: string,
  profileId: string
): Promise<{ region: string; success: boolean; errorDetails?: string }[]> {
  console.log('=== TESTING PROFILE ACCESS ACROSS ALL REGIONS ===');
  
  const regions = [
    { name: 'NA', baseUrl: 'https://advertising-api.amazon.com' },
    { name: 'EU', baseUrl: 'https://advertising-api-eu.amazon.com' },
    { name: 'FE', baseUrl: 'https://advertising-api-fe.amazon.com' }
  ];

  const results = [];

  for (const region of regions) {
    console.log(`Testing ${region.name} region for profile ${profileId}`);
    
    try {
      const testResponse = await fetch(`${region.baseUrl}/v2/profiles`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      });

      if (testResponse.ok) {
        const profiles = await testResponse.json();
        const profileExists = profiles.some((p: any) => p.profileId?.toString() === profileId);
        
        if (profileExists) {
          console.log(`✓ Profile ${profileId} found and accessible in ${region.name}`);
          results.push({
            region: region.name,
            success: true
          });
        } else {
          console.log(`⚠ Profile ${profileId} not found in ${region.name} (found ${profiles.length} other profiles)`);
          results.push({
            region: region.name,
            success: false,
            errorDetails: `Profile not found in this region`
          });
        }
      } else {
        const errorText = await testResponse.text();
        console.log(`✗ ${region.name} region access failed: ${testResponse.status} - ${errorText}`);
        results.push({
          region: region.name,
          success: false,
          errorDetails: `API access failed: ${testResponse.status}`
        });
      }
    } catch (error) {
      console.log(`✗ ${region.name} region error: ${error.message}`);
      results.push({
        region: region.name,
        success: false,
        errorDetails: `Network error: ${error.message}`
      });
    }
  }

  return results;
}
