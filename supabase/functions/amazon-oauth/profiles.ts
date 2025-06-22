
import type { AmazonProfile } from './types.ts';

export async function fetchAdvertisingProfiles(
  accessToken: string,
  clientId: string
): Promise<AmazonProfile[]> {
  console.log('Fetching advertising profiles...');
  
  // Try multiple API regions and endpoints
  const regions = [
    { name: 'NA', baseUrl: 'https://advertising-api.amazon.com' },
    { name: 'EU', baseUrl: 'https://advertising-api-eu.amazon.com' },
    { name: 'FE', baseUrl: 'https://advertising-api-fe.amazon.com' }
  ];

  for (const region of regions) {
    try {
      console.log(`Trying ${region.name} region: ${region.baseUrl}`);
      
      const profilesResponse = await fetch(`${region.baseUrl}/v2/profiles`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Content-Type': 'application/json',
        },
      });

      console.log(`${region.name} region response status:`, profilesResponse.status);

      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json();
        console.log(`Retrieved ${profiles.length} profiles from ${region.name} region`);
        
        if (profiles.length > 0) {
          // Validate profiles have required fields
          const validProfiles = profiles.filter((profile: any) => {
            return profile.profileId && 
                   typeof profile.profileId === 'number' && 
                   profile.profileId > 0;
          });
          
          console.log(`${validProfiles.length} valid profiles found in ${region.name}`);
          
          if (validProfiles.length > 0) {
            return validProfiles;
          }
        }
      } else {
        const errorText = await profilesResponse.text();
        console.warn(`${region.name} region failed:`, errorText);
      }
    } catch (error) {
      console.warn(`Error fetching from ${region.name}:`, error.message);
      continue;
    }
  }

  console.warn('No valid advertising profiles found in any region');
  return [];
}

export async function validateProfileAccess(
  accessToken: string,
  clientId: string,
  profileId: string
): Promise<boolean> {
  console.log('Validating profile access for profile:', profileId);
  
  const regions = [
    { name: 'NA', baseUrl: 'https://advertising-api.amazon.com' },
    { name: 'EU', baseUrl: 'https://advertising-api-eu.amazon.com' },
    { name: 'FE', baseUrl: 'https://advertising-api-fe.amazon.com' }
  ];

  for (const region of regions) {
    try {
      console.log(`Testing profile access in ${region.name} region`);
      
      const testResponse = await fetch(`${region.baseUrl}/v2/campaigns?count=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': clientId,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
      });

      if (testResponse.ok) {
        console.log(`Profile ${profileId} is accessible in ${region.name} region`);
        return true;
      } else {
        console.warn(`Profile access test failed in ${region.name}:`, testResponse.status);
      }
    } catch (error) {
      console.warn(`Profile validation error in ${region.name}:`, error.message);
    }
  }

  console.error(`Profile ${profileId} is not accessible in any region`);
  return false;
}
