
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

  // Fetch advertising profiles with enhanced error handling
  console.log('Attempting to fetch advertising profiles...');
  const profiles = await fetchAdvertisingProfiles(tokenData.access_token, clientId);

  if (profiles.length === 0) {
    console.warn('No advertising profiles found for this Amazon account');
    
    // Create a connection with 'needs_setup' status instead of creating dummy profile
    const connectionsCreated = await createConnections([], tokenData, userId);
    
    return {
      success: true,
      profileCount: 0,
      warning: "Amazon account connected, but no advertising profiles were found. You may need to set up Amazon Advertising first, or contact support if you believe this is an error.",
      message: "Connected successfully but requires additional setup."
    };
  }

  // Validate profiles have real profile IDs
  const validProfiles = profiles.filter(profile => {
    const profileId = profile.profileId?.toString();
    return profileId && !profileId.startsWith('profile_') && profileId !== 'unknown';
  });

  if (validProfiles.length === 0) {
    console.warn('No valid advertising profiles found (all profiles have invalid IDs)');
    throw new Error('Unable to retrieve valid advertising profile information from Amazon. Please ensure your Amazon Advertising account is properly set up.');
  }

  if (validProfiles.length < profiles.length) {
    console.warn(`Found ${profiles.length} profiles but only ${validProfiles.length} are valid`);
  }

  // Create connection records with valid profiles only
  const connectionsCreated = await createConnections(validProfiles, tokenData, userId);

  console.log('Successfully created connections:', connectionsCreated);
  
  return {
    success: true, 
    profileCount: connectionsCreated,
    message: `Successfully connected ${connectionsCreated} Amazon Advertising profile(s).`
  };
}
