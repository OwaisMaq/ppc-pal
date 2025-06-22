
import type { OAuthInitiateRequest } from './types.ts';
import { getAmazonCredentials } from './config.ts';

export function handleOAuthInitiate(request: OAuthInitiateRequest, userId: string) {
  console.log('Amazon OAuth action:', request.action);
  
  const { clientId } = getAmazonCredentials();
  console.log('Client ID found, length:', clientId.length);
  console.log('Redirect URI:', request.redirectUri);

  const stateParam = `${userId}_${Date.now()}`;
  
  const authUrl = `https://www.amazon.com/ap/oa?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `scope=advertising::campaign_management&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(request.redirectUri)}&` +
    `state=${encodeURIComponent(stateParam)}`;

  console.log('Generated auth URL for user:', userId);
  console.log('State parameter:', stateParam);
  console.log('Using advertising scope for full API access');
  
  return {
    authUrl,
    state: stateParam,
    message: 'Using Amazon Advertising API scope for full functionality.'
  };
}
