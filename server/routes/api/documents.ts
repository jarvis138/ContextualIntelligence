/**
 * Document API Routes
 * 
 * This module defines the API routes for document management.
 */

import { Router } from 'express';
import { 
  getDocuments, 
  getDocumentById, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  getDocumentVersions,
  getDocumentComments,
  addDocumentComment
} from '../../controllers/documentController';
import { authenticateToken, authorizeRoles } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { z } from 'zod';

// Create router
const documentRoutes = Router();

// Document enums
const DocumentAccess = ['public', 'internal', 'restricted', 'private'] as const;
const DocumentLifecycle = ['draft', 'active', 'archived', 'deleted'] as const;
const DocumentType = ['text', 'requirements', 'design', 'code', 'meeting', 'summary', 'report'] as const;

// Validation schemas
const documentIdParamSchema = z.object({
  id: z.string().refine(val => !isNaN(parseInt(val)), {
    message: 'Document ID must be a valid number'
  })
});

const createDocumentBodySchema = z.object({
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

const updateDocumentBodySchema = z.object({
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

const addCommentBodySchema = z.object({
  content: z.string().min(1)
});

// Routes
// GET /api/documents - Get all documents
documentRoutes.get('/',
  authenticateToken,
  getDocuments
);

// GET /api/documents/:id - Get document by ID
documentRoutes.get('/:id',
  authenticateToken,
  validateParams(documentIdParamSchema),
  getDocumentById
);

// POST /api/documents - Create a new document
documentRoutes.post('/',
  authenticateToken,
  validateBody(createDocumentBodySchema),
  createDocument
);

// PATCH /api/documents/:id - Update an existing document
documentRoutes.patch('/:id',
  authenticateToken,
  validateParams(documentIdParamSchema),
  validateBody(updateDocumentBodySchema),
  updateDocument
);

// DELETE /api/documents/:id - Delete a document
documentRoutes.delete('/:id',
  authenticateToken,
  validateParams(documentIdParamSchema),
  deleteDocument
);

// GET /api/documents/:id/versions - Get document versions
documentRoutes.get('/:id/versions',
  authenticateToken,
  validateParams(documentIdParamSchema),
  getDocumentVersions
);

// GET /api/documents/:id/comments - Get document comments
documentRoutes.get('/:id/comments',
  authenticateToken,
  validateParams(documentIdParamSchema),
  getDocumentComments
);

// POST /api/documents/:id/comments - Add comment to document
documentRoutes.post('/:id/comments',
  authenticateToken,
  validateParams(documentIdParamSchema),
  validateBody(addCommentBodySchema),
  addDocumentComment
);

export { documentRoutes };