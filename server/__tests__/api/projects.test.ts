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
import { Project, InsertProject } from '../../../shared/schema';

describe('Projects API', () => {
  let app: Express;
  let server: Server;
  let testData: any;
  let adminToken: string;
  let userToken: string;
  let testProject: Project;

  // Setup test app and data
  beforeAll(async () => {
    // Create test app
    const testApp = await createTestApp();
    app = testApp.app;
    server = testApp.server;
    
    // Create test data
    testData = await createTestData();
    testProject = testData.projects[0];
    
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

  describe('GET /api/projects', () => {
    it('should return a list of projects for authenticated users', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/projects?status=active')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // All returned projects should have active status
      expect(response.body.data.every((project: any) => project.status === 'active')).toBe(true);
    });
    
    it('should support filtering by search query', async () => {
      const response = await request(app)
        .get(`/api/projects?search=${testProject.name.substring(0, 5)}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // At least one project should match the search
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/projects?page=1&pageSize=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(10);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get('/api/projects')
        .expect(401);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return a specific project by ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testProject.id);
      expect(response.body.data.name).toBe(testProject.name);
    });
    
    it('should return 404 for non-existent project ID', async () => {
      await request(app)
        .get('/api/projects/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/projects/${testProject.id}`)
        .expect(401);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const newProjectData: Partial<InsertProject> = {
        name: 'New Test Project',
        description: 'This is a test project created by API test',
        status: 'planning',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        progress: 0
      };
      
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newProjectData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(newProjectData.name);
      expect(response.body.data.description).toBe(newProjectData.description);
      expect(response.body.data.status).toBe(newProjectData.status);
      
      // Add the created project to testData for cleanup
      testData.projects.push(response.body.data);
    });
    
    it('should validate required fields', async () => {
      const invalidProject = {
        description: 'Missing required name field'
      };
      
      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidProject)
        .expect(400);
    });
    
    it('should validate status enum values', async () => {
      const invalidProject = {
        name: 'Invalid Status Project',
        status: 'invalid_status'
      };
      
      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidProject)
        .expect(400);
    });
    
    it('should require authentication', async () => {
      const newProjectData = {
        name: 'Unauthenticated Project',
        description: 'This should fail without auth'
      };
      
      await request(app)
        .post('/api/projects')
        .send(newProjectData)
        .expect(401);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should update project data', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated project description',
        progress: 25
      };
      
      const response = await request(app)
        .patch(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testProject.id);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.progress).toBe(updateData.progress);
    });
    
    it('should prevent updates to non-existent projects', async () => {
      await request(app)
        .patch('/api/projects/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Non-existent Project' })
        .expect(404);
    });
    
    it('should validate status enum values on update', async () => {
      await request(app)
        .patch(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/projects/${testProject.id}`)
        .send({ name: 'Unauthenticated Update' })
        .expect(401);
    });
  });

  describe('GET /api/projects/:id/members', () => {
    it('should return project members', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.id}/members`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      // Members array might be empty if no members are assigned in test data
    });
    
    it('should return 404 for non-existent project ID', async () => {
      await request(app)
        .get('/api/projects/9999/members')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/projects/${testProject.id}/members`)
        .expect(401);
    });
  });

  describe('POST /api/projects/:id/members', () => {
    it('should add a member to a project', async () => {
      const userId = testData.users[1].id; // Use a test user ID
      
      const response = await request(app)
        .post(`/api/projects/${testProject.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: 'contributor' })
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(userId);
      expect(response.body.data.projectId).toBe(testProject.id);
    });
    
    it('should validate required fields', async () => {
      await request(app)
        .post(`/api/projects/${testProject.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'contributor' })
        .expect(400);
    });
    
    it('should validate role values', async () => {
      const userId = testData.users[1].id;
      
      await request(app)
        .post(`/api/projects/${testProject.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: 'invalid_role' })
        .expect(400);
    });
    
    it('should prevent adding members to non-existent projects', async () => {
      const userId = testData.users[1].id;
      
      await request(app)
        .post('/api/projects/9999/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: 'contributor' })
        .expect(404);
    });
    
    it('should require admin or project owner permissions', async () => {
      // Assuming userToken doesn't have ownership of the test project
      const userId = testData.users[1].id;
      
      const response = await request(app)
        .post(`/api/projects/${testProject.id}/members`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId, role: 'contributor' });
      
      // Should either return 403 or 401 based on permission model
      expect(response.status === 403 || response.status === 401).toBe(true);
    });
    
    it('should require authentication', async () => {
      const userId = testData.users[1].id;
      
      await request(app)
        .post(`/api/projects/${testProject.id}/members`)
        .send({ userId, role: 'contributor' })
        .expect(401);
    });
  });
});