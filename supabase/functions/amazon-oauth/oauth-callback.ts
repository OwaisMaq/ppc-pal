
import type { OAuthCallbackRequest } from './types.ts';
import { getAmazonCredentials } from './config.ts';
import { exchangeCodeForTokens } from './token-exchange.ts';
import { fetchAdvertisingProfiles } from './profiles.ts';
import { createConnections } from './connections.ts';

export async function handleOAuthCallback(
  request: OAuthCallbackRequest,
  userId: string
) {
  console.log('Processing OAuth callback for user:', userId);
  console.log('Received code length:', request.code?.length || 0);
  console.log('Received state:', request.state);
  
  if (!request.code) {
    console.error('No authorization code received');
    throw new Error('No authorization code received');
  }

  if (!request.state) {
    console.error('No state parameter received');
    throw new Error('No state parameter received');
  }

  // Verify state parameter contains user ID
  const stateUserId = request.state.split('_')[0];
  if (stateUserId !== userId) {
    console.error('State parameter user ID mismatch. Expected:', userId, 'Got:', stateUserId);
    throw new Error('Invalid state parameter');
  }

  const { clientId } = getAmazonCredentials();

  // Exchange code for tokens
  const tokenData = await exchangeCodeForTokens(request.code, request.redirectUri);

  // Fetch advertising profiles
  const profiles = await fetchAdvertisingProfiles(tokenData.access_token, clientId);

  // Create connection records
  const connectionsCreated = await createConnections(profiles, tokenData, userId);

  console.log('Successfully created connections:', connectionsCreated);
  
  return {
    success: true, 
    profileCount: connectionsCreated,
    message: `Successfully connected ${connectionsCreated} Amazon Advertising profile(s).`
  };
}
