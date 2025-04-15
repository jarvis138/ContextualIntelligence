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
import { User, InsertUser } from '../../../shared/schema';
import { hashPassword } from '../../auth';

describe('Users API', () => {
  let app: Express;
  let server: Server;
  let testData: any;
  let adminToken: string;
  let userToken: string;
  let testUser: User;

  // Setup test app and data
  beforeAll(async () => {
    // Create test app
    const testApp = await createTestApp();
    app = testApp.app;
    server = testApp.server;
    
    // Create test data
    testData = await createTestData();
    testUser = testData.users[1]; // Regular user
    
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

  describe('GET /api/users', () => {
    it('should return a list of users for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should restrict non-admin users', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(10);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a specific user by ID for admin', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testUser.id);
      expect(response.body.data.username).toBe(testUser.username);
      
      // Password should not be included in response
      expect(response.body.data.password).toBeUndefined();
    });
    
    it('should allow users to access their own data', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testUser.id);
      expect(response.body.data.username).toBe(testUser.username);
    });
    
    it('should prevent users from accessing other users data', async () => {
      // Assuming admin user has ID 1
      const adminUser = testData.users[0];
      
      await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
    
    it('should return 404 for non-existent user ID', async () => {
      await request(app)
        .get('/api/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/users/${testUser.id}`)
        .expect(401);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user as admin', async () => {
      const hashedPassword = await hashPassword('newuserpassword');
      
      const newUserData: InsertUser = {
        username: 'new_test_user',
        password: hashedPassword,
        email: 'new_test_user@example.com',
        fullName: 'New Test User',
        role: 'user'
      };
      
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.username).toBe(newUserData.username);
      expect(response.body.data.email).toBe(newUserData.email);
      expect(response.body.data.fullName).toBe(newUserData.fullName);
      expect(response.body.data.role).toBe(newUserData.role);
      
      // Password should not be included in response
      expect(response.body.data.password).toBeUndefined();
      
      // Add the created user to testData for cleanup
      testData.users.push(response.body.data);
    });
    
    it('should validate required fields', async () => {
      const invalidUser = {
        email: 'invalid@example.com'
      };
      
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUser)
        .expect(400);
    });
    
    it('should prevent duplicate usernames', async () => {
      const duplicateUser: InsertUser = {
        username: testUser.username, // Use existing username
        password: 'duplicatepassword',
        email: 'duplicate@example.com',
        fullName: 'Duplicate User',
        role: 'user'
      };
      
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateUser)
        .expect(400);
    });
    
    it('should restrict non-admin users', async () => {
      const newUserData: InsertUser = {
        username: 'unauthorized_user',
        password: 'password',
        email: 'unauthorized@example.com',
        fullName: 'Unauthorized User',
        role: 'user'
      };
      
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newUserData)
        .expect(403);
    });
    
    it('should require authentication', async () => {
      const newUserData: InsertUser = {
        username: 'unauthenticated_user',
        password: 'password',
        email: 'unauthenticated@example.com',
        fullName: 'Unauthenticated User',
        role: 'user'
      };
      
      await request(app)
        .post('/api/users')
        .send(newUserData)
        .expect(401);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update user data as admin', async () => {
      const updateData = {
        fullName: 'Updated User Name',
        email: 'updated@example.com'
      };
      
      const response = await request(app)
        .patch(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testUser.id);
      expect(response.body.data.fullName).toBe(updateData.fullName);
      expect(response.body.data.email).toBe(updateData.email);
    });
    
    it('should allow users to update their own data', async () => {
      const updateData = {
        fullName: 'Self Updated Name'
      };
      
      const response = await request(app)
        .patch(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testUser.id);
      expect(response.body.data.fullName).toBe(updateData.fullName);
    });
    
    it('should prevent users from updating other users data', async () => {
      // Assuming admin user has ID 1
      const adminUser = testData.users[0];
      
      await request(app)
        .patch(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'Unauthorized Update' })
        .expect(403);
    });
    
    it('should prevent users from changing their own role', async () => {
      const updateData = {
        role: 'admin'
      };
      
      const response = await request(app)
        .patch(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);
      
      // Either this should be forbidden (403) or the role change should be ignored
      if (response.status === 200) {
        expect(response.body.data.role).not.toBe('admin');
      } else {
        expect(response.status).toBe(403);
      }
    });
    
    it('should allow admins to change user roles', async () => {
      const updateData = {
        role: 'manager'
      };
      
      const response = await request(app)
        .patch(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data.role).toBe(updateData.role);
    });
    
    it('should return 404 for non-existent user ID', async () => {
      await request(app)
        .patch('/api/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Non-existent User' })
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/users/${testUser.id}`)
        .send({ fullName: 'Unauthenticated Update' })
        .expect(401);
    });
  });

  describe('GET /api/users/profile', () => {
    it('should return the authenticated user\'s profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.username).toBe(testUser.username);
      
      // Sensitive data should be excluded
      expect(response.body.data.password).toBeUndefined();
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });
  });
});