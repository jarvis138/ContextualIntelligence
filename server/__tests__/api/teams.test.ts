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
    it('should return a list of teams', async () => {
      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
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
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testTeam.id);
      expect(response.body.data.name).toBe(testTeam.name);
    });
    
    it('should return 404 for non-existent team ID', async () => {
      await request(app)
        .get('/api/teams/9999')
        .set('Authorization', `Bearer ${adminToken}`)
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
      const newTeamData: InsertTeam = {
        name: 'New Test Team',
        description: 'Team created during API tests',
        icon: 'test-icon-new',
        progress: 10
      };
      
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newTeamData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(newTeamData.name);
      expect(response.body.data.description).toBe(newTeamData.description);
      expect(response.body.data.icon).toBe(newTeamData.icon);
      expect(response.body.data.progress).toBe(newTeamData.progress);
      
      // Add the created team to testData for cleanup
      testData.teams.push(response.body.data);
    });
    
    it('should validate required fields', async () => {
      const invalidTeam = {
        description: 'Invalid team without required fields'
      };
      
      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTeam)
        .expect(400);
    });
    
    it('should require authentication', async () => {
      const teamData = {
        name: 'Unauthenticated Team',
        description: 'Team created without authentication'
      };
      
      await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(401);
    });
  });

  describe('PATCH /api/teams/:id', () => {
    it('should update an existing team', async () => {
      const updateData = {
        name: 'Updated Team Name',
        description: 'Updated team description',
        progress: 75
      };
      
      const response = await request(app)
        .patch(`/api/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testTeam.id);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.progress).toBe(updateData.progress);
    });
    
    it('should return 404 for non-existent team ID', async () => {
      await request(app)
        .patch('/api/teams/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Update Non-existent Team' })
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/teams/${testTeam.id}`)
        .send({ name: 'Unauthenticated Update' })
        .expect(401);
    });
  });

  describe('DELETE /api/teams/:id', () => {
    it('should delete an existing team', async () => {
      // First create a team to delete
      const teamToDelete: InsertTeam = {
        name: 'Team To Delete',
        description: 'This team will be deleted',
        icon: 'delete-icon',
        progress: 0
      };
      
      const createResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teamToDelete)
        .expect(201);
      
      const teamId = createResponse.body.data.id;
      
      // Now delete the team
      await request(app)
        .delete(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      
      // Verify the team is gone
      await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should return 404 for non-existent team ID', async () => {
      await request(app)
        .delete('/api/teams/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/teams/${testTeam.id}`)
        .expect(401);
    });
  });

  describe('GET /api/teams/:id/members', () => {
    it('should return team members', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get(`/api/teams/${testTeam.id}/members`)
        .expect(401);
    });
  });

  describe('POST /api/teams/:id/members', () => {
    it('should add a member to a team', async () => {
      const memberData = {
        userId: testData.users[1].id,
        role: 'member'
      };
      
      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(memberData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(memberData.userId);
      expect(response.body.data.teamId).toBe(testTeam.id);
      expect(response.body.data.role).toBe(memberData.role);
    });
    
    it('should validate required fields', async () => {
      await request(app)
        .post(`/api/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
    
    it('should return 404 for non-existent user ID', async () => {
      await request(app)
        .post(`/api/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: 9999, role: 'member' })
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .post(`/api/teams/${testTeam.id}/members`)
        .send({ userId: testData.users[0].id, role: 'member' })
        .expect(401);
    });
  });

  describe('DELETE /api/teams/:id/members/:userId', () => {
    it('should remove a member from a team', async () => {
      // First add a member to remove
      const memberData = {
        userId: testData.users[0].id,
        role: 'member'
      };
      
      await request(app)
        .post(`/api/teams/${testTeam.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(memberData);
      
      // Now remove the member
      await request(app)
        .delete(`/api/teams/${testTeam.id}/members/${memberData.userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
    
    it('should return 404 for non-existent member', async () => {
      await request(app)
        .delete(`/api/teams/${testTeam.id}/members/9999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/teams/${testTeam.id}/members/${testData.users[0].id}`)
        .expect(401);
    });
  });
});