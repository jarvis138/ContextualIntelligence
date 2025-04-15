/**
 * Document Processing Service (Fixed Version)
 * 
 * Simplified service for document extraction and processing.
 * Avoids complex PDF.js integrations that can cause issues in the Node.js environment.
 */

import * as Excel from 'exceljs';
import * as xlsx from 'xlsx';
import { storage } from '../storage';
import { Document, DocumentVersion, InsertDocumentVersion } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define supported file types
export const SupportedFileTypes = {
  PDF: ['pdf'],
  DOCUMENT: ['doc', 'docx', 'txt', 'rtf'],
  SPREADSHEET: ['xls', 'xlsx', 'csv'],
  IMAGE: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'gif', 'bmp'],
  PRESENTATION: ['ppt', 'pptx'],
  CODE: ['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'php', 'rb']
};

// File type groupings
export type FileTypeGroup = 'PDF' | 'DOCUMENT' | 'SPREADSHEET' | 'IMAGE' | 'PRESENTATION' | 'CODE';

// Document metadata structure
export interface DocumentMetadata {
  title?: string;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  size?: number;
  mimeType?: string;
  customMetadata?: Record<string, any>;
}

// Table structure for extracted tabular data
export interface TableData {
  id: string;
  name?: string;
  headers?: string[];
  data: any[][];
  rowCount: number;
  columnCount: number;
  sourceInfo?: {
    page?: number;
    sheet?: string;
    range?: string;
  };
}

// Content extraction result
export interface ContentExtractionResult {
  text: string;
  metadata: DocumentMetadata;
  tables: TableData[];
  isOcrProcessed: boolean;
  language?: string;
  pages: {
    number: number;
    text: string;
    hasImages: boolean;
    tables: TableData[];
  }[];
}

/**
 * Identifies the file type group based on file extension
 */
export function identifyFileTypeGroup(fileExtension: string): FileTypeGroup | null {
  const lowerExt = fileExtension.toLowerCase().replace('.', '');
  
  for (const [group, extensions] of Object.entries(SupportedFileTypes)) {
    if (extensions.includes(lowerExt)) {
      return group as FileTypeGroup;
    }
  }
  
  return null;
}

/**
 * Main document processing service
 */
export class DocumentProcessingService {
  
  /**
   * Process a document file and extract content, metadata, and structure
   * This is a simplified version that only supports basic text and spreadsheet processing
   */
  async processDocument(
    filePath: string, 
    fileType: string,
    options = { 
      extractText: true, 
      extractTables: true, 
      performOcr: true,
      storeResult: true,
      documentId: undefined
    }
  ): Promise<ContentExtractionResult> {
    console.log(`Processing document: ${filePath} (${fileType})`);
    
    // Get file extension and identify file type group
    const fileExtension = path.extname(filePath).slice(1);
    const fileGroup = identifyFileTypeGroup(fileExtension);
    
    if (!fileGroup) {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
    
    let result: ContentExtractionResult = {
      text: '',
      metadata: {},
      tables: [],
      isOcrProcessed: false,
      pages: [{
        number: 1,
        text: '',
        hasImages: false,
        tables: []
      }]
    };
    
    try {
      // Extract file stats for basic metadata
      const stats = fs.statSync(filePath);
      result.metadata.size = stats.size;
      result.metadata.modificationDate = stats.mtime;
      
      // Process based on file type
      switch (fileGroup) {
        case 'PDF':
          // Simplified PDF handling
          result.text = `[PDF content extraction not available in this simplified service]`;
          result.metadata = {
            title: path.basename(filePath),
            pageCount: 1,
            size: stats.size,
            modificationDate: stats.mtime
          };
          break;
          
        case 'DOCUMENT':
          result = await this.processTextDocument(filePath, fileExtension);
          break;
          
        case 'SPREADSHEET':
          result = await this.processSpreadsheet(filePath, fileExtension);
          break;
          
        case 'IMAGE':
          // Simplified image handling
          result.text = `[Image content extraction not available in this simplified service]`;
          result.metadata = {
            title: path.basename(filePath),
            size: stats.size,
            modificationDate: stats.mtime
          };
          break;
          
        case 'PRESENTATION':
          // Handle presentations (basic implementation)
          result.text = `[Presentation content extraction not available in this simplified service]`;
          result.metadata = {
            title: path.basename(filePath),
            size: stats.size,
            modificationDate: stats.mtime
          };
          break;
          
        case 'CODE':
          // For code files, simply read the content
          result.text = fs.readFileSync(filePath, 'utf8');
          result.metadata = {
            title: path.basename(filePath),
            size: stats.size,
            modificationDate: stats.mtime,
            wordCount: result.text.split(/\s+/).length,
            characterCount: result.text.length
          };
          result.pages[0].text = result.text;
          break;
          
        default:
          throw new Error(`Unknown file group: ${fileGroup}`);
      }
      
      // Store the processed result if requested
      if (options.storeResult && options.documentId) {
        await this.storeProcessedContent(options.documentId, result);
      }
      
      return result;
    } catch (error) {
      console.error(`Error processing document: ${error}`);
      throw error;
    }
  }
  
  /**
   * Process text documents (DOCX, TXT, RTF)
   */
  private async processTextDocument(
    filePath: string, 
    fileExtension: string
  ): Promise<ContentExtractionResult> {
    const result: ContentExtractionResult = {
      text: '',
      metadata: {},
      tables: [],
      isOcrProcessed: false,
      pages: []
    };
    
    try {
      // For text files, simply read the content
      result.text = fs.readFileSync(filePath, 'utf8');
      
      // Basic metadata
      result.metadata = {
        title: path.basename(filePath),
        wordCount: result.text.split(/\s+/).length,
        characterCount: result.text.length,
        pageCount: 1,
        size: fs.statSync(filePath).size,
        modificationDate: fs.statSync(filePath).mtime
      };
      
      // Add page info
      result.pages.push({
        number: 1,
        text: result.text,
        hasImages: false,
        tables: []
      });
      
      return result;
    } catch (error) {
      console.error(`Error processing text document: ${error}`);
      throw error;
    }
  }
  
  /**
   * Process spreadsheet files (XLS, XLSX, CSV)
   */
  private async processSpreadsheet(
    filePath: string, 
    fileExtension: string
  ): Promise<ContentExtractionResult> {
    const result: ContentExtractionResult = {
      text: '',
      metadata: {},
      tables: [],
      isOcrProcessed: false,
      pages: []
    };
    
    try {
      // Read file
      const workbook = xlsx.readFile(filePath);
      
      // Extract basic metadata
      result.metadata = {
        title: path.basename(filePath),
        pageCount: workbook.SheetNames.length,
        size: fs.statSync(filePath).size,
        modificationDate: fs.statSync(filePath).mtime,
        customMetadata: workbook.Props || {}
      };
      
      // Process each sheet
      let fullText = '';
      
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const sheet = workbook.Sheets[sheetName];
        
        // Convert sheet to array of arrays
        const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        // Add sheet name to full text
        fullText += `Sheet: ${sheetName}\n\n`;
        
        // Add sheet content to full text
        sheetData.forEach((row: any) => {
          if (Array.isArray(row)) {
            fullText += row.join('\t') + '\n';
          }
        });
        
        fullText += '\n\n';
        
        // Extract table data
        const headers = Array.isArray(sheetData[0]) ? sheetData[0].map(h => h?.toString() || '') : [];
        const data = sheetData.slice(1) as any[][];
        
        result.tables.push({
          id: `table-${sheetName}`,
          name: sheetName,
          headers: headers,
          data,
          rowCount: data.length,
          columnCount: headers.length,
          sourceInfo: {
            sheet: sheetName
          }
        });
        
        // Add page for this sheet
        result.pages.push({
          number: sheetIndex + 1,
          text: `Sheet: ${sheetName}\n\n` + sheetData.map((row: any) => 
            Array.isArray(row) ? row.join('\t') : ''
          ).join('\n'),
          hasImages: false,
          tables: [{
            id: `table-${sheetName}`,
            name: sheetName,
            headers: headers,
            data,
            rowCount: data.length,
            columnCount: headers.length,
            sourceInfo: {
              sheet: sheetName
            }
          }]
        });
      });
      
      result.text = fullText;
      return result;
    } catch (error) {
      console.error(`Error processing spreadsheet: ${error}`);
      throw error;
    }
  }
  
  /**
   * Extract basic metadata from a file
   */
  private async extractBasicMetadata(filePath: string): Promise<DocumentMetadata> {
    const stats = fs.statSync(filePath);
    
    return {
      title: path.basename(filePath),
      size: stats.size,
      modificationDate: stats.mtime,
      creationDate: stats.birthtime
    };
  }
  
  /**
   * Store the extracted document content in the database
   */
  private async storeProcessedContent(documentId: string | number, result: ContentExtractionResult): Promise<void> {
    try {
      // Get the document to update
      const document = await storage.getDocument(Number(documentId));
      
      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }
      
      // Create a new document version
      const versionData: InsertDocumentVersion = {
        documentId: Number(documentId),
        versionId: uuidv4(),
        contentHash: this.generateContentHash(result.text),
        fileSize: result.metadata.size || 0,
        createdBy: document.createdBy,
        source: 'local_upload',
        metadata: {
          extractedMetadata: result.metadata,
          processingTimestamp: new Date().toISOString(),
          pageCount: result.pages.length,
          tableCount: result.tables.length
        }
      };
      
      // Store the version
      await storage.createDocumentVersion(versionData);
      
      // Update the document with extracted content
      await storage.updateDocument(Number(documentId), {
        content: result.text,
        metadata: {
          extractedMetadata: result.metadata,
          extractionTimestamp: new Date().toISOString(),
          pageCount: result.pages.length,
          hasOcr: result.isOcrProcessed,
          language: result.language
        }
      });
      
      console.log(`Document ${documentId} updated with extracted content`);
    } catch (error) {
      console.error(`Error storing processed content: ${error}`);
      throw error;
    }
  }
  
  /**
   * Generate a simple content hash
   */
  private generateContentHash(content: string): string {
    // Simple hash function for demo purposes
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'hash_' + Math.abs(hash).toString(16);
  }

  /**
   * Process an existing document from the database
   * This is a stub for the routes.ts method that expects this function
   */
  async processExistingDocument(document: any, options?: any): Promise<boolean> {
    try {
      if (!document) {
        throw new Error(`Document is required`);
      }
      
      console.log(`Stub for processing existing document ${document.id}`);
      
      // This is a stub as we don't have the actual file to process
      return true;
    } catch (error) {
      console.error(`Error processing existing document: ${error}`);
      return false;
    }
  }

  /**
   * Process document from a buffer
   * This is a stub for the routes.ts method that expects this function
   */
  async processBuffer(
    buffer: Buffer, 
    mimeType: string, 
    fileName: string, 
    options?: any
  ): Promise<ContentExtractionResult> {
    // Create a temporary file
    const tempDir = './tmp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, fileName);
    
    try {
      // Write the buffer to a temp file
      fs.writeFileSync(tempFilePath, buffer);
      
      // Process the file
      const result = await this.processDocument(
        tempFilePath, 
        path.extname(fileName).slice(1),
        { 
          documentId: options?.documentId, 
          storeResult: options?.storeResult !== false,
          extractText: options?.extractText !== false,
          extractTables: options?.extractTables !== false,
          performOcr: options?.performOcr !== false
        }
      );
      
      return result;
    } catch (error) {
      console.error(`Error processing buffer: ${error}`);
      throw error;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
}

// Export a singleton instance
export const documentProcessingService = new DocumentProcessingService();