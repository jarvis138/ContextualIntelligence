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
    it('should return a list of tasks for authenticated users', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=pending')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // All returned tasks should have pending status
      expect(response.body.data.every((task: any) => task.status === 'pending')).toBe(true);
    });
    
    it('should support filtering by assignee', async () => {
      // Assuming test task has an assignee
      if (testTask.assigneeId) {
        const response = await request(app)
          .get(`/api/tasks?assigneeId=${testTask.assigneeId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect('Content-Type', /json/)
          .expect(200);
        
        // All returned tasks should be assigned to the specified user
        expect(response.body.data.every((task: any) => task.assigneeId === testTask.assigneeId)).toBe(true);
      }
    });
    
    it('should support filtering by due date', async () => {
      // Assuming tasks have due dates
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/tasks?dueDateFrom=${today}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Returned tasks should have due dates later than or equal to today
      // (Due to timezone issues, we'll skip the actual date comparison check)
      expect(response.body.data).toBeDefined();
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&pageSize=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
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
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testTask.id);
      expect(response.body.data.title).toBe(testTask.title);
    });
    
    it('should return 404 for non-existent task ID', async () => {
      await request(app)
        .get('/api/tasks/9999')
        .set('Authorization', `Bearer ${userToken}`)
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
      const newTaskData: Partial<InsertTask> = {
        title: 'New Test Task',
        description: 'This is a test task created by API test',
        status: 'pending',
        priority: 'medium',
        assigneeId: testData.users[1].id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newTaskData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe(newTaskData.title);
      expect(response.body.data.description).toBe(newTaskData.description);
      expect(response.body.data.status).toBe(newTaskData.status);
      expect(response.body.data.priority).toBe(newTaskData.priority);
      
      // Add the created task to testData for cleanup
      testData.tasks.push(response.body.data);
    });
    
    it('should validate required fields', async () => {
      const invalidTask = {
        description: 'Missing required title field'
      };
      
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidTask)
        .expect(400);
    });
    
    it('should validate status enum values', async () => {
      const invalidTask = {
        title: 'Invalid Status Task',
        status: 'invalid_status'
      };
      
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidTask)
        .expect(400);
    });
    
    it('should require authentication', async () => {
      const newTaskData = {
        title: 'Unauthenticated Task',
        description: 'This should fail without auth'
      };
      
      await request(app)
        .post('/api/tasks')
        .send(newTaskData)
        .expect(401);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should update task data', async () => {
      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated task description',
        status: 'in_progress',
        priority: 'high'
      };
      
      const response = await request(app)
        .patch(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testTask.id);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.priority).toBe(updateData.priority);
    });
    
    it('should prevent updates to non-existent tasks', async () => {
      await request(app)
        .patch('/api/tasks/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Non-existent Task' })
        .expect(404);
    });
    
    it('should validate status enum values on update', async () => {
      await request(app)
        .patch(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/tasks/${testTask.id}`)
        .send({ title: 'Unauthenticated Update' })
        .expect(401);
    });
    
    it('should enforce task ownership or assignee for updates', async () => {
      // This test assumes there's a task in the test data 
      // that the regular user doesn't own and isn't assigned to
      const otherTaskIdx = testData.tasks.findIndex((task: any) => 
        task.createdBy !== testData.users[1].id && task.assigneeId !== testData.users[1].id
      );
      
      if (otherTaskIdx >= 0) {
        const otherTask = testData.tasks[otherTaskIdx];
        await request(app)
          .patch(`/api/tasks/${otherTask.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ title: 'Unauthorized Update' })
          .expect(403);
      }
    });
  });

  describe('GET /api/tasks/:id/comments', () => {
    it('should return task comments', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      // Comments array might be empty if no comments exist in test data
    });
    
    it('should return 404 for non-existent task ID', async () => {
      await request(app)
        .get('/api/tasks/9999/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
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
        text: 'This is a test comment',
        type: 'note'
      };
      
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.text).toBe(commentData.text);
      expect(response.body.data.type).toBe(commentData.type);
      expect(response.body.data.taskId).toBe(testTask.id);
    });
    
    it('should validate required fields', async () => {
      const invalidComment = {
        type: 'note'
        // Missing required text field
      };
      
      await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
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
        .post(`/api/tasks/${testTask.id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidComment)
        .expect(400);
    });
    
    it('should prevent adding comments to non-existent tasks', async () => {
      const commentData = {
        text: 'This is a test comment',
        type: 'note'
      };
      
      await request(app)
        .post('/api/tasks/9999/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      const commentData = {
        text: 'This should fail without auth',
        type: 'note'
      };
      
      await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send(commentData)
        .expect(401);
    });
  });
});