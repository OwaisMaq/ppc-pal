
export async function refreshTokenIfNeeded(
  connection: any,
  clientId: string,
  supabase: any
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  
  let accessToken = connection.access_token;
  
  if (now >= expiresAt) {
    console.log('Token expired, attempting refresh...');
    
    if (!connection.refresh_token) {
      await supabase
        .from('amazon_connections')
        .update({ status: 'expired' })
        .eq('id', connection.id);
      throw new Error('Token expired and no refresh token available');
    }

    // Try to refresh the token
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
      console.error('Token refresh failed:', await refreshResponse.text());
      await supabase
        .from('amazon_connections')
        .update({ status: 'expired' })
        .eq('id', connection.id);
      throw new Error('Failed to refresh token, please reconnect your account');
    }

    const refreshData = await refreshResponse.json();
    accessToken = refreshData.access_token;

    // Update the connection with new token
    await supabase
      .from('amazon_connections')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || connection.refresh_token,
        token_expires_at: new Date(Date.now() + ((refreshData.expires_in || 3600) * 1000)).toISOString(),
      })
      .eq('id', connection.id);

    console.log('Token refreshed successfully');
  }

  return accessToken;
}
