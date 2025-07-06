
export interface AmazonRegion {
  code: string;
  name: string;
  apiEndpoint: string;
  marketplaces: string[];
  defaultMarketplace: string;
  timezone: string;
}

export interface ProfileRegionMapping {
  profileId: string;
  region: string;
  marketplace: string;
  countryCode: string;
}

export class AmazonRegionManager {
  private static readonly REGIONS: AmazonRegion[] = [
    {
      code: 'NA',
      name: 'North America',
      apiEndpoint: 'https://advertising-api.amazon.com',
      marketplaces: ['ATVPDKIKX0DER', 'A2EUQ1WTGCTBG2', 'A1AM78C64UM0Y8'],
      defaultMarketplace: 'ATVPDKIKX0DER', // US
      timezone: 'America/New_York'
    },
    {
      code: 'EU',
      name: 'Europe',
      apiEndpoint: 'https://advertising-api-eu.amazon.com',
      marketplaces: ['A1PA6795UKMFR9', 'A1RKKUPIHCS9HS', 'APJ6JRA9NG5V4', 'A13V1IB3VIYZZH', 'A1F83G8C2ARO7P'],
      defaultMarketplace: 'A1PA6795UKMFR9', // DE
      timezone: 'Europe/Berlin'
    },
    {
      code: 'FE',
      name: 'Far East',
      apiEndpoint: 'https://advertising-api-fe.amazon.com',
      marketplaces: ['A1VC38T7YXB528', 'AAHKV2X7AFYLW', 'A39IBJ37TRP1C6'],
      defaultMarketplace: 'A1VC38T7YXB528', // JP
      timezone: 'Asia/Tokyo'
    }
  ];

  private static readonly MARKETPLACE_TO_REGION: Record<string, string> = {
    // North America
    'ATVPDKIKX0DER': 'NA', // US
    'A2EUQ1WTGCTBG2': 'NA', // CA
    'A1AM78C64UM0Y8': 'NA', // MX
    
    // Europe
    'A1PA6795UKMFR9': 'EU', // DE
    'A1RKKUPIHCS9HS': 'EU', // ES
    'APJ6JRA9NG5V4': 'EU', // IT
    'A13V1IB3VIYZZH': 'EU', // FR
    'A1F83G8C2ARO7P': 'EU', // UK
    'A21TJRUUN4KGV': 'EU', // IN
    
    // Far East
    'A1VC38T7YXB528': 'FE', // JP
    'AAHKV2X7AFYLW': 'FE', // SG
    'A39IBJ37TRP1C6': 'FE'  // AU
  };

  private static readonly COUNTRY_TO_MARKETPLACE: Record<string, string> = {
    'US': 'ATVPDKIKX0DER',
    'CA': 'A2EUQ1WTGCTBG2',
    'MX': 'A1AM78C64UM0Y8',
    'DE': 'A1PA6795UKMFR9',
    'ES': 'A1RKKUPIHCS9HS',
    'IT': 'APJ6JRA9NG5V4',
    'FR': 'A13V1IB3VIYZZH',
    'UK': 'A1F83G8C2ARO7P',
    'GB': 'A1F83G8C2ARO7P',
    'IN': 'A21TJRUUN4KGV',
    'JP': 'A1VC38T7YXB528',
    'SG': 'AAHKV2X7AFYLW',
    'AU': 'A39IBJ37TRP1C6'
  };

  static getAllRegions(): AmazonRegion[] {
    return [...this.REGIONS];
  }

  static getRegionByCode(code: string): AmazonRegion | null {
    return this.REGIONS.find(region => region.code === code) || null;
  }

  static getRegionByMarketplace(marketplaceId: string): AmazonRegion | null {
    const regionCode = this.MARKETPLACE_TO_REGION[marketplaceId];
    return regionCode ? this.getRegionByCode(regionCode) : null;
  }

  static getRegionByCountryCode(countryCode: string): AmazonRegion | null {
    const marketplaceId = this.COUNTRY_TO_MARKETPLACE[countryCode.toUpperCase()];
    return marketplaceId ? this.getRegionByMarketplace(marketplaceId) : null;
  }

  static getMarketplaceByCountryCode(countryCode: string): string | null {
    return this.COUNTRY_TO_MARKETPLACE[countryCode.toUpperCase()] || null;
  }

  static detectRegionFromProfile(profile: any): ProfileRegionMapping | null {
    console.log('Detecting region for profile:', profile);

    // Try to detect from country code
    if (profile.countryCode) {
      const region = this.getRegionByCountryCode(profile.countryCode);
      const marketplace = this.getMarketplaceByCountryCode(profile.countryCode);
      
      if (region && marketplace) {
        return {
          profileId: profile.profileId?.toString() || profile.id?.toString(),
          region: region.code,
          marketplace,
          countryCode: profile.countryCode
        };
      }
    }

    // Try to detect from marketplace ID
    if (profile.accountInfo?.marketplaceStringId) {
      const region = this.getRegionByMarketplace(profile.accountInfo.marketplaceStringId);
      
      if (region) {
        return {
          profileId: profile.profileId?.toString() || profile.id?.toString(),
          region: region.code,
          marketplace: profile.accountInfo.marketplaceStringId,
          countryCode: profile.countryCode || 'UNKNOWN'
        };
      }
    }

    // Try to detect from marketplace string ID (fallback)
    if (profile.marketplaceStringId) {
      const region = this.getRegionByMarketplace(profile.marketplaceStringId);
      
      if (region) {
        return {
          profileId: profile.profileId?.toString() || profile.id?.toString(),
          region: region.code,
          marketplace: profile.marketplaceStringId,
          countryCode: profile.countryCode || 'UNKNOWN'
        };
      }
    }

    console.warn('Could not detect region for profile:', profile);
    return null;
  }

  static getOptimalSyncStrategy(profiles: ProfileRegionMapping[]): {
    strategy: 'single-region' | 'multi-region' | 'parallel-regions';
    regions: string[];
    primaryRegion: string;
    recommendations: string[];
  } {
    const regionCounts = profiles.reduce((acc, profile) => {
      acc[profile.region] = (acc[profile.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const regions = Object.keys(regionCounts);
    const primaryRegion = regions.reduce((a, b) => 
      regionCounts[a] > regionCounts[b] ? a : b
    );

    const recommendations: string[] = [];

    if (regions.length === 1) {
      recommendations.push(`Single region deployment (${primaryRegion}) detected`);
      recommendations.push('Consider expanding to other regions for global reach');
      
      return {
        strategy: 'single-region',
        regions,
        primaryRegion,
        recommendations
      };
    } else if (regions.length <= 3) {
      recommendations.push(`Multi-region setup detected: ${regions.join(', ')}`);
      recommendations.push('Implement region-specific rate limiting');
      recommendations.push('Consider time zone optimization for sync schedules');
      
      return {
        strategy: 'multi-region',
        regions,
        primaryRegion,
        recommendations
      };
    } else {
      recommendations.push('Complex multi-region setup detected');
      recommendations.push('Implement parallel processing for optimal performance');
      recommendations.push('Consider regional data centers for reduced latency');
      
      return {
        strategy: 'parallel-regions',
        regions,
        primaryRegion,
        recommendations
      };
    }
  }
}
