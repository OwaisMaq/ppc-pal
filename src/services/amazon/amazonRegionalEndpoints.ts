
export class AmazonRegionalEndpoints {
  private static readonly ENDPOINTS = {
    // North America (US, CA, MX, BR)
    NA: 'https://advertising-api.amazon.com',
    // Europe (UK, DE, FR, IT, ES, NL, PL, SE, TR, BE, IN)
    EU: 'https://advertising-api-eu.amazon.com', 
    // Far East / APAC (JP, AU, SG, AE)
    FE: 'https://advertising-api-fe.amazon.com'
  };

  static getEndpointForCountry(countryCode: string): string {
    const country = countryCode?.toUpperCase();
    
    console.log(`=== Determining endpoint for country: ${country} ===`);
    
    switch (country) {
      // North America
      case 'US':
      case 'CA':
      case 'MX':
      case 'BR':
        console.log('Using NA endpoint');
        return this.ENDPOINTS.NA;
        
      // Europe + India
      case 'UK':
      case 'GB':
      case 'DE':
      case 'FR':
      case 'IT':
      case 'ES':
      case 'NL':
      case 'PL':
      case 'SE':
      case 'TR':
      case 'BE':
      case 'IN':
        console.log('Using EU endpoint');
        return this.ENDPOINTS.EU;
        
      // Far East / APAC
      case 'JP':
      case 'AU':
      case 'SG':
      case 'AE':
        console.log('Using FE endpoint');
        return this.ENDPOINTS.FE;
        
      default:
        console.log(`Unknown country code: ${country}, defaulting to NA endpoint`);
        return this.ENDPOINTS.NA;
    }
  }
  
  static getTestEndpoint(): string {
    return 'https://advertising-api-test.amazon.com';
  }
  
  static getAllRegions(): Array<{code: string; endpoint: string; description: string}> {
    return [
      { code: 'NA', endpoint: this.ENDPOINTS.NA, description: 'North America (US, CA, MX, BR)' },
      { code: 'EU', endpoint: this.ENDPOINTS.EU, description: 'Europe + India' },
      { code: 'FE', endpoint: this.ENDPOINTS.FE, description: 'Far East / APAC (JP, AU, SG, AE)' }
    ];
  }
}
