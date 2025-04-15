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
import { Task, InsertTask } from '../../../shared/schema';

describe('Tasks API', () => {
  let app: Express;
  let server: Server;
  let testData: any;
  let adminToken: string;
  let userToken: string;
  let testTask: Task;

  // Setup test app and data
  beforeAll(async () => {
    // Create test app
    const testApp = await createTestApp();
    app = testApp.app;
    server = testApp.server;
    
    // Create test data
    testData = await createTestData();
    testTask = testData.tasks[0];
    
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

  describe('GET /api/tasks', () => {
    it('should return a list of tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should support filtering by project ID', async () => {
      const response = await request(app)
        .get(`/api/tasks?projectId=${testData.projects[0].id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned tasks should be from the specified project
      for (const task of response.body.data) {
        expect(task.projectId).toBe(testData.projects[0].id);
      }
    });
    
    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned tasks should have the specified status
      for (const task of response.body.data) {
        expect(task.status).toBe('pending');
      }
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&pageSize=10')
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
        .get('/api/tasks')
        .expect(401);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return a specific task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testTask.id);
      expect(response.body.data.title).toBe(testTask.title);
    });
    
    it('should return 404 for non-existent task ID', async () => {
      await request(app)
        .get('/api/tasks/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/tasks/${testTask.id}`)
        .expect(401);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const newTaskData: InsertTask = {
        title: 'New Test Task',
        description: 'Task created during API tests',
        status: 'pending',
        projectId: testData.projects[0].id,
        assigneeId: testData.users[1].id,
        teamId: testData.teams[0].id,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newTaskData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe(newTaskData.title);
      expect(response.body.data.description).toBe(newTaskData.description);
      expect(response.body.data.status).toBe(newTaskData.status);
      expect(response.body.data.projectId).toBe(newTaskData.projectId);
      
      // Add the created task to testData for cleanup
      testData.tasks.push(response.body.data);
    });
    
    it('should validate required fields', async () => {
      const invalidTask = {
        description: 'Invalid task without required fields'
      };
      
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTask)
        .expect(400);
    });
    
    it('should require authentication', async () => {
      const taskData = {
        title: 'Unauthenticated Task',
        projectId: testData.projects[0].id,
        status: 'pending'
      };
      
      await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should update an existing task', async () => {
      const updateData = {
        title: 'Updated Task Title',
        status: 'in_progress',
        description: 'Updated task description'
      };
      
      const response = await request(app)
        .patch(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testTask.id);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.description).toBe(updateData.description);
    });
    
    it('should return 404 for non-existent task ID', async () => {
      await request(app)
        .patch('/api/tasks/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Update Non-existent Task' })
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/tasks/${testTask.id}`)
        .send({ title: 'Unauthenticated Update' })
        .expect(401);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete an existing task', async () => {
      // First create a task to delete
      const taskToDelete: InsertTask = {
        title: 'Task To Delete',
        description: 'This task will be deleted',
        status: 'pending',
        projectId: testData.projects[0].id
      };
      
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskToDelete)
        .expect(201);
      
      const taskId = createResponse.body.data.id;
      
      // Now delete the task
      await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      
      // Verify the task is gone
      await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should return 404 for non-existent task ID', async () => {
      await request(app)
        .delete('/api/tasks/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/tasks/${testTask.id}`)
        .expect(401);
    });
  });

  describe('GET /api/tasks/:id/comments', () => {
    it('should return comments for a task', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask.id}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/tasks/${testTask.id}/comments`)
        .expect(401);
    });
  });

  describe('POST /api/tasks/:id/comments', () => {
    it('should add a comment to a task', async () => {
      const commentData = {
        content: 'This is a test comment added during API tests'
      };
      
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(commentData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.content).toBe(commentData.content);
      expect(response.body.data.entityType).toBe('task');
      expect(response.body.data.entityId).toBe(testTask.id);
    });
    
    it('should validate required fields', async () => {
      await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send({ content: 'Unauthenticated comment' })
        .expect(401);
    });
  });
});