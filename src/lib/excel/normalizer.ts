
import { EntityType } from './types';
import { AMAZON_PRODUCT_TYPES } from './constants';

export const normalizeAmazonData = (data: any[], entityType: EntityType): any[] => {
  if (!data.length) return data;

  console.log(`Normalizing Amazon data for ${entityType}:`, data.length, 'rows');

  return data.map(row => {
    const normalizedRow: any = {};
    
    // CRITICAL: Ensure consistent Product type - Amazon requires all rows in a sheet to have same product type
    const productType = row['Product'] || 'Sponsored Products';
    normalizedRow['Product'] = AMAZON_PRODUCT_TYPES[productType as keyof typeof AMAZON_PRODUCT_TYPES] || 'Sponsored Products';
    
    // Set correct Entity based on type
    if (entityType === 'keyword') {
      normalizedRow['Entity'] = 'Keyword';
    } else if (entityType === 'campaign') {
      normalizedRow['Entity'] = 'Campaign';
    } else if (entityType === 'adgroup') {
      normalizedRow['Entity'] = 'Ad Group';
    } else if (entityType === 'portfolio') {
      normalizedRow['Entity'] = 'Portfolio';
    }
    
    // Always set Operation to 'update' for Amazon compatibility
    normalizedRow['Operation'] = 'update';

    // Map common fields based on entity type
    if (entityType === 'keyword') {
      normalizedRow['Campaign'] = row['Campaign'] || row['campaign'] || '';
      normalizedRow['Ad Group'] = row['Ad Group'] || row['adgroup'] || row['AdGroup'] || '';
      normalizedRow['Keyword'] = row['Keyword'] || row['keyword'] || row['Keyword text'] || '';
      normalizedRow['Match Type'] = row['Match Type'] || row['Match type'] || row['matchType'] || 'exact';
      normalizedRow['Max Bid'] = row['Max Bid'] || row['Bid'] || row['bid'] || row['Max CPC'] || '0.50';
    } else if (entityType === 'campaign') {
      normalizedRow['Campaign'] = row['Campaign'] || row['campaign'] || '';
      normalizedRow['Campaign Budget'] = row['Campaign Budget'] || row['Budget'] || row['budget'] || '100.00';
      normalizedRow['Campaign Budget Type'] = row['Campaign Budget Type'] || row['Budget Type'] || 'daily';
    } else if (entityType === 'adgroup') {
      normalizedRow['Campaign'] = row['Campaign'] || row['campaign'] || '';
      normalizedRow['Ad Group'] = row['Ad Group'] || row['adgroup'] || row['AdGroup'] || '';
      normalizedRow['Ad Group Default Bid'] = row['Ad Group Default Bid'] || row['Default Bid'] || row['bid'] || '0.50';
    } else if (entityType === 'portfolio') {
      normalizedRow['Portfolio'] = row['Portfolio'] || row['portfolio'] || '';
      normalizedRow['Portfolio Budget'] = row['Portfolio Budget'] || row['Budget'] || row['budget'] || '1000.00';
    }

    return normalizedRow;
  });
};
