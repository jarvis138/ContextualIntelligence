/**
 * Document Processing Service
 * 
 * Provides capabilities for extracting text, metadata, and structured data from various file formats.
 * Supports OCR for scanned documents and tabular data extraction from spreadsheets.
 */

import { createWorker } from 'tesseract.js';
import * as Excel from 'exceljs';
import * as xlsx from 'xlsx';
import { createCanvas } from 'canvas';
// Import PDF.js legacy build for Node.js environment as recommended
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
// We can't use the docx library directly for parsing as it's meant for document generation
// Use a simplified approach instead
const docxParse = async (buffer: Buffer) => {
  // Simple mock implementation until we can properly parse DOCX files
  return {
    sections: [{
      children: [{
        children: [{
          text: "DOCX content extraction placeholder - use proper parsing library"
        }]
      }]
    }],
    coreProperties: {
      title: null,
      creator: null,
      created: null,
      modified: null
    }
  };
};
import { storage } from '../storage';
import { Document, DocumentVersion, InsertDocumentVersion } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from '../utils/pipeline';
import { v4 as uuidv4 } from 'uuid';

// Configure PDF.js in Node.js environment - no worker needed
// Node.js doesn't use workers like browsers, so we'll just set it to empty
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

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
      pages: []
    };
    
    try {
      // Extract file stats for basic metadata
      const stats = fs.statSync(filePath);
      result.metadata.size = stats.size;
      result.metadata.modificationDate = stats.mtime;
      
      // Process based on file type
      switch (fileGroup) {
        case 'PDF':
          result = await this.processPdfDocument(filePath, options);
          break;
        case 'DOCUMENT':
          result = await this.processTextDocument(filePath, fileExtension, options);
          break;
        case 'SPREADSHEET':
          result = await this.processSpreadsheet(filePath, fileExtension, options);
          break;
        case 'IMAGE':
          result = await this.processImage(filePath, options);
          break;
        case 'PRESENTATION':
          // Handle presentations (basic implementation)
          result.text = 'Presentation content extraction is not fully implemented';
          result.metadata = await this.extractBasicMetadata(filePath);
          break;
        case 'CODE':
          // For code files, simply read the content
          result.text = fs.readFileSync(filePath, 'utf8');
          result.metadata = await this.extractBasicMetadata(filePath);
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
   * Process PDF document with text extraction and optional OCR
   */
  private async processPdfDocument(
    filePath: string, 
    options: { extractText: boolean, extractTables: boolean, performOcr: boolean }
  ): Promise<ContentExtractionResult> {
    const result: ContentExtractionResult = {
      text: '',
      metadata: {},
      tables: [],
      isOcrProcessed: false,
      pages: []
    };
    
    try {
      // Load PDF document
      const data = new Uint8Array(fs.readFileSync(filePath));
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      
      // Extract metadata
      const metadata = await pdf.getMetadata();
      result.metadata = {
        title: metadata.info && 'Title' in metadata.info ? metadata.info.Title as string : undefined,
        author: metadata.info && 'Author' in metadata.info ? metadata.info.Author as string : undefined,
        creationDate: metadata.info && 'CreationDate' in metadata.info ? new Date(metadata.info.CreationDate as string) : undefined,
        modificationDate: metadata.info && 'ModDate' in metadata.info ? new Date(metadata.info.ModDate as string) : undefined,
        pageCount: pdf.numPages,
        customMetadata: metadata.metadata && typeof metadata.metadata.getAll === 'function' ? metadata.metadata.getAll() : {}
      };
      
      // Extract text content from each page
      let fullText = '';
      let needsOcr = false;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
        
        // Check if page might need OCR (very little text on the page)
        if (pageText.trim().length < 50) {
          needsOcr = true;
        }
        
        // Store page information
        result.pages.push({
          number: i,
          text: pageText,
          hasImages: false, // Will be updated during OCR if applicable
          tables: []
        });
      }
      
      result.text = fullText;
      
      // Perform OCR if necessary and requested
      if (options.performOcr && needsOcr) {
        const ocrResult = await this.performOcrOnPdf(filePath);
        
        // If OCR found significantly more text, use it
        if (ocrResult.text && ocrResult.text.length > fullText.length * 1.5) {
          result.text = ocrResult.text;
          result.pages = ocrResult.pages || result.pages;
          result.isOcrProcessed = true;
        }
      }
      
      // Extract tables if requested
      if (options.extractTables) {
        result.tables = await this.extractTablesFromPdf(filePath, pdf.numPages);
      }
      
      return result;
    } catch (error) {
      console.error(`Error processing PDF: ${error}`);
      throw error;
    }
  }
  
  /**
   * Perform OCR on a PDF document using Tesseract.js
   */
  private async performOcrOnPdf(filePath: string): Promise<Partial<ContentExtractionResult>> {
    const result: Partial<ContentExtractionResult> = {
      text: '',
      pages: [],
      isOcrProcessed: true
    };
    
    try {
      // Initialize Tesseract worker
      const worker = await createWorker('eng');
      
      // Load PDF and convert pages to images for OCR
      const data = new Uint8Array(fs.readFileSync(filePath));
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        
        // Render page to canvas using node-canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        await page.render({
          canvasContext: context,
          viewport
        }).promise;
        
        // Get image data for OCR
        const imageBuffer = canvas.toBuffer('image/png');
        
        // Run OCR on the page image
        const { data } = await worker.recognize(imageBuffer);
        const pageText = data.text;
        
        fullText += pageText + '\n\n';
        
        // Store page information
        if (result.pages) {
          result.pages.push({
            number: i,
            text: pageText,
            hasImages: true,
            tables: []
          });
        }
      }
      
      // Terminate worker
      await worker.terminate();
      
      result.text = fullText;
      return result;
    } catch (error) {
      console.error(`OCR processing error: ${error}`);
      return { text: '', isOcrProcessed: false, pages: [] };
    }
  }
  
  /**
   * Extract tables from PDF document
   */
  private async extractTablesFromPdf(filePath: string, pageCount: number): Promise<TableData[]> {
    const tables: TableData[] = [];
    
    try {
      // This is a simplified approach - in a production environment,
      // you would typically use a specialized library for table extraction
      
      const data = new Uint8Array(fs.readFileSync(filePath));
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group text items by their y-coordinate (rows)
        const rows = new Map<number, any[]>();
        
        textContent.items.forEach((item: any) => {
          const y = Math.round(item.transform[5]); // Y-coordinate
          
          if (!rows.has(y)) {
            rows.set(y, []);
          }
          
          rows.get(y)?.push({
            text: item.str,
            x: item.transform[4],
          });
        });
        
        // Sort rows by y-coordinate (top to bottom)
        const sortedRows = Array.from(rows.entries())
          .sort((a, b) => b[0] - a[0]); // Reverse order because PDFs start from bottom
        
        // Identify potential tables by looking for rows with similarly positioned text
        const potentialTableRows = sortedRows.filter(([_, items]) => items.length >= 3);
        
        if (potentialTableRows.length >= 3) {
          // Create table data structure
          const tableData: any[][] = [];
          
          potentialTableRows.forEach(([_, items]) => {
            // Sort items by x-coordinate (left to right)
            const sortedItems = items.sort((a: any, b: any) => a.x - b.x);
            tableData.push(sortedItems.map((item: any) => item.text));
          });
          
          // Add table if it has enough rows and columns
          if (tableData.length >= 3 && tableData[0].length >= 2) {
            tables.push({
              id: `table-page-${i}-${tables.length + 1}`,
              headers: tableData[0],
              data: tableData.slice(1),
              rowCount: tableData.length,
              columnCount: tableData[0].length,
              sourceInfo: {
                page: i
              }
            });
          }
        }
      }
      
      return tables;
    } catch (error) {
      console.error(`Error extracting tables from PDF: ${error}`);
      return [];
    }
  }
  
  /**
   * Process text documents (DOCX, TXT, RTF)
   */
  private async processTextDocument(
    filePath: string, 
    fileExtension: string,
    options: { extractText: boolean }
  ): Promise<ContentExtractionResult> {
    const result: ContentExtractionResult = {
      text: '',
      metadata: {},
      tables: [],
      isOcrProcessed: false,
      pages: []
    };
    
    try {
      if (fileExtension === 'docx') {
        // Process DOCX files using docx library
        const buffer = fs.readFileSync(filePath);
        const content = await docxParse(buffer);
        
        // Extract text
        result.text = content.sections
          .map(section => 
            section.children
              .map(paragraph => 
                paragraph.children
                  .map(run => run.text)
                  .join('')
              )
              .join('\n')
          )
          .join('\n\n');
        
        // Extract metadata
        result.metadata = {
          title: content.coreProperties?.title || undefined,
          author: content.coreProperties?.creator || undefined,
          creationDate: content.coreProperties?.created ? new Date(content.coreProperties.created) : undefined,
          modificationDate: content.coreProperties?.modified ? new Date(content.coreProperties.modified) : undefined,
          wordCount: result.text.split(/\s+/).length,
          characterCount: result.text.length
        };
      } else {
        // For plain text files, simply read the content
        result.text = fs.readFileSync(filePath, 'utf8');
        result.metadata = await this.extractBasicMetadata(filePath);
      }
      
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
    fileExtension: string,
    options: { extractText: boolean, extractTables: boolean }
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
        customMetadata: workbook.Props || {}
      };
      
      // Process each sheet
      let fullText = '';
      
      workbook.SheetNames.forEach(sheetName => {
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
        
        // Extract table if requested
        if (options.extractTables && sheetData.length > 0) {
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
        }
      });
      
      result.text = fullText;
      return result;
    } catch (error) {
      console.error(`Error processing spreadsheet: ${error}`);
      throw error;
    }
  }
  
  /**
   * Process image files with OCR
   */
  private async processImage(
    filePath: string,
    options: { performOcr: boolean }
  ): Promise<ContentExtractionResult> {
    const result: ContentExtractionResult = {
      text: '',
      metadata: {},
      tables: [],
      isOcrProcessed: false,
      pages: []
    };
    
    try {
      // Extract basic metadata
      result.metadata = await this.extractBasicMetadata(filePath);
      
      // Perform OCR if requested
      if (options.performOcr) {
        // Initialize Tesseract worker
        const worker = await createWorker('eng');
        
        // Run OCR on the image
        const { data } = await worker.recognize(filePath);
        result.text = data.text;
        result.isOcrProcessed = true;
        
        // Add page information
        result.pages.push({
          number: 1,
          text: data.text,
          hasImages: true,
          tables: []
        });
        
        // Terminate worker
        await worker.terminate();
      }
      
      return result;
    } catch (error) {
      console.error(`Error processing image: ${error}`);
      throw error;
    }
  }
  
  /**
   * Extract basic metadata from any file
   */
  private async extractBasicMetadata(filePath: string): Promise<DocumentMetadata> {
    try {
      const stats = fs.statSync(filePath);
      
      return {
        title: path.basename(filePath),
        modificationDate: stats.mtime,
        creationDate: stats.birthtime,
        size: stats.size
      };
    } catch (error) {
      console.error(`Error extracting basic metadata: ${error}`);
      return {};
    }
  }
  
  /**
   * Store processed content as a document version
   */
  private async storeProcessedContent(
    documentId: number,
    content: ContentExtractionResult
  ): Promise<DocumentVersion> {
    try {
      // Get the document
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }
      
      // Generate version ID
      const versionId = uuidv4();
      
      // Create document version
      const version: InsertDocumentVersion = {
        documentId,
        versionId,
        createdAt: new Date(),
        createdBy: document.createdBy,
        source: 'local_upload',
        metadata: content.metadata,
        fileSize: content.metadata.size || 0,
        contentHash: Buffer.from(content.text).toString('base64').substr(0, 32),
        changes: 'Initial processing',
        sourceReference: null
      };
      
      // Store the document version
      const storedVersion = await storage.createDocumentVersion(version);
      
      // Update the document with extracted text if not already present
      if (!document.content || document.content.trim() === '') {
        await storage.updateDocument(documentId, {
          content: content.text
        });
      }
      
      return storedVersion;
    } catch (error) {
      console.error(`Error storing processed content: ${error}`);
      throw error;
    }
  }
}

// Create instance
export const documentProcessingService = new DocumentProcessingService();