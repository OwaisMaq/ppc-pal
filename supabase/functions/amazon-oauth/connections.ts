
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
    // Create connections for validated profiles
    for (const profile of profiles) {
      const profileId = profile.profileId?.toString();
      
      const connectionData: ConnectionData = {
        user_id: userId,
        profile_id: profileId,
        profile_name: profile.accountInfo?.name || `Amazon Advertising Profile ${profileId}`,
        marketplace_id: profile.countryCode || 'US',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        token_expires_at: new Date(Date.now() + ((tokenData.expires_in || 3600) * 1000)).toISOString(),
        status: 'active' as const,
      };

      console.log('Creating active connection record for profile:', profileId);

      const { error: insertError } = await supabase
        .from('amazon_connections')
        .insert(connectionData);

      if (!insertError) {
        connectionsCreated++;
        console.log('Successfully created connection for profile:', profileId);
      } else {
        console.error('Error storing connection for profile:', profileId, insertError);
      }
    }
  } else {
    // No accessible profiles - create a connection that provides guidance
    const connectionData: ConnectionData = {
      user_id: userId,
      profile_id: 'advertising_setup_required',
      profile_name: 'Amazon Account - Advertising Setup Required',
      marketplace_id: 'US',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      token_expires_at: new Date(Date.now() + ((tokenData.expires_in || 3600) * 1000)).toISOString(),
      status: 'active' as const, // Keep as active so token can be used for retry attempts
    };

    console.log('Creating advertising-setup-required connection record for user:', userId);

    const { error: insertError } = await supabase
      .from('amazon_connections')
      .insert(connectionData);

    if (!insertError) {
      connectionsCreated = 1;
      console.log('Successfully created setup-required connection');
    } else {
      console.error('Error storing setup-required connection:', insertError);
      throw new Error(`Failed to store connection: ${insertError.message}`);
    }
  }

  return connectionsCreated;
}

export async function retryProfileFetch(connectionId: string): Promise<{success: boolean, profileCount: number, message: string}> {
  console.log('Retrying profile fetch for connection:', connectionId);
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get connection details
  const { data: connection, error } = await supabase
    .from('amazon_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    throw new Error('Connection not found');
  }

  // Check if this connection needs advertising setup
  if (!connection.profile_id?.includes('setup_required') && !connection.profile_id?.includes('needs_setup')) {
    throw new Error('This connection does not need profile retry');
  }

  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  if (!clientId) {
    throw new Error('Amazon Client ID not configured');
  }

  // Retry fetching profiles
  const profiles = await fetchAdvertisingProfiles(connection.access_token, clientId);
  
  if (profiles.length === 0) {
    console.log('Still no profiles found on retry');
    return {
      success: false,
      profileCount: 0,
      message: 'No advertising profiles found. Please ensure your Amazon Advertising account is set up at advertising.amazon.com'
    };
  }

  // Update the connection with the first valid profile
  const firstProfile = profiles[0];
  const profileId = firstProfile.profileId?.toString();
  
  const { error: updateError } = await supabase
    .from('amazon_connections')
    .update({
      profile_id: profileId,
      profile_name: firstProfile.accountInfo?.name || `Amazon Advertising Profile ${profileId}`,
      marketplace_id: firstProfile.countryCode || connection.marketplace_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', connectionId);

  if (updateError) {
    console.error('Error updating connection:', updateError);
    throw new Error('Failed to update connection with new profile');
  }

  // Create additional connections for any remaining profiles
  let additionalConnections = 0;
  if (profiles.length > 1) {
    for (let i = 1; i < profiles.length; i++) {
      const profile = profiles[i];
      const additionalConnectionData: ConnectionData = {
        user_id: connection.user_id,
        profile_id: profile.profileId?.toString(),
        profile_name: profile.accountInfo?.name || `Amazon Advertising Profile ${profile.profileId}`,
        marketplace_id: profile.countryCode || 'US',
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        token_expires_at: connection.token_expires_at,
        status: 'active' as const,
      };

      const { error: insertError } = await supabase
        .from('amazon_connections')
        .insert(additionalConnectionData);

      if (!insertError) {
        additionalConnections++;
      }
    }
  }

  console.log(`Successfully updated connection and created ${additionalConnections} additional connections`);
  
  return {
    success: true,
    profileCount: profiles.length,
    message: `Successfully found and connected ${profiles.length} advertising profile(s)!`
  };
}
