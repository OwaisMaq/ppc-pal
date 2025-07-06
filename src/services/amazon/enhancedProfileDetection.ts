
import { AmazonRegionManager, ProfileRegionMapping } from './regionManager';
import { AmazonApiClient, AmazonApiConfig } from './apiClient';

export interface EnhancedProfileDetectionResult {
  success: boolean;
  profiles: any[];
  regionMappings: ProfileRegionMapping[];
  detectionSummary: {
    totalProfilesFound: number;
    regionsDetected: string[];
    primaryRegion: string;
    marketplacesFound: string[];
    detectionStrategy: string;
    syncRecommendations: string[];
  };
  errors: string[];
  warnings: string[];
}

export class EnhancedProfileDetector {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async detectAllProfiles(): Promise<EnhancedProfileDetectionResult> {
    console.log('=== Starting Enhanced Profile Detection ===');
    
    const result: EnhancedProfileDetectionResult = {
      success: false,
      profiles: [],
      regionMappings: [],
      detectionSummary: {
        totalProfilesFound: 0,
        regionsDetected: [],
        primaryRegion: '',
        marketplacesFound: [],
        detectionStrategy: 'multi-region-scan',
        syncRecommendations: []
      },
      errors: [],
      warnings: []
    };

    try {
      // Get all available regions
      const regions = AmazonRegionManager.getAllRegions();
      console.log(`Scanning ${regions.length} regions for profiles...`);

      const allProfiles: any[] = [];
      const regionMappings: ProfileRegionMapping[] = [];
      const regionsWithProfiles: string[] = [];

      // Scan each region for profiles
      for (const region of regions) {
        try {
          console.log(`Scanning region: ${region.name} (${region.code})`);
          
          const apiConfig: AmazonApiConfig = {
            baseUrl: region.apiEndpoint,
            apiVersion: 'v2',
            profileId: '', // Will be set after detection
            marketplaceId: region.defaultMarketplace,
            region: region.code
          };

          const apiClient = new AmazonApiClient(apiConfig, this.accessToken);
          const profileResponse = await apiClient.getProfiles();

          if (profileResponse.success && profileResponse.data) {
            const regionProfiles = Array.isArray(profileResponse.data) 
              ? profileResponse.data 
              : [profileResponse.data];

            console.log(`Found ${regionProfiles.length} profiles in ${region.name}`);

            for (const profile of regionProfiles) {
              // Enhance profile with region information
              const enhancedProfile = {
                ...profile,
                detectedRegion: region.code,
                detectedRegionName: region.name,
                apiEndpoint: region.apiEndpoint
              };

              allProfiles.push(enhancedProfile);

              // Create region mapping
              const mapping = AmazonRegionManager.detectRegionFromProfile(profile);
              if (mapping) {
                mapping.region = region.code; // Ensure correct region
                regionMappings.push(mapping);
              }
            }

            if (regionProfiles.length > 0) {
              regionsWithProfiles.push(region.code);
            }
          } else {
            console.log(`No profiles found in ${region.name}:`, profileResponse.error);
            if (profileResponse.error?.includes('401') || profileResponse.error?.includes('403')) {
              result.warnings.push(`Authentication issues in ${region.name} - may need region-specific permissions`);
            }
          }

        } catch (regionError) {
          console.error(`Error scanning region ${region.name}:`, regionError);
          result.errors.push(`Failed to scan ${region.name}: ${regionError.message}`);
        }

        // Add delay between region scans to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze results
      if (allProfiles.length > 0) {
        result.success = true;
        result.profiles = allProfiles;
        result.regionMappings = regionMappings;

        // Build detection summary
        const uniqueRegions = [...new Set(regionsWithProfiles)];
        const uniqueMarketplaces = [...new Set(regionMappings.map(m => m.marketplace))];
        
        result.detectionSummary = {
          totalProfilesFound: allProfiles.length,
          regionsDetected: uniqueRegions,
          primaryRegion: this.determinePrimaryRegion(regionMappings),
          marketplacesFound: uniqueMarketplaces,
          detectionStrategy: 'multi-region-scan',
          syncRecommendations: this.generateSyncRecommendations(regionMappings)
        };

        console.log('=== Profile Detection Summary ===');
        console.log(`Total profiles found: ${allProfiles.length}`);
        console.log(`Regions with profiles: ${uniqueRegions.join(', ')}`);
        console.log(`Primary region: ${result.detectionSummary.primaryRegion}`);

      } else {
        result.errors.push('No advertising profiles found in any region');
        console.log('No profiles found in any region');
      }

    } catch (error) {
      console.error('Enhanced profile detection failed:', error);
      result.errors.push(`Detection failed: ${error.message}`);
    }

    return result;
  }

  private determinePrimaryRegion(mappings: ProfileRegionMapping[]): string {
    if (mappings.length === 0) return '';

    // Count profiles per region
    const regionCounts = mappings.reduce((acc, mapping) => {
      acc[mapping.region] = (acc[mapping.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Return region with most profiles
    return Object.entries(regionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
  }

  private generateSyncRecommendations(mappings: ProfileRegionMapping[]): string[] {
    const recommendations: string[] = [];
    const regions = [...new Set(mappings.map(m => m.region))];

    if (regions.length === 1) {
      recommendations.push('Single-region setup detected - standard sync strategy recommended');
    } else {
      recommendations.push('Multi-region setup detected - implement region-aware sync strategy');
      recommendations.push('Consider staggered sync times across regions to optimize API usage');
    }

    if (mappings.length > 5) {
      recommendations.push('Large number of profiles detected - implement batch processing');
    }

    const marketplaces = [...new Set(mappings.map(m => m.marketplace))];
    if (marketplaces.length > regions.length) {
      recommendations.push('Multiple marketplaces per region detected - ensure marketplace-specific configurations');
    }

    return recommendations;
  }
}
