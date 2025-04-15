import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Express } from 'express';
import { Server } from 'http';
import request from 'supertest';
import { createTestApp, getAuthToken } from '../utils/testUtils';

/**
 * Integration tests for the entire API structure.
 * These tests verify that the API endpoints are properly structured and accessible.
 */
describe('API Structure Integration', () => {
  let app: Express;
  let server: Server;
  let adminToken: string;
  
  // Setup test app
  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    server = testApp.server;
    
    // For testing paths that require authentication
    try {
      // Create a test user with admin role for testing
      const adminUser = {
        username: 'admin_integration',
        password: 'password123',
        email: 'admin_integration@test.com',
        fullName: 'Admin Integration',
        role: 'admin'
      };
      
      // Register the user
      await request(app)
        .post('/api/register')
        .send(adminUser);
      
      // Get auth token
      adminToken = await getAuthToken(app, adminUser.username, adminUser.password);
    } catch (error) {
      console.error('Failed to create test user or get auth token:', error);
    }
  });
  
  // Clean up
  afterAll(() => {
    if (server && server.close) {
      server.close();
    }
  });
  
  describe('API Root', () => {
    it('should have a health check endpoint', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });
  
  describe('Authentication Endpoints', () => {
    it('should have login endpoint', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistentuser',
          password: 'invalidpassword'
        });
      
      // Even if login fails, the endpoint should exist
      expect(response.status).not.toBe(404);
    });
    
    it('should have logout endpoint', async () => {
      const response = await request(app)
        .post('/api/logout');
      
      // Even without auth, the endpoint should exist
      expect(response.status).not.toBe(404);
    });
  });
  
  describe('API Versioning', () => {
    it('should support API versioning structure', async () => {
      // This test is to verify the API versioning structure
      // This can be adjusted based on how versioning is actually implemented
      
      // For example, if using /api/v1/...
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);
      
      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('ok');
    });
  });
  
  describe('Response Format', () => {
    it('should return standardized response format for successful requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      // Check response structure
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });
    
    it('should return standardized error format', async () => {
      // Access a non-existent endpoint to trigger 404
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);
      
      // Check error response structure
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });
  
  describe('Core Resource Endpoints', () => {
    const coreResources = [
      'users',
      'projects',
      'tasks',
      'teams',
      'documents',
      'settings'
    ];
    
    // Test that each core resource has a GET endpoint
    for (const resource of coreResources) {
      it(`should have GET endpoint for ${resource}`, async () => {
        const response = await request(app)
          .get(`/api/${resource}`)
          .set('Authorization', `Bearer ${adminToken}`);
        
        // Even if it requires auth, the endpoint should exist
        expect(response.status).not.toBe(404);
      });
    }
  });
  
  describe('API Documentation', () => {
    it('should have API documentation endpoint if implemented', async () => {
      // This test is optional and depends on if API docs are implemented
      // For example, if using Swagger/OpenAPI
      const response = await request(app)
        .get('/api-docs');
      
      // If API docs are implemented, this should not be 404
      // If not implemented, this test can be skipped or commented out
      if (response.status !== 404) {
        expect(response.status).toBe(200);
      }
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/login')
        .set('Content-Type', 'application/json')
        .send('{invalid json')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should handle route not found', async () => {
      const response = await request(app)
        .get('/api/not-a-valid-route')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
    });
    
    it('should handle unauthorized access', async () => {
      // Access a protected resource without auth
      const response = await request(app)
        .get('/api/users')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
    });
  });
});