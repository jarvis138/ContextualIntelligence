import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { registerRoutes } from '../../routes';
import { storage } from '../../storage';
import { Project, InsertProject } from '../../../shared/schema';

describe('Projects API', () => {
  let app: Express;
  let server: any;
  let testProject: Project;

  // Setup test app
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Register API routes
    server = await registerRoutes(app);

    // Create a test project
    const projectData: InsertProject = {
      name: 'Test API Project',
      description: 'A project for API testing',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
      status: 'in_progress',
      progress: 0,
      ownerId: 1
    };

    testProject = await storage.createProject(projectData);
  });

  afterAll(() => {
    if (server && server.close) {
      server.close();
    }
  });

  describe('GET /api/projects', () => {
    it('should return all projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return a specific project by ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('id', testProject.id);
      expect(response.body).toHaveProperty('name', testProject.name);
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get('/api/projects/9999')
        .expect(404);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const newProjectData: InsertProject = {
        name: 'New Test Project',
        description: 'Project created during API test',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days later
        status: 'planning',
        progress: 0,
        ownerId: 1
      };

      const response = await request(app)
        .post('/api/projects')
        .send(newProjectData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newProjectData.name);
    });

    it('should validate project data', async () => {
      // Missing required fields
      const invalidProject = {
        description: 'Invalid project without required fields'
      };

      await request(app)
        .post('/api/projects')
        .send(invalidProject)
        .expect(400);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should update an existing project', async () => {
      const updatedData = {
        name: 'Updated Project Name',
        progress: 25
      };

      const response = await request(app)
        .patch(`/api/projects/${testProject.id}`)
        .send(updatedData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('name', updatedData.name);
      expect(response.body).toHaveProperty('progress', updatedData.progress);
    });

    it('should return 404 for updating non-existent project', async () => {
      await request(app)
        .patch('/api/projects/9999')
        .send({ name: 'Non-existent Project' })
        .expect(404);
    });
  });
});