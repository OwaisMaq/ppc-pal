
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
    // Create connections for valid profiles
    for (const profile of profiles) {
      const profileId = profile.profileId?.toString();
      
      // Additional validation to ensure we don't store invalid profile IDs
      if (!profileId || profileId.startsWith('profile_') || profileId === 'unknown') {
        console.warn('Skipping invalid profile:', profile);
        continue;
      }

      const connectionData: ConnectionData = {
        user_id: userId,
        profile_id: profileId,
        profile_name: profile.accountInfo?.name || `Profile ${profileId}`,
        marketplace_id: profile.countryCode || 'US',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        token_expires_at: new Date(Date.now() + ((tokenData.expires_in || 3600) * 1000)).toISOString(),
        status: 'active' as const,
      };

      console.log('Creating connection record for profile:', profileId);

      const { error: insertError } = await supabase
        .from('amazon_connections')
        .insert(connectionData);

      if (!insertError) {
        connectionsCreated++;
      } else {
        console.error('Error storing connection for profile:', profileId, insertError);
      }
    }
  } else {
    // No valid profiles - create a connection that needs setup
    const connectionData: ConnectionData = {
      user_id: userId,
      profile_id: 'needs_setup',
      profile_name: 'Amazon Account - Setup Required',
      marketplace_id: 'US',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      token_expires_at: new Date(Date.now() + ((tokenData.expires_in || 3600) * 1000)).toISOString(),
      status: 'error' as const,
    };

    console.log('Creating setup-required connection record for user:', userId);

    const { error: insertError } = await supabase
      .from('amazon_connections')
      .insert(connectionData);

    if (!insertError) {
      connectionsCreated = 1;
    } else {
      console.error('Error storing setup-required connection:', insertError);
      throw new Error(`Failed to store connection: ${insertError.message}`);
    }
  }

  return connectionsCreated;
}
