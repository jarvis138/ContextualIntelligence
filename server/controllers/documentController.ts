/**
 * Document Controller
 * 
 * This module provides controller functions for document-related API endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { createSuccessResponse, createPaginatedResponse } from '../utils/apiResponse';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/apiError';
import { z } from 'zod';

// Document enums
const DocumentAccess = ['public', 'internal', 'restricted', 'private'] as const;
const DocumentLifecycle = ['draft', 'active', 'archived', 'deleted'] as const;
const DocumentType = ['text', 'requirements', 'design', 'code', 'meeting', 'summary', 'report'] as const;
const ProcessingStatus = ['pending', 'processing', 'completed', 'failed', 'pending_revision'] as const;

// Schema for document creation validation
const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  description: z.string().optional(),
  fileType: z.string().min(1).max(50),
  projectId: z.number().int().positive(),
  tags: z.array(z.string()).optional(),
  accessLevel: z.enum(DocumentAccess).default('private'),
  lifecycleState: z.enum(DocumentLifecycle).default('draft'),
  metadata: z.record(z.unknown()).optional(),
});

// Schema for document update validation
const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  accessLevel: z.enum(DocumentAccess).optional(),
  lifecycleState: z.enum(DocumentLifecycle).optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required for update'
});

/**
 * Get all documents with pagination and filtering
 */
export async function getDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '10');
    
    // Get filter parameters
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const fileType = req.query.fileType as string;
    const accessLevel = req.query.accessLevel as string;
    const lifecycleState = req.query.lifecycleState as string;
    
    // Get documents from storage
    // Assuming getDocuments will be implemented with filtering options
    const documents = []; // await storage.getDocuments({ projectId, fileType, accessLevel, lifecycleState });
    
    // Apply pagination in memory (this would ideally be done at the database level)
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedDocuments = documents.slice(start, end);
    
    // Return paginated response
    return res.json(createPaginatedResponse(
      paginatedDocuments,
      documents.length,
      page,
      pageSize
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(req: Request, res: Response, next: NextFunction) {
  try {
    const documentId = parseInt(req.params.id);
    
    if (isNaN(documentId)) {
      throw new BadRequestError('Invalid document ID');
    }
    
    // Get document from storage
    // Assuming getDocument will be implemented in storage
    const document = null; // await storage.getDocument(documentId);
    
    if (!document) {
      throw new NotFoundError('Document not found');
    }
    
    // Check if user has access to the document
    // This would check access level and user's role/permissions
    
    return res.json(createSuccessResponse(document));
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new document
 */
export async function createDocument(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const documentData = createDocumentSchema.parse(req.body);
    
    // Check if the project exists
    // Assuming getProject will be implemented in storage
    const project = null; // await storage.getProject(documentData.projectId);
    
    if (!project) {
      throw new BadRequestError('Project not found');
    }
    
    // Check if user has permission to create documents in this project
    // This would check project membership and user's role/permissions
    
    // Create document
    const newDocument = {
      id: 1, // This would be set by the database
      ...documentData,
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
      processingStatus: 'completed' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }; // await storage.createDocument({ ...documentData, createdBy: req.user.id, updatedBy: req.user.id });
    
    return res.status(201).json(createSuccessResponse(newDocument));
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing document
 */
export async function updateDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const documentId = parseInt(req.params.id);
    
    if (isNaN(documentId)) {
      throw new BadRequestError('Invalid document ID');
    }
    
    // Validate request body
    const documentData = updateDocumentSchema.parse(req.body);
    
    // Get existing document
    // Assuming getDocument will be implemented in storage
    const existingDocument = null; // await storage.getDocument(documentId);
    
    if (!existingDocument) {
      throw new NotFoundError('Document not found');
    }
    
    // Check if user has permission to update this document
    // This would check if the user is the creator or has edit permissions
    if (req.user?.role !== 'admin' && existingDocument.createdBy !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to update this document');
    }
    
    // Update document
    const updatedDocument = {
      ...existingDocument,
      ...documentData,
      updatedBy: req.user?.id,
      updatedAt: new Date()
    }; // await storage.updateDocument(documentId, { ...documentData, updatedBy: req.user.id });
    
    return res.json(createSuccessResponse(updatedDocument));
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const documentId = parseInt(req.params.id);
    
    if (isNaN(documentId)) {
      throw new BadRequestError('Invalid document ID');
    }
    
    // Get existing document
    // Assuming getDocument will be implemented in storage
    const existingDocument = null; // await storage.getDocument(documentId);
    
    if (!existingDocument) {
      throw new NotFoundError('Document not found');
    }
    
    // Check if user has permission to delete this document
    // This would check if the user is the creator or has delete permissions
    if (req.user?.role !== 'admin' && existingDocument.createdBy !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to delete this document');
    }
    
    // Delete document
    // Assuming deleteDocument will be implemented in storage
    // await storage.deleteDocument(documentId);
    
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/**
 * Get document versions
 */
export async function getDocumentVersions(req: Request, res: Response, next: NextFunction) {
  try {
    const documentId = parseInt(req.params.id);
    
    if (isNaN(documentId)) {
      throw new BadRequestError('Invalid document ID');
    }
    
    // Get existing document
    // Assuming getDocument will be implemented in storage
    const existingDocument = null; // await storage.getDocument(documentId);
    
    if (!existingDocument) {
      throw new NotFoundError('Document not found');
    }
    
    // Check if user has access to the document
    if (req.user?.role !== 'admin' && existingDocument.createdBy !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to view this document');
    }
    
    // Get document versions
    // Assuming getDocumentVersions will be implemented in storage
    const versions = []; // await storage.getDocumentVersions(documentId);
    
    return res.json(createSuccessResponse(versions));
  } catch (error) {
    next(error);
  }
}

/**
 * Get document comments
 */
export async function getDocumentComments(req: Request, res: Response, next: NextFunction) {
  try {
    const documentId = parseInt(req.params.id);
    
    if (isNaN(documentId)) {
      throw new BadRequestError('Invalid document ID');
    }
    
    // Get existing document
    // Assuming getDocument will be implemented in storage
    const existingDocument = null; // await storage.getDocument(documentId);
    
    if (!existingDocument) {
      throw new NotFoundError('Document not found');
    }
    
    // Check if user has access to the document
    if (req.user?.role !== 'admin' && existingDocument.createdBy !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to view this document');
    }
    
    // Get document comments
    // Assuming getDocumentComments will be implemented in storage
    const comments = []; // await storage.getDocumentComments(documentId);
    
    return res.json(createSuccessResponse(comments));
  } catch (error) {
    next(error);
  }
}

/**
 * Add comment to document
 */
export async function addDocumentComment(req: Request, res: Response, next: NextFunction) {
  try {
    const documentId = parseInt(req.params.id);
    
    if (isNaN(documentId)) {
      throw new BadRequestError('Invalid document ID');
    }
    
    // Validate request body
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      throw new BadRequestError('Comment content is required');
    }
    
    // Get existing document
    // Assuming getDocument will be implemented in storage
    const existingDocument = null; // await storage.getDocument(documentId);
    
    if (!existingDocument) {
      throw new NotFoundError('Document not found');
    }
    
    // Check if user has access to the document
    if (req.user?.role !== 'admin' && existingDocument.createdBy !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to comment on this document');
    }
    
    // Add comment
    // Assuming addDocumentComment will be implemented in storage
    const newComment = {
      id: 1, // This would be set by the database
      content,
      userId: req.user?.id,
      entityType: 'document',
      entityId: documentId,
      createdAt: new Date(),
      updatedAt: new Date()
    }; // await storage.addComment({ content, userId: req.user.id, entityType: 'document', entityId: documentId });
    
    return res.status(201).json(createSuccessResponse(newComment));
  } catch (error) {
    next(error);
  }
}