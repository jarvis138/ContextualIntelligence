/**
 * Document Manager Service
 * 
 * Manages documents throughout their lifecycle including creation,
 * versioning, updates, and deletion. Provides a high-level API
 * for working with documents in the system.
 */

import path from 'path';
import fs from 'fs';
import { storage } from '../../storage';
import { 
  Document, 
  DocumentVersion as DocumentVersionRecord,
  insertDocumentSchema
} from '@shared/schema';
import { 
  ProcessorFactory 
} from './ProcessorFactory';
import {
  ProcessingOptions,
  ProcessingResult,
  ProcessingStatus,
  DocumentVersion,
  DocumentSource
} from './ProcessorBase';
import { logAuditEvent, AuditEventType } from '../../utils/auditLogger';

// Document lifecycle states
export enum DocumentLifecycleState {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// Document access levels
export enum DocumentAccessLevel {
  PUBLIC = 'public',     // Available to all users
  INTERNAL = 'internal', // Available to all authenticated users
  RESTRICTED = 'restricted', // Available to specific user groups
  PRIVATE = 'private'    // Available only to specific users
}

// Document versioning configuration
interface VersioningOptions {
  enabled: boolean;
  keepAllVersions: boolean;
  maxVersions?: number;
  requireComments: boolean;
  autoVersionOnUpdate: boolean;
}

// Default versioning options
const DEFAULT_VERSIONING_OPTIONS: VersioningOptions = {
  enabled: true,
  keepAllVersions: true,
  maxVersions: 10,
  requireComments: false,
  autoVersionOnUpdate: true
};

// Storage location options
interface StorageOptions {
  basePath: string;
  versionPath: string;
  tempPath: string;
  useSubfolders: boolean;
  folderStructure: 'date' | 'projectId' | 'documentType' | 'flat';
}

// Default storage options
const DEFAULT_STORAGE_OPTIONS: StorageOptions = {
  basePath: path.join(process.cwd(), 'storage', 'documents'),
  versionPath: path.join(process.cwd(), 'storage', 'versions'),
  tempPath: path.join(process.cwd(), 'storage', 'temp'),
  useSubfolders: true,
  folderStructure: 'projectId'
};

/**
 * Document Manager class
 */
export class DocumentManager {
  private versioningOptions: VersioningOptions;
  private storageOptions: StorageOptions;
  
  constructor(
    versioningOptions: Partial<VersioningOptions> = {}, 
    storageOptions: Partial<StorageOptions> = {}
  ) {
    // Merge options with defaults
    this.versioningOptions = { ...DEFAULT_VERSIONING_OPTIONS, ...versioningOptions };
    this.storageOptions = { ...DEFAULT_STORAGE_OPTIONS, ...storageOptions };
    
    // Ensure storage directories exist
    this.initializeStorageDirectories();
  }
  
  /**
   * Create a new document from a file
   */
  async createDocumentFromFile(
    filePath: string, 
    options: {
      projectId: number,
      userId: number,
      title?: string,
      description?: string,
      tags?: string[],
      lifecycleState?: DocumentLifecycleState,
      accessLevel?: DocumentAccessLevel,
      processingOptions?: Partial<ProcessingOptions>
    }
  ): Promise<Document> {
    try {
      // Basic validation
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Get file stats
      const stats = await fs.promises.stat(filePath);
      
      // Create document name if not provided
      const title = options.title || path.basename(filePath);
      
      // Set up processing options
      const processingOptions: Partial<ProcessingOptions> = {
        projectId: options.projectId,
        userId: options.userId,
        extractText: true,
        extractMetadata: true,
        extractStructuredData: true,
        ocrEnabled: true,
        generateThumbnail: true,
        generatePreview: true,
        storeVersion: this.versioningOptions.enabled,
        fileName: path.basename(filePath),
        storageBasePath: this.storageOptions.basePath,
        ...options.processingOptions
      };
      
      // Process the document
      const processingResult = await ProcessorFactory.processFile(filePath, processingOptions);
      
      if (processingResult.status === ProcessingStatus.FAILED) {
        throw new Error(`Document processing failed: ${processingResult.error?.message || 'Unknown error'}`);
      }
      
      // Create document record if not already created by the processor
      let document: Document;
      
      if (processingResult.documentId) {
        // Retrieve the document created by the processor
        const existingDoc = await storage.getDocument(processingResult.documentId);
        if (!existingDoc) {
          throw new Error(`Document with ID ${processingResult.documentId} not found after processing`);
        }
        document = existingDoc;
      } else {
        // Create a new document record
        document = await storage.createDocument({
          title: title,
          content: processingResult.extractedText || '',
          fileType: path.extname(filePath).toLowerCase().replace('.', ''),
          projectId: options.projectId,
          createdBy: options.userId,
          updatedBy: options.userId,
          description: options.description || '',
          metadata: processingResult.metadata || {},
          lifecycleState: options.lifecycleState || DocumentLifecycleState.ACTIVE,
          accessLevel: options.accessLevel || DocumentAccessLevel.PRIVATE,
          tags: options.tags || []
        });
        
        // If versioning is enabled and a version ID was created, save version information
        if (this.versioningOptions.enabled && processingResult.versionId) {
          await this.createVersion({
            documentId: document.id,
            versionId: processingResult.versionId,
            createdBy: options.userId,
            source: DocumentSource.LOCAL_UPLOAD,
            contentHash: processingResult.contentHash || '',
            fileSize: stats.size,
            metadata: processingResult.metadata!
          });
        }
      }
      
      // Log document creation
      logAuditEvent({
        userId: options.userId,
        projectId: options.projectId,
        eventType: AuditEventType.DOCUMENT_CREATED,
        description: `Document "${document.title}" created`,
        metadata: {
          documentId: document.id,
          processingStatus: processingResult.status
        }
      });
      
      return document;
    } catch (error) {
      console.error('Error creating document from file:', error);
      throw error;
    }
  }
  
  /**
   * Create a new document from a buffer
   */
  async createDocumentFromBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    options: {
      projectId: number,
      userId: number,
      title?: string,
      description?: string,
      tags?: string[],
      lifecycleState?: DocumentLifecycleState,
      accessLevel?: DocumentAccessLevel,
      processingOptions?: Partial<ProcessingOptions>
    }
  ): Promise<Document> {
    try {
      // Create document name if not provided
      const title = options.title || filename;
      
      // Set up processing options
      const processingOptions: Partial<ProcessingOptions> = {
        projectId: options.projectId,
        userId: options.userId,
        extractText: true,
        extractMetadata: true,
        extractStructuredData: true,
        ocrEnabled: true,
        generateThumbnail: true,
        generatePreview: true,
        storeVersion: this.versioningOptions.enabled,
        fileName: filename,
        storageBasePath: this.storageOptions.basePath,
        ...options.processingOptions
      };
      
      // Process the document
      const processingResult = await ProcessorFactory.processBuffer(
        buffer, 
        filename, 
        contentType, 
        processingOptions
      );
      
      if (processingResult.status === ProcessingStatus.FAILED) {
        throw new Error(`Document processing failed: ${processingResult.error?.message || 'Unknown error'}`);
      }
      
      // Create document record if not already created by the processor
      let document: Document;
      
      if (processingResult.documentId) {
        // Retrieve the document created by the processor
        const existingDoc = await storage.getDocument(processingResult.documentId);
        if (!existingDoc) {
          throw new Error(`Document with ID ${processingResult.documentId} not found after processing`);
        }
        document = existingDoc;
      } else {
        // Create a new document record
        document = await storage.createDocument({
          title: title,
          content: processingResult.extractedText || '',
          fileType: path.extname(filename).toLowerCase().replace('.', ''),
          projectId: options.projectId,
          createdBy: options.userId,
          updatedBy: options.userId,
          description: options.description || '',
          metadata: processingResult.metadata || {},
          lifecycleState: options.lifecycleState || DocumentLifecycleState.ACTIVE,
          accessLevel: options.accessLevel || DocumentAccessLevel.PRIVATE,
          tags: options.tags || []
        });
        
        // If versioning is enabled and a version ID was created, save version information
        if (this.versioningOptions.enabled && processingResult.versionId) {
          await this.createVersion({
            documentId: document.id,
            versionId: processingResult.versionId,
            createdBy: options.userId,
            source: DocumentSource.LOCAL_UPLOAD,
            contentHash: processingResult.contentHash || '',
            fileSize: buffer.length,
            metadata: processingResult.metadata!
          });
        }
      }
      
      // Log document creation
      logAuditEvent({
        userId: options.userId,
        projectId: options.projectId,
        eventType: AuditEventType.DOCUMENT_CREATED,
        description: `Document "${document.title}" created from buffer`,
        metadata: {
          documentId: document.id,
          processingStatus: processingResult.status
        }
      });
      
      return document;
    } catch (error) {
      console.error('Error creating document from buffer:', error);
      throw error;
    }
  }
  
  /**
   * Create a new document version
   */
  async createVersion(version: Partial<DocumentVersion>): Promise<DocumentVersionRecord> {
    try {
      if (!version.documentId) {
        throw new Error('Document ID is required for creating a version');
      }
      
      if (!version.versionId) {
        // Generate a version ID if not provided
        version.versionId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      if (!version.createdAt) {
        version.createdAt = new Date();
      }
      
      // In a real implementation, this would save to a versions table
      // For now, we'll create a simplified version record
      const versionRecord: DocumentVersionRecord = {
        id: Math.floor(Math.random() * 10000), // Mock ID generation
        documentId: version.documentId,
        versionId: version.versionId,
        createdAt: version.createdAt,
        createdBy: version.createdBy!,
        contentHash: version.contentHash || '',
        changes: version.changes || '',
        source: version.source || DocumentSource.LOCAL_UPLOAD,
        sourceReference: version.sourceReference || '',
        fileSize: version.fileSize || 0,
        metadata: JSON.stringify(version.metadata || {})
      };
      
      // Log version creation
      logAuditEvent({
        userId: version.createdBy!,
        eventType: AuditEventType.DOCUMENT_VERSION_CREATED,
        description: `Document version ${version.versionId} created for document ${version.documentId}`,
        metadata: {
          documentId: version.documentId,
          versionId: version.versionId,
          source: version.source
        }
      });
      
      console.log(`Created document version: ${version.versionId} for document ${version.documentId}`);
      
      return versionRecord;
    } catch (error) {
      console.error('Error creating document version:', error);
      throw error;
    }
  }
  
  /**
   * Get document versions
   */
  async getDocumentVersions(documentId: number): Promise<DocumentVersionRecord[]> {
    // In a real implementation, this would query the versions table
    // For now, we'll return an empty array
    return [];
  }
  
  /**
   * Update document lifecycle state
   */
  async updateLifecycleState(
    documentId: number, 
    state: DocumentLifecycleState, 
    options: { userId: number, comment?: string }
  ): Promise<Document> {
    try {
      // Get the current document
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }
      
      // Update the document state
      const updatedDocument = await storage.updateDocument(documentId, {
        lifecycleState: state,
        updatedBy: options.userId
      });
      
      // Log the state change
      logAuditEvent({
        userId: options.userId,
        eventType: AuditEventType.DOCUMENT_STATE_CHANGED,
        description: `Document "${document.title}" lifecycle state changed to ${state}`,
        metadata: {
          documentId: document.id,
          previousState: document.lifecycleState,
          newState: state,
          comment: options.comment
        }
      });
      
      return updatedDocument;
    } catch (error) {
      console.error(`Error updating document lifecycle state to ${state}:`, error);
      throw error;
    }
  }
  
  /**
   * Update document metadata
   */
  async updateMetadata(
    documentId: number,
    metadata: any,
    options: { userId: number, createVersion?: boolean }
  ): Promise<Document> {
    try {
      // Get the current document
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }
      
      // Create a new version if requested
      if (options.createVersion && this.versioningOptions.enabled) {
        // Get current document metadata
        const currentMetadata = document.metadata;
        
        // Create a version with current state before update
        await this.createVersion({
          documentId: document.id,
          createdBy: options.userId,
          source: DocumentSource.LOCAL_UPLOAD,
          contentHash: '', // No content hash for metadata-only changes
          fileSize: 0, // No file size for metadata-only changes
          metadata: currentMetadata,
          changes: 'Metadata update'
        });
      }
      
      // Update the document metadata
      const updatedDocument = await storage.updateDocument(documentId, {
        metadata: metadata,
        updatedBy: options.userId
      });
      
      // Log the metadata update
      logAuditEvent({
        userId: options.userId,
        eventType: AuditEventType.DOCUMENT_METADATA_UPDATED,
        description: `Document "${document.title}" metadata updated`,
        metadata: {
          documentId: document.id
        }
      });
      
      return updatedDocument;
    } catch (error) {
      console.error('Error updating document metadata:', error);
      throw error;
    }
  }
  
  /**
   * Delete a document (soft delete or permanent)
   */
  async deleteDocument(
    documentId: number,
    options: { userId: number, permanent?: boolean }
  ): Promise<void> {
    try {
      // Get the current document
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }
      
      if (options.permanent) {
        // Permanently delete the document
        await storage.deleteDocument(documentId);
        
        // Here we would also delete any physical files associated with the document
        // and all its versions
        
        // Log the permanent deletion
        logAuditEvent({
          userId: options.userId,
          eventType: AuditEventType.DOCUMENT_DELETED,
          description: `Document "${document.title}" permanently deleted`,
          metadata: {
            documentId: document.id,
            permanent: true
          }
        });
      } else {
        // Soft delete - just update the lifecycle state
        await this.updateLifecycleState(documentId, DocumentLifecycleState.DELETED, {
          userId: options.userId,
          comment: 'Document deleted'
        });
        
        // Log the soft deletion
        logAuditEvent({
          userId: options.userId,
          eventType: AuditEventType.DOCUMENT_DELETED,
          description: `Document "${document.title}" soft deleted`,
          metadata: {
            documentId: document.id,
            permanent: false
          }
        });
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
  
  /**
   * Initialize the storage directories
   */
  private async initializeStorageDirectories(): Promise<void> {
    try {
      // Create base directory if it doesn't exist
      await fs.promises.mkdir(this.storageOptions.basePath, { recursive: true });
      
      // Create version directory if it doesn't exist
      await fs.promises.mkdir(this.storageOptions.versionPath, { recursive: true });
      
      // Create temp directory if it doesn't exist
      await fs.promises.mkdir(this.storageOptions.tempPath, { recursive: true });
    } catch (error) {
      console.error('Error initializing storage directories:', error);
      throw error;
    }
  }
}