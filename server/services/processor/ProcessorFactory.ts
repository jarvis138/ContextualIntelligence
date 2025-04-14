/**
 * Document Processor Factory
 * 
 * Factory for creating appropriate processors based on document type.
 * Handles processor lifecycle and coordinates processing for different file types.
 */

import path from 'path';
import { ProcessorBase, ProcessingOptions, ProcessingResult } from './ProcessorBase';
import { PdfProcessor } from './PdfProcessor';
import { OfficeProcessor } from './OfficeProcessor';
import { EmailProcessor } from './EmailProcessor';

// Import other processor types as they are implemented
// import { ImageProcessor } from './ImageProcessor';
// import { TextProcessor } from './TextProcessor';
// import { ArchiveProcessor } from './ArchiveProcessor';

/**
 * Factory class for document processors
 */
export class ProcessorFactory {
  /**
   * Create an appropriate processor based on file extension
   */
  static createProcessor(filePath: string, options: Partial<ProcessingOptions>): ProcessorBase {
    const extension = path.extname(filePath).toLowerCase().replace('.', '');
    
    // Determine processor based on file extension
    if (['pdf'].includes(extension)) {
      return new PdfProcessor(options);
    } 
    else if (['doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp'].includes(extension)) {
      return new OfficeProcessor(options);
    }
    // Add other processor types here as they're implemented
    // else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp'].includes(extension)) {
    //   return new ImageProcessor(options);
    // }
    // else if (['txt', 'md', 'html', 'htm', 'xml', 'json', 'csv'].includes(extension)) {
    //   return new TextProcessor(options);
    // }
    // else if (['zip', 'tar', 'gz', 'rar', '7z'].includes(extension)) {
    //   return new ArchiveProcessor(options);
    // }
    
    // Default to the appropriate processor
    if (extension === 'pdf') {
      return new PdfProcessor(options);
    } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
      return new OfficeProcessor(options);
    }
    
    // Fall back to the PDF processor for unsupported file types
    console.warn(`No specific processor found for extension: ${extension}. Using PDF processor as fallback.`);
    return new PdfProcessor(options);
  }
  
  /**
   * Process a file with the appropriate processor
   */
  static async processFile(filePath: string, options: Partial<ProcessingOptions>): Promise<ProcessingResult> {
    const processor = this.createProcessor(filePath, options);
    return await processor.processFromPath(filePath);
  }
  
  /**
   * Process a buffer with the appropriate processor
   */
  static async processBuffer(buffer: Buffer, filename: string, contentType: string, options: Partial<ProcessingOptions>): Promise<ProcessingResult> {
    // Create processor based on file extension
    const extension = path.extname(filename).toLowerCase().replace('.', '');
    
    // Determine processor type
    let processor: ProcessorBase;
    
    if (['pdf'].includes(extension)) {
      processor = new PdfProcessor(options);
    } 
    else if (['doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp'].includes(extension)) {
      processor = new OfficeProcessor(options);
    }
    // Add other processor types here as they're implemented
    else {
      // Use a default processor based on content type
      if (contentType.includes('pdf')) {
        processor = new PdfProcessor(options);
      } else if (contentType.includes('officedocument') || 
                contentType.includes('msword') || 
                contentType.includes('ms-excel') || 
                contentType.includes('ms-powerpoint')) {
        processor = new OfficeProcessor(options);
      } else {
        console.warn(`No specific processor found for content type: ${contentType}. Using PDF processor as fallback.`);
        processor = new PdfProcessor(options);
      }
    }
    
    return await processor.processBuffer(buffer, filename, contentType);
  }
  
  /**
   * Process a document from a URL
   */
  static async processUrl(url: string, options: Partial<ProcessingOptions> & { filename?: string }): Promise<ProcessingResult> {
    // Extract filename from URL if not provided
    const filename = options.filename || path.basename(new URL(url).pathname);
    const extension = path.extname(filename).toLowerCase().replace('.', '');
    
    // Create appropriate processor
    let processor: ProcessorBase;
    
    if (['pdf'].includes(extension)) {
      processor = new PdfProcessor(options);
    } 
    else if (['doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp'].includes(extension)) {
      processor = new OfficeProcessor(options);
    }
    // Add other processor types here as they're implemented
    else {
      // Default to PDF processor
      processor = new PdfProcessor(options);
    }
    
    return await processor.processFromUrl(url, { filename });
  }
  
  /**
   * Get a list of supported file extensions
   */
  static getSupportedExtensions(): string[] {
    return [
      // PDF
      'pdf',
      // Office documents
      'doc', 'docx', 'odt',
      'xls', 'xlsx', 'ods',
      'ppt', 'pptx', 'odp',
      // Images (when implemented)
      // 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp',
      // Text/markup (when implemented)
      // 'txt', 'md', 'html', 'htm', 'xml', 'json', 'csv',
      // Archives (when implemented)
      // 'zip', 'tar', 'gz', 'rar', '7z'
    ];
  }
  
  /**
   * Check if a file extension is supported
   */
  static isExtensionSupported(extension: string): boolean {
    return this.getSupportedExtensions().includes(extension.toLowerCase().replace('.', ''));
  }
}