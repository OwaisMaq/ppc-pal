
export async function refreshTokenIfNeeded(
  connection: any,
  clientId: string,
  supabase: any
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  
  console.log(`Token check: Current time: ${now.toISOString()}, Expires at: ${expiresAt.toISOString()}`);
  
  let accessToken = connection.access_token;
  
  // Add buffer time (5 minutes) to prevent edge case token expiry during API calls
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  const effectiveExpiryTime = new Date(expiresAt.getTime() - bufferTime);
  
  if (now >= effectiveExpiryTime) {
    console.log('Token expired or expiring soon, attempting refresh...');
    
    if (!connection.refresh_token) {
      console.error('No refresh token available for connection:', connection.id);
      await supabase
        .from('amazon_connections')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);
      throw new Error('Token expired and no refresh token available - please reconnect your Amazon account');
    }

    try {
      // Enhanced token refresh with better error handling
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
        
        // Mark connection as expired
        await supabase
          .from('amazon_connections')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);
          
        throw new Error(`Failed to refresh token (${refreshResponse.status}): ${errorText}. Please reconnect your Amazon account.`);
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      console.log('Token refreshed successfully, expires in:', refreshData.expires_in, 'seconds');

      // Update the connection with new token and proper expiry calculation
      const newExpiryTime = new Date(Date.now() + ((refreshData.expires_in || 3600) * 1000));
      
      const { error: updateError } = await supabase
        .from('amazon_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || connection.refresh_token,
          token_expires_at: newExpiryTime.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      if (updateError) {
        console.error('Failed to update connection with new token:', updateError);
        throw new Error('Token refreshed but failed to save - please try again');
      }

      console.log('✓ Token refresh completed and saved successfully');
    } catch (error) {
      console.error('Token refresh process failed:', error);
      throw error;
    }
  } else {
    console.log('✓ Token is still valid, no refresh needed');
  }

  return accessToken;
}
