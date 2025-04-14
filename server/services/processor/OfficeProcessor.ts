/**
 * Office Document Processor
 * 
 * Specialized processor for Microsoft Office and OpenDocument formats
 * including Word, Excel, PowerPoint, and their OpenDocument equivalents.
 */

import { 
  ProcessorBase, 
  ProcessingOptions, 
  DocumentMetadata,
  DocumentSource
} from './ProcessorBase';
import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph } from 'docx';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import sharp from 'sharp';

// Office document processing options
interface OfficeProcessingOptions extends ProcessingOptions {
  extractMacros?: boolean;
  extractComments?: boolean;
  extractRevisions?: boolean;
  extractHiddenContent?: boolean;
  extractSheets?: boolean; // For spreadsheets
  extractSlides?: boolean; // For presentations
  extractImages?: boolean;
  maxCellsToProcess?: number; // For spreadsheets
}

// Default Office options
const OFFICE_DEFAULT_OPTIONS: Partial<OfficeProcessingOptions> = {
  extractMacros: false, // Potentially unsafe
  extractComments: true,
  extractRevisions: true,
  extractHiddenContent: true,
  extractSheets: true,
  extractSlides: true,
  extractImages: true,
  maxCellsToProcess: 10000 // Prevent processing huge spreadsheets
};

/**
 * Office document processor implementation
 */
export class OfficeProcessor extends ProcessorBase {
  protected options: OfficeProcessingOptions;
  
  constructor(options: Partial<OfficeProcessingOptions>) {
    // Merge with Office-specific defaults
    super({ ...OFFICE_DEFAULT_OPTIONS, ...options });
    this.options = this.options as OfficeProcessingOptions;
  }
  
  /**
   * Extract metadata from an Office document
   */
  protected async extractMetadata(filePath: string, baseMetadata: DocumentMetadata): Promise<DocumentMetadata> {
    try {
      // Determine the file type by extension
      const extension = baseMetadata.fileExtension.toLowerCase();
      
      let metadata: DocumentMetadata = {
        ...baseMetadata,
        title: baseMetadata.title || path.basename(filePath)
      };
      
      // Process based on document type
      if (['doc', 'docx', 'odt'].includes(extension)) {
        // Word processing document
        metadata = await this.extractWordMetadata(filePath, metadata);
      } 
      else if (['xls', 'xlsx', 'ods'].includes(extension)) {
        // Spreadsheet
        metadata = await this.extractSpreadsheetMetadata(filePath, metadata);
      } 
      else if (['ppt', 'pptx', 'odp'].includes(extension)) {
        // Presentation
        metadata = await this.extractPresentationMetadata(filePath, metadata);
      }
      
      return metadata;
    } catch (error) {
      console.error('Error extracting Office document metadata:', error);
      // Return base metadata if extraction fails
      return {
        ...baseMetadata,
        title: baseMetadata.title || path.basename(filePath)
      };
    }
  }
  
  /**
   * Extract text content from an Office document
   */
  protected async extractText(filePath: string, metadata: DocumentMetadata): Promise<string> {
    try {
      // Determine the file type by extension
      const extension = metadata.fileExtension.toLowerCase();
      
      // Process based on document type
      if (['doc', 'docx', 'odt'].includes(extension)) {
        // Word processing document
        return await this.extractWordText(filePath, metadata);
      } 
      else if (['xls', 'xlsx', 'ods'].includes(extension)) {
        // Spreadsheet
        return await this.extractSpreadsheetText(filePath, metadata);
      } 
      else if (['ppt', 'pptx', 'odp'].includes(extension)) {
        // Presentation
        return await this.extractPresentationText(filePath, metadata);
      }
      
      // Unsupported format
      this.addProcessingMessage(`Unsupported office document format: ${extension}`);
      return '';
    } catch (error) {
      console.error('Error extracting office document text:', error);
      return '';
    }
  }
  
  /**
   * Extract structured data from an Office document
   */
  protected async extractStructuredData(filePath: string, metadata: DocumentMetadata): Promise<any> {
    try {
      // Determine the file type by extension
      const extension = metadata.fileExtension.toLowerCase();
      
      // Define the basic structure for the result
      const structuredData: any = {
        documentType: '',
        content: {},
        tables: [],
        charts: [],
        images: [],
        comments: [],
        revisions: []
      };
      
      // Process based on document type
      if (['doc', 'docx', 'odt'].includes(extension)) {
        // Word processing document
        structuredData.documentType = 'wordprocessing';
        // Implementation would expand this with actual document structure
      } 
      else if (['xls', 'xlsx', 'ods'].includes(extension)) {
        // Spreadsheet
        structuredData.documentType = 'spreadsheet';
        structuredData.sheets = await this.extractSpreadsheetData(filePath);
      } 
      else if (['ppt', 'pptx', 'odp'].includes(extension)) {
        // Presentation
        structuredData.documentType = 'presentation';
        // Implementation would add slides, layouts, etc.
      }
      
      return structuredData;
    } catch (error) {
      console.error('Error extracting office document structured data:', error);
      return {};
    }
  }
  
  /**
   * Generate a thumbnail for the Office document
   */
  protected async generateThumbnail(filePath: string, metadata: DocumentMetadata): Promise<string> {
    // Office documents don't have a straightforward way to create thumbnails
    // without using external tools or libraries
    
    this.addProcessingMessage('Office document thumbnail generation requires additional libraries');
    
    // Placeholder - return an empty path
    return '';
  }
  
  /**
   * Generate a preview for the Office document
   */
  protected async generatePreview(filePath: string, metadata: DocumentMetadata): Promise<string> {
    // Similarly to thumbnails, previews for Office docs need specialized tools
    
    this.addProcessingMessage('Office document preview generation requires additional libraries');
    
    // Placeholder - return an empty path
    return '';
  }
  
  /**
   * Process OCR for office documents with embedded images
   */
  protected async processOcr(filePath: string, options: { language: string }): Promise<string> {
    // This could be used to OCR charts or images within office documents
    // For now, it's just a placeholder
    
    this.addProcessingMessage('OCR for office documents not implemented');
    
    return '';
  }
  
  /**
   * Extract metadata from a Word document
   */
  private async extractWordMetadata(filePath: string, baseMetadata: DocumentMetadata): Promise<DocumentMetadata> {
    // This is a simplified implementation
    // A complete solution would use more robust docx parsing
    
    const metadata: DocumentMetadata = {
      ...baseMetadata,
      formatSpecific: {
        ...baseMetadata.formatSpecific,
        office: {
          application: 'Microsoft Word',
          // Other Word-specific metadata
        }
      }
    };
    
    // For docx files, we could unzip and parse the core.xml file
    // For simplicity, we just make a note
    this.addProcessingMessage('Word document metadata extraction is limited');
    
    return metadata;
  }
  
  /**
   * Extract metadata from a Spreadsheet
   */
  private async extractSpreadsheetMetadata(filePath: string, baseMetadata: DocumentMetadata): Promise<DocumentMetadata> {
    try {
      // Use exceljs for more detailed metadata
      const workbook = new ExcelJS.Workbook();
      
      // Handle different file types
      if (baseMetadata.fileExtension === 'xlsx') {
        await workbook.xlsx.readFile(filePath);
      } else if (baseMetadata.fileExtension === 'csv') {
        await workbook.csv.readFile(filePath);
      } else {
        // Fall back to less detailed XLSX library for other formats
        const workbookXLSX = XLSX.readFile(filePath);
        return {
          ...baseMetadata,
          title: workbookXLSX.Props?.Title || baseMetadata.title || path.basename(filePath),
          author: workbookXLSX.Props?.Author,
          createdAt: workbookXLSX.Props?.CreatedDate,
          pageCount: workbookXLSX.SheetNames.length, // Count sheets as pages
          formatSpecific: {
            ...baseMetadata.formatSpecific,
            office: {
              application: 'Spreadsheet',
              sheets: workbookXLSX.SheetNames
            }
          }
        };
      }
      
      // Extract metadata
      const metadata: DocumentMetadata = {
        ...baseMetadata,
        title: workbook.title || baseMetadata.title || path.basename(filePath),
        author: workbook.creator,
        createdAt: workbook.created,
        modifiedAt: workbook.modified,
        pageCount: workbook.worksheets.length, // Count sheets as pages
        formatSpecific: {
          ...baseMetadata.formatSpecific,
          office: {
            application: 'Microsoft Excel',
            applicationVersion: workbook.lastModifiedBy,
            company: workbook.company,
            manager: workbook.manager,
            sheets: workbook.worksheets.map(sheet => sheet.name)
          }
        }
      };
      
      return metadata;
    } catch (error) {
      console.error('Error extracting spreadsheet metadata:', error);
      return baseMetadata;
    }
  }
  
  /**
   * Extract metadata from a Presentation
   */
  private async extractPresentationMetadata(filePath: string, baseMetadata: DocumentMetadata): Promise<DocumentMetadata> {
    // Presentation parsing requires specialized libraries
    
    this.addProcessingMessage('Presentation metadata extraction is limited');
    
    // Return basic metadata
    return {
      ...baseMetadata,
      title: baseMetadata.title || path.basename(filePath),
      formatSpecific: {
        ...baseMetadata.formatSpecific,
        office: {
          application: 'Presentation Software'
        }
      }
    };
  }
  
  /**
   * Extract text from a Word document
   */
  private async extractWordText(filePath: string, metadata: DocumentMetadata): Promise<string> {
    // For a robust implementation, we would use a specialized library
    // for parsing docx/doc files
    
    this.addProcessingMessage('Word document text extraction requires additional libraries');
    
    // For now, we use the XLSX library's basic text extraction
    try {
      // This only works for docx format
      if (metadata.fileExtension === 'docx') {
        const content = await fs.promises.readFile(filePath);
        // Simplified approach - a complete solution would parse the XML
        return content.toString('utf8').replace(/<[^>]+>/g, ' ');
      }
      
      return '';
    } catch (error) {
      console.error('Error extracting Word document text:', error);
      return '';
    }
  }
  
  /**
   * Extract text from a Spreadsheet
   */
  private async extractSpreadsheetText(filePath: string, metadata: DocumentMetadata): Promise<string> {
    try {
      // Use XLSX for text extraction
      const workbook = XLSX.readFile(filePath);
      
      let text = '';
      
      // Process each sheet
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        
        // Add sheet name
        text += `Sheet: ${sheetName}\n\n`;
        
        // Convert sheet to JSON for easier processing
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Convert the data to text
        for (let row of jsonData as any[][]) {
          text += row.join('\t') + '\n';
        }
        
        text += '\n\n';
      });
      
      return text;
    } catch (error) {
      console.error('Error extracting spreadsheet text:', error);
      return '';
    }
  }
  
  /**
   * Extract text from a Presentation
   */
  private async extractPresentationText(filePath: string, metadata: DocumentMetadata): Promise<string> {
    this.addProcessingMessage('Presentation text extraction requires additional libraries');
    
    // Placeholder
    return '';
  }
  
  /**
   * Extract structured data from a spreadsheet
   */
  private async extractSpreadsheetData(filePath: string): Promise<any[]> {
    try {
      // Use XLSX for data extraction
      const workbook = XLSX.readFile(filePath);
      
      const sheets: any[] = [];
      
      // Process each sheet
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Add to sheets collection
        sheets.push({
          name: sheetName,
          data: jsonData
        });
      });
      
      return sheets;
    } catch (error) {
      console.error('Error extracting spreadsheet data:', error);
      return [];
    }
  }
}