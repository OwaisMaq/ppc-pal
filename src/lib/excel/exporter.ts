
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AdvertisingData } from '@/pages/Index';
import { getOriginalStructure } from './parser';

const recreateOriginalSheet = (originalData: any[], optimizedData: any[], sheetName: string) => {
  if (!originalData.length) {
    console.log(`No original data for sheet: ${sheetName}`);
    return XLSX.utils.json_to_sheet([]);
  }

  // Get the original headers from the first row of original data
  const originalHeaders = Object.keys(originalData[0]);
  console.log(`Recreating sheet ${sheetName} with original headers:`, originalHeaders);

  // Create a mapping of optimized data by a unique identifier (if available)
  const optimizedDataMap = new Map();
  optimizedData.forEach(row => {
    // Try different possible ID fields for mapping
    const id = row['Campaign ID'] || row['Ad Group ID'] || row['Portfolio ID'] || 
               row['Campaign Name'] || row['Ad Group Name'] || row['Portfolio Name'] ||
               row['Keyword or Product Targeting'] || row['SKU'] || row['ASIN'];
    if (id) {
      optimizedDataMap.set(id, row);
    }
  });

  // Recreate the sheet with original structure but optimized values where applicable
  const recreatedData = originalData.map(originalRow => {
    const newRow: any = {};
    
    // Start with all original data
    originalHeaders.forEach(header => {
      newRow[header] = originalRow[header];
    });

    // Find matching optimized data and apply optimizations
    const id = originalRow['Campaign ID'] || originalRow['Ad Group ID'] || originalRow['Portfolio ID'] || 
               originalRow['Campaign Name'] || originalRow['Ad Group Name'] || originalRow['Portfolio Name'] ||
               originalRow['Keyword or Product Targeting'] || originalRow['SKU'] || originalRow['ASIN'];
    
    if (id && optimizedDataMap.has(id)) {
      const optimizedRow = optimizedDataMap.get(id);
      
      // Apply optimized bid values while preserving original field names
      if (originalRow['Ad Group Default Bid'] !== undefined && optimizedRow['Ad Group Default Bid'] !== undefined) {
        newRow['Ad Group Default Bid'] = optimizedRow['Ad Group Default Bid'];
      }
      if (originalRow['Bid'] !== undefined && optimizedRow['Bid'] !== undefined) {
        newRow['Bid'] = optimizedRow['Bid'];
      }
      if (originalRow['Max CPC'] !== undefined && optimizedRow['Max CPC'] !== undefined) {
        newRow['Max CPC'] = optimizedRow['Max CPC'];
      }
      if (originalRow['Max Bid'] !== undefined && optimizedRow['Max Bid'] !== undefined) {
        newRow['Max Bid'] = optimizedRow['Max Bid'];
      }
      
      // Apply optimized match type if it exists
      if (originalRow['Match Type'] !== undefined && optimizedRow['Match Type'] !== undefined) {
        newRow['Match Type'] = optimizedRow['Match Type'];
      }
    }

    return newRow;
  });

  console.log(`Created sheet ${sheetName} with ${recreatedData.length} rows`);
  
  // Create worksheet with exact original header order
  return XLSX.utils.json_to_sheet(recreatedData, {
    header: originalHeaders
  });
};

export const exportToExcel = async (data: AdvertisingData) => {
  try {
    const originalStructure = getOriginalStructure();
    
    if (!originalStructure) {
      throw new Error("Original file structure not found. Please upload a file first.");
    }

    console.log("Original structure found with sheets:", originalStructure.sheetNames);
    const workbook = XLSX.utils.book_new();

    // Recreate each original sheet with the exact same structure
    originalStructure.sheetNames.forEach(sheetName => {
      const originalSheetData = originalStructure.sheetStructures[sheetName]?.originalData || [];
      
      // Determine which optimized data to use based on sheet content analysis
      let optimizedDataToUse: any[] = [];
      
      // Match optimized data to original sheets based on content
      const lowerSheetName = sheetName.toLowerCase();
      if (lowerSheetName.includes('portfolio')) {
        optimizedDataToUse = data.portfolios;
      } else if (lowerSheetName.includes('campaign') || lowerSheetName.includes('sponsored')) {
        // For campaign sheets, use a combination of campaigns, ad groups, and keywords
        optimizedDataToUse = [
          ...data.campaigns,
          ...data.adGroups,
          ...data.keywords
        ];
      } else {
        // Default to keywords for any unrecognized sheets
        optimizedDataToUse = data.keywords;
      }

      const worksheet = recreateOriginalSheet(originalSheetData, optimizedDataToUse, sheetName);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // If no sheets were created, throw an error
    if (workbook.SheetNames.length === 0) {
      throw new Error("Failed to recreate any sheets from original structure");
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download file with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(dataBlob, `amazon-ads-optimized-${timestamp}.xlsx`);
    
    console.log("Excel export completed successfully with original file structure preserved");
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw error;
  }
};
