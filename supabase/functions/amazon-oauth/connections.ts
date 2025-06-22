
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ConnectionData, AmazonProfile, TokenResponse } from './types.ts';

export async function createConnections(
  profiles: AmazonProfile[],
  tokenData: TokenResponse,
  userId: string
): Promise<number> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let connectionsCreated = 0;
  
  if (profiles.length > 0) {
    for (const profile of profiles) {
      const connectionData: ConnectionData = {
        user_id: userId,
        profile_id: profile.profileId.toString(),
        profile_name: profile.accountInfo?.name || `Profile ${profile.profileId}`,
        marketplace_id: profile.countryCode || 'US',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        token_expires_at: new Date(Date.now() + ((tokenData.expires_in || 3600) * 1000)).toISOString(),
        status: 'active' as const,
      };

      console.log('Creating connection record for profile:', profile.profileId);

      const { error: insertError } = await supabase
        .from('amazon_connections')
        .insert(connectionData);

      if (!insertError) {
        connectionsCreated++;
      } else {
        console.error('Error storing connection for profile:', profile.profileId, insertError);
      }
    }
  } else {
    // Fallback: create a single connection
    const connectionData: ConnectionData = {
      user_id: userId,
      profile_id: 'profile_' + Date.now(),
      profile_name: 'Amazon Advertising Profile',
      marketplace_id: 'US',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      token_expires_at: new Date(Date.now() + ((tokenData.expires_in || 3600) * 1000)).toISOString(),
      status: 'active' as const,
    };

    console.log('Creating fallback connection record for user:', userId);

    const { error: insertError } = await supabase
      .from('amazon_connections')
      .insert(connectionData);

    if (!insertError) {
      connectionsCreated = 1;
    } else {
      console.error('Error storing fallback connection:', insertError);
      throw new Error(`Failed to store connection: ${insertError.message}`);
    }
  }

  return connectionsCreated;
}
