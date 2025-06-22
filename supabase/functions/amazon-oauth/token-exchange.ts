
import type { TokenResponse } from './types.ts';
import { getAmazonCredentials } from './config.ts';

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const { clientId, clientSecret } = getAmazonCredentials();
  
  console.log('Attempting token exchange with Amazon...');

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  console.log('Token request body prepared');

  const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: tokenBody,
  });

  console.log('Token response status:', tokenResponse.status);

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange failed:', errorText);
    throw new Error(`Failed to exchange code for tokens: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('Token exchange successful, token type:', tokenData.token_type);
  
  return tokenData;
}
