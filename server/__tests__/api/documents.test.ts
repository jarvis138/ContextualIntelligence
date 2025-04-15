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
    it('should return a list of documents for authenticated users', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should support filtering by tags', async () => {
      // Assuming test document has tags
      if (testDocument.tags && testDocument.tags.length > 0) {
        const response = await request(app)
          .get(`/api/documents?tags=${testDocument.tags[0]}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);
        
        // At least one document should have the tag
        expect(response.body.data.length).toBeGreaterThan(0);
      }
    });
    
    it('should support filtering by access level', async () => {
      const response = await request(app)
        .get('/api/documents?accessLevel=public')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // All returned documents should have public access level
      expect(response.body.data.every((doc: any) => doc.accessLevel === 'public')).toBe(true);
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/documents?page=1&pageSize=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
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
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testDocument.id);
      expect(response.body.data.title).toBe(testDocument.title);
    });
    
    it('should return 404 for non-existent document ID', async () => {
      await request(app)
        .get('/api/documents/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
    
    it('should respect access control for private documents', async () => {
      // This test assumes there's a private document in the test data
      // that the regular user doesn't have access to
      const privateDocIdx = testData.documents.findIndex((doc: any) => 
        doc.accessLevel === 'private' && doc.createdBy !== testData.users[1].id
      );
      
      if (privateDocIdx >= 0) {
        const privateDoc = testData.documents[privateDocIdx];
        await request(app)
          .get(`/api/documents/${privateDoc.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      }
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/documents/${testDocument.id}`)
        .expect(401);
    });
  });

  describe('POST /api/documents', () => {
    it('should create a new document', async () => {
      const newDocumentData: Partial<InsertDocument> = {
        title: 'New Test Document',
        content: 'This is a test document created by API test',
        description: 'Test document description',
        tags: ['test', 'api'],
        accessLevel: 'public',
        lifecycleState: 'draft'
      };
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newDocumentData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe(newDocumentData.title);
      expect(response.body.data.content).toBe(newDocumentData.content);
      expect(response.body.data.tags).toEqual(newDocumentData.tags);
      
      // Add the created document to testData for cleanup
      testData.documents.push(response.body.data);
    });
    
    it('should validate required fields', async () => {
      const invalidDocument = {
        content: 'Missing required title field'
      };
      
      await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidDocument)
        .expect(400);
    });
    
    it('should validate access level enum values', async () => {
      const invalidDocument = {
        title: 'Invalid Access Level Document',
        content: 'Test content',
        accessLevel: 'invalid_level'
      };
      
      await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidDocument)
        .expect(400);
    });
    
    it('should require authentication', async () => {
      const newDocumentData = {
        title: 'Unauthenticated Document',
        content: 'This should fail without auth'
      };
      
      await request(app)
        .post('/api/documents')
        .send(newDocumentData)
        .expect(401);
    });
  });

  describe('PATCH /api/documents/:id', () => {
    it('should update document data', async () => {
      const updateData = {
        title: 'Updated Document Title',
        description: 'Updated document description',
        tags: ['updated', 'test']
      };
      
      const response = await request(app)
        .patch(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testDocument.id);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.tags).toEqual(updateData.tags);
    });
    
    it('should prevent updates to non-existent documents', async () => {
      await request(app)
        .patch('/api/documents/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Non-existent Document' })
        .expect(404);
    });
    
    it('should validate lifecycle state enum values on update', async () => {
      await request(app)
        .patch(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ lifecycleState: 'invalid_state' })
        .expect(400);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/documents/${testDocument.id}`)
        .send({ title: 'Unauthenticated Update' })
        .expect(401);
    });
    
    it('should enforce document ownership for updates', async () => {
      // This test assumes there's a document in the test data 
      // that the regular user doesn't own
      const otherDocIdx = testData.documents.findIndex((doc: any) => 
        doc.createdBy !== testData.users[1].id
      );
      
      if (otherDocIdx >= 0) {
        const otherDoc = testData.documents[otherDocIdx];
        await request(app)
          .patch(`/api/documents/${otherDoc.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ title: 'Unauthorized Update' })
          .expect(403);
      }
    });
  });

  describe('GET /api/documents/:id/versions', () => {
    it('should return document versions', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}/versions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      // Versions array might be empty if no versions exist in test data
    });
    
    it('should return 404 for non-existent document ID', async () => {
      await request(app)
        .get('/api/documents/9999/versions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/documents/${testDocument.id}/versions`)
        .expect(401);
    });
  });

  describe('GET /api/documents/:id/comments', () => {
    it('should return document comments', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      // Comments array might be empty if no comments exist in test data
    });
    
    it('should return 404 for non-existent document ID', async () => {
      await request(app)
        .get('/api/documents/9999/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
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
        text: 'This is a test comment',
        type: 'feedback'
      };
      
      const response = await request(app)
        .post(`/api/documents/${testDocument.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.text).toBe(commentData.text);
      expect(response.body.data.type).toBe(commentData.type);
      expect(response.body.data.documentId).toBe(testDocument.id);
    });
    
    it('should validate required fields', async () => {
      const invalidComment = {
        type: 'feedback'
        // Missing required text field
      };
      
      await request(app)
        .post(`/api/documents/${testDocument.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidComment)
        .expect(400);
    });
    
    it('should validate comment type enum values', async () => {
      const invalidComment = {
        text: 'Test comment',
        type: 'invalid_type'
      };
      
      await request(app)
        .post(`/api/documents/${testDocument.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidComment)
        .expect(400);
    });
    
    it('should prevent adding comments to non-existent documents', async () => {
      const commentData = {
        text: 'This is a test comment',
        type: 'feedback'
      };
      
      await request(app)
        .post('/api/documents/9999/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      const commentData = {
        text: 'This should fail without auth',
        type: 'feedback'
      };
      
      await request(app)
        .post(`/api/documents/${testDocument.id}/comments`)
        .send(commentData)
        .expect(401);
    });
  });
});