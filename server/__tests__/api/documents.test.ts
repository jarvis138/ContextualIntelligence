import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Express } from 'express';
import { Server } from 'http';
import request from 'supertest';
import { 
  createTestApp, 
  createTestData, 
  cleanupTestData,
  getAuthToken 
} from '../utils/testUtils';
import { Document, InsertDocument } from '../../../shared/schema';

describe('Documents API', () => {
  let app: Express;
  let server: Server;
  let testData: any;
  let adminToken: string;
  let userToken: string;
  let testDocument: Document;

  // Setup test app and data
  beforeAll(async () => {
    // Create test app
    const testApp = await createTestApp();
    app = testApp.app;
    server = testApp.server;
    
    // Create test data
    testData = await createTestData();
    testDocument = testData.documents[0];
    
    // Get authentication tokens
    try {
      adminToken = await getAuthToken(app, 'admin_test', 'password123');
      userToken = await getAuthToken(app, 'user_test', 'password123');
    } catch (error) {
      console.error('Failed to get auth tokens:', error);
    }
  });

  // Clean up after tests
  afterAll(async () => {
    if (server && server.close) {
      server.close();
    }
    
    await cleanupTestData(testData);
  });

  describe('GET /api/documents', () => {
    it('should return a list of documents', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should support filtering by project ID', async () => {
      const response = await request(app)
        .get(`/api/documents?projectId=${testData.projects[0].id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned documents should be from the specified project
      for (const doc of response.body.data) {
        expect(doc.projectId).toBe(testData.projects[0].id);
      }
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/documents?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(10);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get('/api/documents')
        .expect(401);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return a specific document by ID', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testDocument.id);
      expect(response.body.data.title).toBe(testDocument.title);
    });
    
    it('should return 404 for non-existent document ID', async () => {
      await request(app)
        .get('/api/documents/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/documents/${testDocument.id}`)
        .expect(401);
    });
  });

  describe('POST /api/documents', () => {
    it('should create a new document', async () => {
      const newDocumentData: InsertDocument = {
        title: 'New Test Document',
        content: 'Content created during API tests',
        description: 'Document created during API tests',
        fileType: 'text',
        projectId: testData.projects[0].id,
        createdBy: testData.users[0].id,
        updatedBy: testData.users[0].id
      };
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newDocumentData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe(newDocumentData.title);
      expect(response.body.data.content).toBe(newDocumentData.content);
      expect(response.body.data.description).toBe(newDocumentData.description);
      expect(response.body.data.fileType).toBe(newDocumentData.fileType);
      expect(response.body.data.projectId).toBe(newDocumentData.projectId);
      
      // Add the created document to testData for cleanup
      testData.documents.push(response.body.data);
    });
    
    it('should validate required fields', async () => {
      const invalidDocument = {
        description: 'Invalid document without required fields'
      };
      
      await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidDocument)
        .expect(400);
    });
    
    it('should require authentication', async () => {
      const documentData = {
        title: 'Unauthenticated Document',
        content: 'Document content',
        fileType: 'text',
        projectId: testData.projects[0].id
      };
      
      await request(app)
        .post('/api/documents')
        .send(documentData)
        .expect(401);
    });
  });

  describe('PATCH /api/documents/:id', () => {
    it('should update an existing document', async () => {
      const updateData = {
        title: 'Updated Document Title',
        content: 'Updated document content',
        description: 'Updated document description'
      };
      
      const response = await request(app)
        .patch(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testDocument.id);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.content).toBe(updateData.content);
      expect(response.body.data.description).toBe(updateData.description);
    });
    
    it('should return 404 for non-existent document ID', async () => {
      await request(app)
        .patch('/api/documents/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Update Non-existent Document' })
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/documents/${testDocument.id}`)
        .send({ title: 'Unauthenticated Update' })
        .expect(401);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete an existing document', async () => {
      // First create a document to delete
      const documentToDelete: InsertDocument = {
        title: 'Document To Delete',
        content: 'This document will be deleted',
        description: 'This is a test document for deletion',
        fileType: 'text',
        projectId: testData.projects[0].id,
        createdBy: testData.users[0].id,
        updatedBy: testData.users[0].id
      };
      
      const createResponse = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(documentToDelete)
        .expect(201);
      
      const documentId = createResponse.body.data.id;
      
      // Now delete the document
      await request(app)
        .delete(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      
      // Verify the document is gone
      await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should return 404 for non-existent document ID', async () => {
      await request(app)
        .delete('/api/documents/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/documents/${testDocument.id}`)
        .expect(401);
    });
  });

  describe('GET /api/documents/:id/versions', () => {
    it('should return versions for a document', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}/versions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/documents/${testDocument.id}/versions`)
        .expect(401);
    });
  });

  describe('GET /api/documents/:id/comments', () => {
    it('should return comments for a document', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/documents/${testDocument.id}/comments`)
        .expect(401);
    });
  });

  describe('POST /api/documents/:id/comments', () => {
    it('should add a comment to a document', async () => {
      const commentData = {
        content: 'This is a test comment added during API tests'
      };
      
      const response = await request(app)
        .post(`/api/documents/${testDocument.id}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(commentData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.content).toBe(commentData.content);
      expect(response.body.data.entityType).toBe('document');
      expect(response.body.data.entityId).toBe(testDocument.id);
    });
    
    it('should validate required fields', async () => {
      await request(app)
        .post(`/api/documents/${testDocument.id}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .post(`/api/documents/${testDocument.id}/comments`)
        .send({ content: 'Unauthenticated comment' })
        .expect(401);
    });
  });
});