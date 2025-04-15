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

describe('Settings API', () => {
  let app: Express;
  let server: Server;
  let testData: any;
  let adminToken: string;
  let userToken: string;

  // Setup test app and data
  beforeAll(async () => {
    // Create test app
    const testApp = await createTestApp();
    app = testApp.app;
    server = testApp.server;
    
    // Create test data
    testData = await createTestData();
    
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

  describe('GET /api/settings', () => {
    it('should return application settings', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get('/api/settings')
        .expect(401);
    });
  });

  describe('POST /api/settings', () => {
    it('should update application settings as admin', async () => {
      const settingsData = {
        appName: 'Test App Name',
        theme: 'dark',
        language: 'en',
        notifications: {
          email: true,
          slack: false
        }
      };
      
      const response = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(settingsData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.success).toBe(true);
    });
    
    it('should restrict access to non-admin users', async () => {
      const settingsData = {
        appName: 'Unauthorized App Name',
        theme: 'light'
      };
      
      await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(settingsData)
        .expect(403);
    });
    
    it('should require authentication', async () => {
      const settingsData = {
        appName: 'Unauthenticated App Name',
        theme: 'dark'
      };
      
      await request(app)
        .post('/api/settings')
        .send(settingsData)
        .expect(401);
    });
  });

  describe('GET /api/settings/oauth-providers', () => {
    it('should return OAuth provider settings as admin', async () => {
      const response = await request(app)
        .get('/api/settings/oauth-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should restrict access to non-admin users', async () => {
      await request(app)
        .get('/api/settings/oauth-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get('/api/settings/oauth-providers')
        .expect(401);
    });
  });

  describe('POST /api/settings/oauth-providers', () => {
    it('should update OAuth provider settings as admin', async () => {
      const providersData = [
        {
          id: 'google',
          name: 'Google',
          providerId: 'google-oauth2',
          enabled: true,
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          scope: 'profile email'
        },
        {
          id: 'microsoft',
          name: 'Microsoft',
          providerId: 'microsoft-oauth2',
          enabled: false,
          clientId: null,
          clientSecret: null,
          scope: null
        }
      ];
      
      const response = await request(app)
        .post('/api/settings/oauth-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(providersData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.success).toBe(true);
    });
    
    it('should validate providers data structure', async () => {
      const invalidProvidersData = {
        id: 'invalid',
        enabled: true
      };
      
      await request(app)
        .post('/api/settings/oauth-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProvidersData)
        .expect(400);
    });
    
    it('should restrict access to non-admin users', async () => {
      const providersData = [
        {
          id: 'google',
          name: 'Google',
          providerId: 'google-oauth2',
          enabled: true,
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          scope: 'profile email'
        }
      ];
      
      await request(app)
        .post('/api/settings/oauth-providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send(providersData)
        .expect(403);
    });
    
    it('should require authentication', async () => {
      const providersData = [
        {
          id: 'google',
          name: 'Google',
          providerId: 'google-oauth2',
          enabled: true,
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          scope: 'profile email'
        }
      ];
      
      await request(app)
        .post('/api/settings/oauth-providers')
        .send(providersData)
        .expect(401);
    });
  });
});