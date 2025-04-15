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
import { Team, InsertTeam } from '../../../shared/schema';

describe('Teams API', () => {
  let app: Express;
  let server: Server;
  let testData: any;
  let adminToken: string;
  let userToken: string;
  let testTeam: Team;

  // Setup test app and data
  beforeAll(async () => {
    // Create test app
    const testApp = await createTestApp();
    app = testApp.app;
    server = testApp.server;
    
    // Create test data
    testData = await createTestData();
    testTeam = testData.teams[0];
    
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

  describe('GET /api/teams', () => {
    it('should return a list of teams for authenticated users', async () => {
      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should support filtering by name', async () => {
      const response = await request(app)
        .get(`/api/teams?name=${encodeURIComponent(testTeam.name.substring(0, 3))}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // At least one team should match the search
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/teams?page=1&pageSize=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(10);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get('/api/teams')
        .expect(401);
    });
  });

  describe('GET /api/teams/:id', () => {
    it('should return a specific team by ID', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testTeam.id);
      expect(response.body.data.name).toBe(testTeam.name);
    });
    
    it('should return 404 for non-existent team ID', async () => {
      await request(app)
        .get('/api/teams/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/teams/${testTeam.id}`)
        .expect(401);
    });
  });

  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const newTeamData: Partial<InsertTeam> = {
        name: 'New Test Team',
        description: 'This is a test team created by API test',
        icon: 'group',
        progress: 0
      };
      
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newTeamData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(newTeamData.name);
      expect(response.body.data.description).toBe(newTeamData.description);
      expect(response.body.data.icon).toBe(newTeamData.icon);
      
      // Add the created team to testData for cleanup
      testData.teams.push(response.body.data);
    });
    
    it('should validate required fields', async () => {
      const invalidTeam = {
        description: 'Missing required name field'
      };
      
      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidTeam)
        .expect(400);
    });
    
    it('should validate progress range', async () => {
      const invalidTeam = {
        name: 'Invalid Progress Team',
        progress: 101 // Progress should be 0-100
      };
      
      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidTeam)
        .expect(400);
    });
    
    it('should require authentication', async () => {
      const newTeamData = {
        name: 'Unauthenticated Team',
        description: 'This should fail without auth'
      };
      
      await request(app)
        .post('/api/teams')
        .send(newTeamData)
        .expect(401);
    });
  });

  describe('PATCH /api/teams/:id', () => {
    it('should update team data', async () => {
      const updateData = {
        name: 'Updated Team Name',
        description: 'Updated team description',
        progress: 25
      };
      
      const response = await request(app)
        .patch(`/api/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testTeam.id);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.progress).toBe(updateData.progress);
    });
    
    it('should prevent updates to non-existent teams', async () => {
      await request(app)
        .patch('/api/teams/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Non-existent Team' })
        .expect(404);
    });
    
    it('should validate progress range on update', async () => {
      await request(app)
        .patch(`/api/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ progress: -10 }) // Progress should be 0-100
        .expect(400);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/teams/${testTeam.id}`)
        .send({ name: 'Unauthenticated Update' })
        .expect(401);
    });
    
    it('should enforce team ownership or admin role for updates', async () => {
      // This test assumes there's a team in the test data 
      // that the regular user doesn't own and isn't a member of
      const otherTeamIdx = testData.teams.findIndex((team: any) => 
        team.ownerId !== testData.users[1].id &&
        !team.members?.some((m: any) => m.userId === testData.users[1].id)
      );
      
      if (otherTeamIdx >= 0) {
        const otherTeam = testData.teams[otherTeamIdx];
        await request(app)
          .patch(`/api/teams/${otherTeam.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'Unauthorized Update' })
          .expect(403);
      }
    });
  });

  describe('GET /api/teams/:id/members', () => {
    it('should return team members', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      // Members array might be empty if no members are assigned in test data
    });
    
    it('should return 404 for non-existent team ID', async () => {
      await request(app)
        .get('/api/teams/9999/members')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/teams/${testTeam.id}/members`)
        .expect(401);
    });
  });

  describe('POST /api/teams/:id/members', () => {
    it('should add a member to a team', async () => {
      const userId = testData.users[1].id; // Use a test user ID
      
      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: 'member' })
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(userId);
      expect(response.body.data.teamId).toBe(testTeam.id);
    });
    
    it('should validate required fields', async () => {
      await request(app)
        .post(`/api/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'member' })
        .expect(400);
    });
    
    it('should validate role values', async () => {
      const userId = testData.users[1].id;
      
      await request(app)
        .post(`/api/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: 'invalid_role' })
        .expect(400);
    });
    
    it('should prevent adding members to non-existent teams', async () => {
      const userId = testData.users[1].id;
      
      await request(app)
        .post('/api/teams/9999/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId, role: 'member' })
        .expect(404);
    });
    
    it('should require team ownership or admin role', async () => {
      // This assumes the regular user is not the owner of the test team
      // and is testing if a non-owner can add members
      if (testTeam.ownerId !== testData.users[1].id) {
        const userId = testData.users[0].id;
        
        const response = await request(app)
          .post(`/api/teams/${testTeam.id}/members`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ userId, role: 'member' });
        
        // Should either return 403 or 401 based on permission model
        expect(response.status === 403 || response.status === 401).toBe(true);
      }
    });
    
    it('should require authentication', async () => {
      const userId = testData.users[1].id;
      
      await request(app)
        .post(`/api/teams/${testTeam.id}/members`)
        .send({ userId, role: 'member' })
        .expect(401);
    });
  });
});