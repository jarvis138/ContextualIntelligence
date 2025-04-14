/**
 * PDF Document Processor
 * 
 * Specialized processor for PDF files with OCR capabilities
 * for scanned documents and metadata extraction.
 */

import { 
  ProcessorBase, 
  ProcessingOptions, 
  DocumentMetadata,
  DocumentSource
} from './ProcessorBase';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

// PDF processing options
interface PdfProcessingOptions extends ProcessingOptions {
  extractAnnotations?: boolean;
  extractFormFields?: boolean;
  extractBookmarks?: boolean;
  ocrDpi?: number;
  ocrImageFormat?: 'png' | 'jpg';
  pdfPassword?: string;
}

// Default PDF options
const PDF_DEFAULT_OPTIONS: Partial<PdfProcessingOptions> = {
  extractAnnotations: true,
  extractFormFields: true,
  extractBookmarks: true,
  ocrDpi: 300,
  ocrImageFormat: 'png'
};

/**
 * PDF processor implementation
 */
export class PdfProcessor extends ProcessorBase {
  protected options: PdfProcessingOptions;
  
  constructor(options: Partial<PdfProcessingOptions>) {
    // Merge with PDF-specific defaults
    super({ ...PDF_DEFAULT_OPTIONS, ...options });
    this.options = this.options as PdfProcessingOptions;
  }
  
  /**
   * Extract metadata from a PDF file
   */
  protected async extractMetadata(filePath: string, baseMetadata: DocumentMetadata): Promise<DocumentMetadata> {
    try {
      // Load the PDF data
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer, {
        // If password provided, use it for encrypted PDFs
        password: this.options.pdfPassword
      });
      
      // Merge with base metadata and extracted info
      const metadata: DocumentMetadata = {
        ...baseMetadata,
        title: data.info?.Title || baseMetadata.title || path.basename(filePath),
        author: data.info?.Author,
        createdAt: data.info?.CreationDate ? this.parseStandardPdfDate(data.info.CreationDate as string) : undefined,
        modifiedAt: data.info?.ModDate ? this.parseStandardPdfDate(data.info.ModDate as string) : undefined,
        pageCount: data.numpages,
        wordCount: this.estimateWordCount(data.text),
        language: this.detectLanguage(data.text),
        keywords: data.info?.Keywords ? this.extractKeywords(data.info.Keywords as string) : [],
        formatSpecific: {
          pdf: {
            encrypted: data.info?.IsEncrypted || false,
            creator: data.info?.Creator as string,
            producer: data.info?.Producer as string,
            pdfVersion: data.info?.PDFFormatVersion as string,
          }
        }
      };
      
      // Check if it's a scanned document
      metadata.formatSpecific!.pdf!.isScanned = await this.detectScannedDocument(filePath);
      
      return metadata;
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      // Return base metadata if extraction fails
      return {
        ...baseMetadata,
        title: baseMetadata.title || path.basename(filePath)
      };
    }
  }
  
  /**
   * Extract text content from a PDF file
   */
  protected async extractText(filePath: string, metadata: DocumentMetadata): Promise<string> {
    try {
      // Check if this is a scanned document
      const isScanned = metadata.formatSpecific?.pdf?.isScanned;
      
      // If it's a scanned document and OCR is enabled, use OCR
      if (isScanned && this.options.ocrEnabled) {
        this.addProcessingMessage('Detected scanned PDF, using OCR');
        return await this.processOcr(filePath, { 
          language: this.options.ocrLanguage || 'eng' 
        });
      }
      
      // For standard PDFs, use pdf-parse
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer, {
        // If password provided, use it for encrypted PDFs
        password: this.options.pdfPassword
      });
      
      return data.text;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return '';
    }
  }
  
  /**
   * Extract structured data from a PDF file
   * This includes form fields, annotations, etc.
   */
  protected async extractStructuredData(filePath: string, metadata: DocumentMetadata): Promise<any> {
    // This is a placeholder - a full implementation would require a more
    // comprehensive PDF library like pdf-lib or pdf.js
    
    // Example structured data format
    const structuredData: any = {
      formFields: [],
      annotations: [],
      bookmarks: [],
      attachments: []
    };
    
    this.addProcessingMessage('PDF structured data extraction not fully implemented');
    
    return structuredData;
  }
  
  /**
   * Generate a thumbnail for the PDF document
   */
  protected async generateThumbnail(filePath: string, metadata: DocumentMetadata): Promise<string> {
    try {
      // For PDFs, we'll extract the first page and convert it to an image
      // This is a placeholder - a real implementation would use a library
      // that can render PDFs like pdf.js or a system call to a tool like pdftoppm
      
      this.addProcessingMessage('PDF thumbnail generation requires additional libraries');
      
      // Placeholder - return an empty path
      return '';
    } catch (error) {
      console.error('Error generating PDF thumbnail:', error);
      return '';
    }
  }
  
  /**
   * Generate a preview for the PDF document
   */
  protected async generatePreview(filePath: string, metadata: DocumentMetadata): Promise<string> {
    // For PDFs, a preview could be the first few pages converted to images
    // This is a placeholder - similar to thumbnail generation
    
    this.addProcessingMessage('PDF preview generation requires additional libraries');
    
    // Placeholder - return an empty path
    return '';
  }
  
  /**
   * Process OCR for scanned PDFs
   */
  protected async processOcr(filePath: string, options: { language: string }): Promise<string> {
    try {
      // Convert PDF pages to images for OCR
      // This is a simplified version - full implementation would handle multiple pages
      
      this.addProcessingMessage('Converting PDF to images for OCR processing');
      
      // Create a temp directory for images
      const tempDir = path.join(process.cwd(), 'tmp', 'ocr');
      await fs.promises.mkdir(tempDir, { recursive: true });
      
      // We would normally extract all pages from the PDF here
      // For simplicity, we'll assume a single page or just process the first
      
      // Create a worker for the specified language
      const worker = await Tesseract.createWorker(options.language);
      
      // Initialize the worker
      await worker.load();
      await worker.loadLanguage(options.language);
      await worker.initialize(options.language);
      
      // Recognize text in the image
      const result = await worker.recognize(filePath);
      
      // Terminate the worker
      await worker.terminate();
      
      return result.data.text;
    } catch (error) {
      console.error('Error processing OCR for PDF:', error);
      return '';
    }
  }
  
  /**
   * Detect if a PDF is a scanned document
   */
  private async detectScannedDocument(filePath: string): Promise<boolean> {
    try {
      // Load the PDF data
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      // If the PDF has very little text content relative to the number of pages,
      // it's likely a scanned document
      const avgCharsPerPage = data.text.length / data.numpages;
      
      // This threshold is a rough estimate - real implementation would be more sophisticated
      const isLikelyScanned = avgCharsPerPage < 50;
      
      this.addProcessingMessage(`PDF scan detection: ${isLikelyScanned ? 'Appears to be scanned' : 'Text-based PDF'}`);
      
      return isLikelyScanned;
    } catch (error) {
      console.error('Error detecting if PDF is scanned:', error);
      return false;
    }
  }
  
  /**
   * Parse a PDF date string into a JavaScript Date
   */
  private parseStandardPdfDate(dateString: string): Date | undefined {
    try {
      // PDF dates are in the format: D:YYYYMMDDHHmmSSOHH'mm'
      // Where O is the offset direction (+ or -) and the last HH'mm' is the offset
      // For example: D:20150409173503+02'00'
      
      // Strip the 'D:' prefix if present
      if (dateString.startsWith('D:')) {
        dateString = dateString.substring(2);
      }
      
      // Extract date components
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1; // JavaScript months are 0-based
      const day = parseInt(dateString.substring(6, 8));
      const hour = parseInt(dateString.substring(8, 10));
      const minute = parseInt(dateString.substring(10, 12));
      const second = parseInt(dateString.substring(12, 14));
      
      // Create the date
      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      console.error('Error parsing PDF date:', error);
      return undefined;
    }
  }
  
  /**
   * Estimate word count from text content
   */
  private estimateWordCount(text: string): number {
    if (!text) return 0;
    
    // Split text by whitespace and count non-empty elements
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Basic language detection based on character frequency analysis
   */
  private detectLanguage(text: string): string {
    // This is a very simplified approach - real implementation would use
    // a proper language detection library
    
    if (!text || text.length < 20) return 'unknown';
    
    // Default to English
    return 'en';
  }
  
  /**
   * Extract keywords from PDF metadata
   */
  private extractKeywords(keywordsString: string): string[] {
    if (!keywordsString) return [];
    
    // Keywords are typically comma-separated
    return keywordsString.split(/[,;]\s*/)
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);
  }
}