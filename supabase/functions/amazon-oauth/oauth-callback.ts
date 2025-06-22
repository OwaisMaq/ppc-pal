
import type { OAuthCallbackRequest } from './types.ts';
import { getAmazonCredentials } from './config.ts';
import { exchangeCodeForTokens } from './token-exchange.ts';
import { fetchAdvertisingProfiles, validateProfileAccess } from './profiles.ts';
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
    console.warn('No advertising profiles found - this may indicate the account needs Amazon Advertising setup');
    
    // Create a connection with 'needs_setup' status that provides clear guidance
    const connectionsCreated = await createConnections([], tokenData, userId);
    
    return {
      success: true,
      profileCount: 0,
      warning: "Your Amazon account was connected successfully, but no Amazon Advertising profiles were found. This usually means:\n\n1. You haven't set up Amazon Advertising yet - please visit advertising.amazon.com to create your advertising account\n2. You may need to wait a few minutes after setting up advertising for profiles to become available\n3. Your advertising account may be pending approval\n\nOnce your advertising account is active, please reconnect to import your campaigns.",
      message: "Connected - Amazon Advertising setup required"
    };
  }

  // Validate profiles have real profile IDs and are accessible
  const validatedProfiles = [];
  
  for (const profile of profiles) {
    const profileId = profile.profileId?.toString();
    
    if (!profileId || profileId.startsWith('profile_') || profileId === 'unknown') {
      console.warn('Skipping invalid profile ID:', profileId);
      continue;
    }

    // Test if we can actually access this profile
    console.log('Validating access for profile:', profileId);
    const hasAccess = await validateProfileAccess(tokenData.access_token, clientId, profileId);
    
    if (hasAccess) {
      validatedProfiles.push(profile);
      console.log('Profile validated successfully:', profileId);
    } else {
      console.warn('Profile validation failed for:', profileId);
    }
  }

  if (validatedProfiles.length === 0) {
    console.warn('No accessible advertising profiles found after validation');
    
    // Create connection with detailed error information
    const connectionsCreated = await createConnections([], tokenData, userId);
    
    return {
      success: true,
      profileCount: 0,
      warning: "Amazon account connected but advertising profiles are not accessible. This could mean:\n\n1. Your advertising account is still being set up\n2. You may not have the necessary permissions\n3. Your advertising account may be suspended or pending review\n\nPlease check your Amazon Advertising account status at advertising.amazon.com and try reconnecting once your account is active.",
      message: "Connected - profile access validation failed"
    };
  }

  if (validatedProfiles.length < profiles.length) {
    console.warn(`Found ${profiles.length} profiles but only ${validatedProfiles.length} are accessible`);
  }

  // Create connection records with validated profiles only
  const connectionsCreated = await createConnections(validatedProfiles, tokenData, userId);

  console.log('Successfully created connections:', connectionsCreated);
  
  return {
    success: true, 
    profileCount: connectionsCreated,
    message: `Successfully connected ${connectionsCreated} Amazon Advertising profile(s) with verified access.`
  };
}
