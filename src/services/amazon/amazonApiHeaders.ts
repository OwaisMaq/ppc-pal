
export class AmazonApiHeaders {
  static async buildHeaders(accessToken: string, profileId: string, clientId?: string): Promise<Record<string, string>> {
    if (!accessToken) {
      throw new Error('Access token is required for Amazon API calls');
    }
    
    if (!profileId) {
      throw new Error('Profile ID is required for Amazon API calls');
    }
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Amazon-Advertising-API-Scope': profileId
    };
    
    // Add client ID if provided
    if (clientId) {
      headers['Amazon-Advertising-API-ClientId'] = clientId;
    }
    
    return headers;
  }
  
  static validateRequiredHeaders(headers: Record<string, string>): void {
    const required = ['Authorization', 'Amazon-Advertising-API-Scope'];
    
    for (const header of required) {
      if (!headers[header]) {
        throw new Error(`Missing required header: ${header}`);
      }
    }
  }
}
