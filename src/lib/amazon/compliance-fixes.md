# Amazon Ads API Compliance Fixes

## Critical Issues to Address

### 1. Update API Headers for v3 Compliance
```typescript
// Add version header to all v3 API calls
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Amazon-Advertising-API-ClientId': clientId,
  'Amazon-Advertising-API-Scope': profileId,
  'Amazon-Advertising-API-Version': '3.0', // Required for v3 endpoints
  'Content-Type': 'application/json'
}
```

### 2. Fix Data Type Mismatches
```typescript
// Update type definitions to match OpenAPI spec
export interface AmazonConnection {
  profile_id: number; // Changed from string
  // ... other fields
}

export interface Campaign {
  amazon_campaign_id: number; // Changed from string
  // ... other fields
}
```

### 3. Implement Proper Pagination
```typescript
// Add pagination support for large datasets
async function fetchCampaignsPaginated(
  apiEndpoint: string,
  accessToken: string,
  clientId: string,
  profileId: string,
  maxResults = 100
): Promise<any[]> {
  let allCampaigns = [];
  let nextToken: string | undefined;
  
  do {
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      ...(nextToken && { nextToken })
    });
    
    const response = await fetch(`${apiEndpoint}/sp/campaigns?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
        'Amazon-Advertising-API-Version': '3.0'
      }
    });
    
    const data = await response.json();
    allCampaigns.push(...data.campaigns);
    nextToken = data.nextToken;
  } while (nextToken);
  
  return allCampaigns;
}
```

### 4. Enhanced Error Handling
```typescript
// Implement Amazon-specific error handling
function handleAmazonApiError(response: Response, responseText: string) {
  switch (response.status) {
    case 401:
      throw new Error('AMAZON_TOKEN_EXPIRED');
    case 403:
      throw new Error('AMAZON_INSUFFICIENT_PERMISSIONS');
    case 422:
      throw new Error('AMAZON_INVALID_REQUEST');
    case 429:
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`AMAZON_RATE_LIMITED:${retryAfter}`);
    default:
      throw new Error(`AMAZON_API_ERROR:${response.status}:${responseText}`);
  }
}
```

### 5. Dynamic Regional Endpoint Discovery
```typescript
// Determine endpoint from profile data
function getApiEndpointFromProfile(profile: any): string {
  const marketplaceEndpoints = {
    'A2EUQ1WTGCTBG2': 'https://advertising-api.amazon.ca',
    'ATVPDKIKX0DER': 'https://advertising-api.amazon.com',
    'A1AM78C64UM0Y8': 'https://advertising-api.amazon.com.mx',
    'A1PA6795UKMFR9': 'https://advertising-api-eu.amazon.com',
    'A1RKKUPIHCS9HS': 'https://advertising-api-eu.amazon.com',
    'APJ6JRA9NG5V4': 'https://advertising-api-eu.amazon.com',
    // Add more as needed
  };
  
  return marketplaceEndpoints[profile.countryCode] || 
         'https://advertising-api.amazon.com'; // default
}
```

## Implementation Priority

1. **High Priority**: Fix data types and add version headers
2. **Medium Priority**: Implement pagination and enhanced error handling  
3. **Low Priority**: Dynamic endpoint discovery and advanced rate limiting

## Testing Recommendations

1. Test with Amazon's sandbox environment first
2. Verify all API calls include proper version headers
3. Test pagination with large datasets
4. Validate error handling with invalid tokens
