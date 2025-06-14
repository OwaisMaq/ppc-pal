
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AdvertisingData } from '@/pages/Index';

// Store original workbook structure
interface OriginalWorkbookStructure {
  sheetNames: string[];
  sheetStructures: { [sheetName: string]: any };
  originalWorkbook: XLSX.WorkBook;
}

let originalStructure: OriginalWorkbookStructure | null = null;

// Amazon required headers for each entity type
const AMAZON_REQUIRED_HEADERS = {
  keyword: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Max Bid'
  ],
  campaign: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Campaign Budget', 'Campaign Budget Type'
  ],
  adgroup: [
    'Product', 'Entity', 'Operation', 'Campaign', 'Ad Group', 'Ad Group Default Bid'
  ],
  portfolio: [
    'Product', 'Entity', 'Operation', 'Portfolio', 'Portfolio Budget'
  ]
};

// Valid Amazon product types
const AMAZON_PRODUCT_TYPES = {
  'Sponsored Products': 'Sponsored Products',
  'Sponsored Brands': 'Sponsored Brands', 
  'Sponsored Display': 'Sponsored Display'
};

export const parseExcelFile = async (file: File): Promise<AdvertisingData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        console.log("Workbook sheets:", workbook.SheetNames);
        
        // Store original structure for later export
        originalStructure = {
          sheetNames: [...workbook.SheetNames],
          sheetStructures: {},
          originalWorkbook: workbook
        };

        const result: AdvertisingData = {
          portfolios: [],
          campaigns: [],
          adGroups: [],
          keywords: []
        };

        // Parse each sheet and store original structure
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Store original sheet structure with exact headers
          const originalHeaders = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          originalStructure!.sheetStructures[sheetName] = {
            originalData: jsonData,
            headers: originalHeaders,
            range: worksheet['!ref'] || 'A1'
          };
          
          console.log(`Sheet ${sheetName} headers:`, originalHeaders);
          console.log(`Sheet ${sheetName} has ${jsonData.length} rows`);
          
          // Determine data type based on Entity column or sheet content
          const entityTypes = jsonData.map((row: any) => row.Entity || '').filter(Boolean);
          const uniqueEntities = [...new Set(entityTypes)];
          
          console.log(`Sheet ${sheetName} entities:`, uniqueEntities);
          
          // Classify based on Entity column values (Amazon standard)
          if (uniqueEntities.includes('Keyword') || uniqueEntities.includes('Product Targeting')) {
            result.keywords = [...result.keywords, ...jsonData];
          } else if (uniqueEntities.includes('Campaign')) {
            result.campaigns = [...result.campaigns, ...jsonData];
          } else if (uniqueEntities.includes('Ad Group')) {
            result.adGroups = [...result.adGroups, ...jsonData];
          } else if (uniqueEntities.includes('Portfolio')) {
            result.portfolios = [...result.portfolios, ...jsonData];
          } else {
            // Fallback to sheet name analysis
            const lowerSheetName = sheetName.toLowerCase();
            if (lowerSheetName.includes('keyword') || lowerSheetName.includes('targeting')) {
              result.keywords = [...result.keywords, ...jsonData];
            } else if (lowerSheetName.includes('campaign')) {
              result.campaigns = [...result.campaigns, ...jsonData];
            } else if (lowerSheetName.includes('adgroup') || lowerSheetName.includes('ad group')) {
              result.adGroups = [...result.adGroups, ...jsonData];
            } else if (lowerSheetName.includes('portfolio')) {
              result.portfolios = [...result.portfolios, ...jsonData];
            } else {
              // Default to keywords if uncertain
              result.keywords = [...result.keywords, ...jsonData];
            }
          }
        });

        console.log("Parsed data:", result);
        resolve(result);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(error);
    };
    
    reader.readAsBinaryString(file);
  });
};

const normalizeAmazonData = (data: any[], entityType: string): any[] => {
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

const createAmazonCompatibleSheet = (data: any[], entityType: string, sheetName: string) => {
  if (!data.length) {
    console.log(`No data for ${entityType} sheet: ${sheetName}`);
    return XLSX.utils.json_to_sheet([]);
  }

  // Normalize data for Amazon format
  const normalizedData = normalizeAmazonData(data, entityType);
  
  // Get required headers for this entity type
  const requiredHeaders = AMAZON_REQUIRED_HEADERS[entityType as keyof typeof AMAZON_REQUIRED_HEADERS] || AMAZON_REQUIRED_HEADERS.keyword;
  
  // Ensure all rows have all required columns with default values
  const completeData = normalizedData.map(row => {
    const completeRow: any = {};
    
    // Add all required headers in correct order
    requiredHeaders.forEach(header => {
      completeRow[header] = row[header] || '';
    });
    
    return completeRow;
  });

  console.log(`Creating ${entityType} sheet with ${completeData.length} rows and headers:`, requiredHeaders);
  
  // Create worksheet with exact Amazon header order
  return XLSX.utils.json_to_sheet(completeData, {
    header: requiredHeaders
  });
};

export const exportToExcel = async (data: AdvertisingData) => {
  try {
    if (!originalStructure) {
      throw new Error("Original file structure not found. Please upload a file first.");
    }

    const workbook = XLSX.utils.book_new();

    // Group data by product type to ensure Amazon compatibility
    const dataByProductType = {
      'Sponsored Products': {
        keywords: data.keywords.filter(k => !k.Product || k.Product === 'Sponsored Products'),
        campaigns: data.campaigns.filter(c => !c.Product || c.Product === 'Sponsored Products'),
        adGroups: data.adGroups.filter(a => !a.Product || a.Product === 'Sponsored Products'),
        portfolios: data.portfolios.filter(p => !p.Product || p.Product === 'Sponsored Products')
      },
      'Sponsored Brands': {
        keywords: data.keywords.filter(k => k.Product === 'Sponsored Brands'),
        campaigns: data.campaigns.filter(c => c.Product === 'Sponsored Brands'),
        adGroups: data.adGroups.filter(a => a.Product === 'Sponsored Brands'),
        portfolios: data.portfolios.filter(p => p.Product === 'Sponsored Brands')
      },
      'Sponsored Display': {
        keywords: data.keywords.filter(k => k.Product === 'Sponsored Display'),
        campaigns: data.campaigns.filter(c => c.Product === 'Sponsored Display'),
        adGroups: data.adGroups.filter(a => a.Product === 'Sponsored Display'),
        portfolios: data.portfolios.filter(p => p.Product === 'Sponsored Display')
      }
    };

    // Create separate sheets for each entity type and product type combination
    Object.entries(dataByProductType).forEach(([productType, typeData]) => {
      if (typeData.keywords.length > 0) {
        const worksheet = createAmazonCompatibleSheet(typeData.keywords, 'keyword', `${productType} Keywords`);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${productType} Keywords`);
      }
      
      if (typeData.campaigns.length > 0) {
        const worksheet = createAmazonCompatibleSheet(typeData.campaigns, 'campaign', `${productType} Campaigns`);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${productType} Campaigns`);
      }
      
      if (typeData.adGroups.length > 0) {
        const worksheet = createAmazonCompatibleSheet(typeData.adGroups, 'adgroup', `${productType} Ad Groups`);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${productType} Ad Groups`);
      }
      
      if (typeData.portfolios.length > 0) {
        const worksheet = createAmazonCompatibleSheet(typeData.portfolios, 'portfolio', `${productType} Portfolios`);
        XLSX.utils.book_append_sheet(workbook, worksheet, `${productType} Portfolios`);
      }
    });

    // If no sheets were created, create a default keywords sheet
    if (workbook.SheetNames.length === 0) {
      console.log("No valid data found, creating default Sponsored Products Keywords sheet");
      const defaultData = data.keywords.length > 0 ? data.keywords : [{}];
      const worksheet = createAmazonCompatibleSheet(defaultData, 'keyword', 'Sponsored Products Keywords');
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sponsored Products Keywords');
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(dataBlob, `amazon-ads-optimized-${timestamp}.xlsx`);
    
    console.log("Excel export completed successfully with Amazon-compatible format");
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw error;
  }
};
