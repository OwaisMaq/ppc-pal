
import type { AmazonProfile } from './types.ts';

export async function fetchAdvertisingProfiles(
  accessToken: string,
  clientId: string
): Promise<AmazonProfile[]> {
  console.log('Fetching advertising profiles...');
  
  const profilesResponse = await fetch('https://advertising-api.amazon.com/v2/profiles', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId': clientId,
    },
  });

  if (profilesResponse.ok) {
    const profiles = await profilesResponse.json();
    console.log('Retrieved profiles:', profiles.length);
    return profiles;
  } else {
    console.log('Failed to fetch profiles, will create basic connection');
    return [];
  }
}
