/**
 * Document Processor Base Class
 * 
 * This class provides the foundation for specialized document processors,
 * handling common operations like metadata extraction, versioning,
 * and content processing.
 */

import { logAuditEvent, AuditEventType } from '../../utils/auditLogger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { storage } from '../../storage';
import { Document, insertDocumentSchema } from '@shared/schema';

// Document source types
export enum DocumentSource {
  GOOGLE_DRIVE = 'google_drive',
  SHAREPOINT = 'sharepoint',
  EMAIL_ATTACHMENT = 'email_attachment',
  LOCAL_UPLOAD = 'local_upload',
  EXTERNAL_URL = 'external_url'
}

// Document processing status
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PENDING_REVISION = 'pending_revision' // For manual verification needed
}

// Document version interface
export interface DocumentVersion {
  versionId: string;        // Unique ID for this version
  documentId: number;       // ID of the parent document
  createdAt: Date;          // When this version was created
  createdBy: number;        // User ID who created this version
  contentHash: string;      // Hash of content for consistency validation
  changes?: string;         // Description of changes from previous version
  source: DocumentSource;   // Source of this version
  sourceReference?: string; // Reference to original in source system
  fileSize: number;         // Size of the document in bytes
  metadata: DocumentMetadata; // Extended metadata
}

// Extended metadata interface
export interface DocumentMetadata {
  title?: string;           // Document title
  author?: string;          // Original author
  createdAt?: Date;         // Original creation date
  modifiedAt?: Date;        // Last modification date
  pageCount?: number;       // Number of pages
  wordCount?: number;       // Number of words
  language?: string;        // Detected language
  keywords?: string[];      // Extracted keywords
  summary?: string;         // Document summary
  categories?: string[];    // Document categories
  contentType: string;      // MIME type
  fileExtension: string;    // File extension
  // Format-specific metadata
  formatSpecific?: {
    // PDF specific
    pdf?: {
      encrypted?: boolean;
      creator?: string;
      producer?: string;
      pdfVersion?: string;
    },
    // Office document specific
    office?: {
      application?: string;
      applicationVersion?: string;
      template?: string;
      revisionsCount?: number;
      company?: string;
      lastEditedBy?: string;
    },
    // Image specific
    image?: {
      width?: number;
      height?: number;
      colorSpace?: string;
      orientation?: number;
      hasExif?: boolean;
    },
    // Custom/additional properties
    [key: string]: any;
  };
  // Extracted entities
  entities?: {
    people?: string[];
    organizations?: string[];
    locations?: string[];
    dates?: string[];
    [key: string]: string[] | undefined;
  };
  // Custom fields (user-defined)
  customFields?: { [key: string]: any };
}

// Result of document processing
export interface ProcessingResult {
  status: ProcessingStatus;
  documentId?: number;
  versionId?: string;
  metadata?: DocumentMetadata;
  contentHash?: string;
  extractedText?: string;
  extractedStructuredData?: any;
  thumbnailPath?: string;
  previewPath?: string;
  processingMessages?: string[];
  error?: Error;
}

// Options for document processing
export interface ProcessingOptions {
  projectId: number;
  userId: number;
  extractText?: boolean;
  extractMetadata?: boolean;
  extractStructuredData?: boolean;
  ocrEnabled?: boolean;
  ocrLanguage?: string;
  generateThumbnail?: boolean;
  generatePreview?: boolean;
  maxContentSizeBytes?: number;
  // The base folder for storing processed files
  storageBasePath?: string;
  storeVersion?: boolean;
  // For version tracking
  isNewVersion?: boolean;
  previousDocumentId?: number;
  fileName?: string;
  processingPriority?: 'high' | 'normal' | 'low';
}

// Base default options
const DEFAULT_OPTIONS: Partial<ProcessingOptions> = {
  extractText: true,
  extractMetadata: true,
  extractStructuredData: false,
  ocrEnabled: false,
  ocrLanguage: 'eng',
  generateThumbnail: true,
  generatePreview: true,
  maxContentSizeBytes: 50 * 1024 * 1024, // 50MB
  storeVersion: true,
  processingPriority: 'normal'
};

/**
 * Abstract base class for document processors
 */
export abstract class ProcessorBase {
  protected options: ProcessingOptions;
  protected processingMessages: string[] = [];
  protected tempPaths: string[] = []; // Tracks temporary files to clean up

  constructor(options: Partial<ProcessingOptions>) {
    // Merge provided options with defaults
    this.options = { ...DEFAULT_OPTIONS, ...options } as ProcessingOptions;
    
    // Validate required fields
    if (!this.options.projectId) {
      throw new Error('Project ID is required for document processing');
    }
    
    if (!this.options.userId) {
      throw new Error('User ID is required for document processing');
    }
  }

  /**
   * Process a document from a file buffer
   */
  public async processBuffer(buffer: Buffer, filename: string, contentType: string): Promise<ProcessingResult> {
    try {
      // Save buffer to temporary file for processing
      const tempPath = await this.saveTempFile(buffer, filename);
      this.tempPaths.push(tempPath);
      
      // Extract file extension
      const fileExtension = path.extname(filename).toLowerCase().replace('.', '');
      
      // Create basic metadata
      const metadata: DocumentMetadata = {
        contentType,
        fileExtension,
        fileSize: buffer.length
      };
      
      // Process the file
      const result = await this.processFile(tempPath, metadata);
      
      // Clean up temp files
      this.cleanupTempFiles();
      
      return result;
    } catch (error) {
      console.error('Error processing document buffer:', error);
      
      // Clean up temp files
      this.cleanupTempFiles();
      
      // Return error result
      return {
        status: ProcessingStatus.FAILED,
        error: error as Error,
        processingMessages: this.processingMessages
      };
    }
  }

  /**
   * Process a document from a file path
   */
  public async processFromPath(filePath: string, filename?: string): Promise<ProcessingResult> {
    try {
      // Determine the filename if not provided
      const actualFilename = filename || path.basename(filePath);
      
      // Get file stats
      const stats = await fs.promises.stat(filePath);
      
      // Check file size
      if (stats.size > this.options.maxContentSizeBytes!) {
        throw new Error(`File exceeds maximum size of ${this.options.maxContentSizeBytes! / (1024 * 1024)}MB`);
      }
      
      // Determine content type
      const fileExtension = path.extname(actualFilename).toLowerCase().replace('.', '');
      const contentType = this.determineContentType(fileExtension);
      
      // Create basic metadata
      const metadata: DocumentMetadata = {
        contentType,
        fileExtension,
        fileSize: stats.size
      };
      
      // Process the file
      const result = await this.processFile(filePath, metadata);
      
      return result;
    } catch (error) {
      console.error('Error processing document from path:', error);
      
      // Clean up temp files
      this.cleanupTempFiles();
      
      // Return error result
      return {
        status: ProcessingStatus.FAILED,
        error: error as Error,
        processingMessages: this.processingMessages
      };
    }
  }
  
  /**
   * Process a document from a URL
   */
  public async processFromUrl(url: string, options?: { filename?: string }): Promise<ProcessingResult> {
    try {
      this.addProcessingMessage(`Downloading file from URL: ${url}`);
      
      // Fetch the file
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      
      // Get content type from headers
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // Try to get filename from Content-Disposition header or URL
      let filename = options?.filename;
      
      if (!filename) {
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
          const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
          }
        }
        
        // If still no filename, use the URL path
        if (!filename) {
          const urlPath = new URL(url).pathname;
          filename = path.basename(urlPath) || 'downloaded-file';
          
          // Add extension based on content type if missing
          if (!path.extname(filename)) {
            const ext = this.getExtensionFromContentType(contentType);
            if (ext) {
              filename += `.${ext}`;
            }
          }
        }
      }
      
      // Get the file buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Process the buffer
      return await this.processBuffer(buffer, filename, contentType);
    } catch (error) {
      console.error('Error processing document from URL:', error);
      
      // Clean up temp files
      this.cleanupTempFiles();
      
      // Return error result
      return {
        status: ProcessingStatus.FAILED,
        error: error as Error,
        processingMessages: this.processingMessages
      };
    }
  }
  
  /**
   * Save a document to the database after processing
   */
  protected async saveDocument(result: ProcessingResult): Promise<Document> {
    try {
      // Create a document record
      const document = await storage.createDocument({
        title: result.metadata?.title || 'Untitled Document',
        content: result.extractedText || '',
        fileType: result.metadata?.fileExtension || 'unknown',
        projectId: this.options.projectId,
        createdBy: this.options.userId,
        updatedBy: this.options.userId,
        metadata: result.metadata
      });
      
      // If versioning is enabled, save the version information
      if (this.options.storeVersion && result.versionId) {
        await this.saveVersion({
          versionId: result.versionId,
          documentId: document.id,
          createdAt: new Date(),
          createdBy: this.options.userId,
          contentHash: result.contentHash || '',
          source: DocumentSource.LOCAL_UPLOAD, // Default source
          fileSize: result.metadata?.fileSize || 0,
          metadata: result.metadata!
        });
      }
      
      // Log the document creation
      logAuditEvent({
        userId: this.options.userId,
        projectId: this.options.projectId,
        eventType: AuditEventType.ACCOUNT_CREATED,
        description: `Document processed and saved`,
        metadata: {
          documentId: document.id,
          title: document.title,
          fileType: document.fileType
        }
      });
      
      return document;
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }
  
  /**
   * Save a document version
   */
  protected async saveVersion(version: DocumentVersion): Promise<void> {
    try {
      // In a real implementation, this would save to a versions table
      // For now, just log the action
      console.log(`Saving document version: ${version.versionId} for document ${version.documentId}`);
      
      // Log the version creation
      logAuditEvent({
        userId: this.options.userId,
        projectId: this.options.projectId,
        eventType: AuditEventType.ACCOUNT_CREATED,
        description: `Document version created`,
        metadata: {
          documentId: version.documentId,
          versionId: version.versionId,
          source: version.source
        }
      });
    } catch (error) {
      console.error('Error saving document version:', error);
      throw error;
    }
  }
  
  /**
   * Extract metadata from a file (to be implemented by subclasses)
   */
  protected abstract extractMetadata(filePath: string, baseMetadata: DocumentMetadata): Promise<DocumentMetadata>;
  
  /**
   * Extract text content from a file (to be implemented by subclasses)
   */
  protected abstract extractText(filePath: string, metadata: DocumentMetadata): Promise<string>;
  
  /**
   * Extract structured data from a file (to be implemented by subclasses)
   */
  protected abstract extractStructuredData(filePath: string, metadata: DocumentMetadata): Promise<any>;
  
  /**
   * Generate a thumbnail for the document (to be implemented by subclasses)
   */
  protected abstract generateThumbnail(filePath: string, metadata: DocumentMetadata): Promise<string>;
  
  /**
   * Generate a preview for the document (to be implemented by subclasses)
   */
  protected abstract generatePreview(filePath: string, metadata: DocumentMetadata): Promise<string>;
  
  /**
   * Process OCR for image-based documents (to be implemented by subclasses)
   */
  protected abstract processOcr(filePath: string, options: { language: string }): Promise<string>;
  
  /**
   * Main processing method (common for all processors)
   */
  protected async processFile(filePath: string, baseMetadata: DocumentMetadata): Promise<ProcessingResult> {
    try {
      this.addProcessingMessage(`Processing file: ${filePath}`);
      
      // Calculate hash of the file for content consistency
      const contentHash = await this.calculateFileHash(filePath);
      
      // Create a version ID for tracking
      const versionId = this.generateVersionId();
      
      // Extract metadata
      let metadata = baseMetadata;
      if (this.options.extractMetadata) {
        this.addProcessingMessage('Extracting metadata');
        metadata = await this.extractMetadata(filePath, baseMetadata);
      }
      
      // Extract text content
      let extractedText: string | undefined;
      if (this.options.extractText) {
        this.addProcessingMessage('Extracting text content');
        
        // For image-based documents or if OCR is explicitly enabled
        if (this.options.ocrEnabled || this.isImageBasedDocument(metadata)) {
          this.addProcessingMessage('Processing with OCR');
          extractedText = await this.processOcr(filePath, { 
            language: this.options.ocrLanguage || 'eng'
          });
        } else {
          // Standard text extraction
          extractedText = await this.extractText(filePath, metadata);
        }
      }
      
      // Extract structured data if requested
      let structuredData: any | undefined;
      if (this.options.extractStructuredData) {
        this.addProcessingMessage('Extracting structured data');
        structuredData = await this.extractStructuredData(filePath, metadata);
      }
      
      // Generate thumbnail if requested
      let thumbnailPath: string | undefined;
      if (this.options.generateThumbnail) {
        this.addProcessingMessage('Generating thumbnail');
        thumbnailPath = await this.generateThumbnail(filePath, metadata);
      }
      
      // Generate preview if requested
      let previewPath: string | undefined;
      if (this.options.generatePreview) {
        this.addProcessingMessage('Generating preview');
        previewPath = await this.generatePreview(filePath, metadata);
      }
      
      // Save the document to the database
      const result: ProcessingResult = {
        status: ProcessingStatus.COMPLETED,
        versionId,
        contentHash,
        metadata,
        extractedText,
        extractedStructuredData: structuredData,
        thumbnailPath,
        previewPath,
        processingMessages: this.processingMessages
      };
      
      // Save the document to the database
      const savedDocument = await this.saveDocument(result);
      result.documentId = savedDocument.id;
      
      this.addProcessingMessage(`Processing completed successfully: ${versionId}`);
      return result;
    } catch (error) {
      console.error('Error in document processing:', error);
      
      // Return the error
      return {
        status: ProcessingStatus.FAILED,
        error: error as Error,
        processingMessages: this.processingMessages
      };
    }
  }

  /**
   * Check if a document is image-based and needs OCR
   */
  protected isImageBasedDocument(metadata: DocumentMetadata): boolean {
    // Image files
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp'];
    if (imageExtensions.includes(metadata.fileExtension)) {
      return true;
    }
    
    // Image-based PDFs or scanned documents will be detected during the PDF processing
    // by specific implementations
    
    return false;
  }

  /**
   * Calculate a hash of the file content for consistency checking
   */
  protected async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Generate a unique version ID
   */
  protected generateVersionId(): string {
    return `v-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Save a buffer to a temporary file for processing
   */
  protected async saveTempFile(buffer: Buffer, filename: string): Promise<string> {
    const tempDir = path.join(process.cwd(), 'tmp');
    
    // Create the temp directory if it doesn't exist
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    // Generate a unique filename
    const tempFilename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${path.basename(filename)}`;
    const tempPath = path.join(tempDir, tempFilename);
    
    // Write the buffer to the file
    await fs.promises.writeFile(tempPath, buffer);
    
    return tempPath;
  }

  /**
   * Clean up temporary files
   */
  protected cleanupTempFiles(): void {
    for (const tempPath of this.tempPaths) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (error) {
        console.error(`Error deleting temporary file ${tempPath}:`, error);
      }
    }
    
    // Clear the temp paths array
    this.tempPaths = [];
  }

  /**
   * Determine the content type from a file extension
   */
  protected determineContentType(extension: string): string {
    const extensionMap: Record<string, string> = {
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'odt': 'application/vnd.oasis.opendocument.text',
      'ods': 'application/vnd.oasis.opendocument.spreadsheet',
      'odp': 'application/vnd.oasis.opendocument.presentation',
      'txt': 'text/plain',
      'rtf': 'application/rtf',
      'html': 'text/html',
      'htm': 'text/html',
      'xml': 'application/xml',
      'json': 'application/json',
      'md': 'text/markdown',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'tif': 'image/tiff',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      
      // Other
      'csv': 'text/csv',
      'zip': 'application/zip',
      'gz': 'application/gzip',
      'tar': 'application/x-tar'
    };
    
    return extensionMap[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Get file extension from content type
   */
  protected getExtensionFromContentType(contentType: string): string | null {
    const contentTypeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/vnd.oasis.opendocument.text': 'odt',
      'application/vnd.oasis.opendocument.spreadsheet': 'ods',
      'application/vnd.oasis.opendocument.presentation': 'odp',
      'text/plain': 'txt',
      'application/rtf': 'rtf',
      'text/html': 'html',
      'application/xml': 'xml',
      'application/json': 'json',
      'text/markdown': 'md',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'text/csv': 'csv',
      'application/zip': 'zip',
      'application/gzip': 'gz',
      'application/x-tar': 'tar'
    };
    
    // Extract the base content type without parameters
    const baseContentType = contentType.split(';')[0].trim();
    
    return contentTypeMap[baseContentType] || null;
  }

  /**
   * Add a processing message
   */
  protected addProcessingMessage(message: string): void {
    this.processingMessages.push(`[${new Date().toISOString()}] ${message}`);
  }
}