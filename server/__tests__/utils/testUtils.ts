/**
 * Test Utilities
 * 
 * This module provides utility functions for API testing.
 */

import express, { Express } from 'express';
import { Server } from 'http';
import request from 'supertest';
import { registerRoutes } from '../../routes';
import { storage } from '../../storage';
import { 
  User, InsertUser, 
  Project, InsertProject,
  Task, InsertTask,
  Team, InsertTeam,
  Document, InsertDocument,
} from '../../../shared/schema';
import { hashPassword } from '../../auth';

interface TestApp {
  app: Express;
  server: Server;
}

interface TestData {
  users: User[];
  projects: Project[];
  tasks: Task[];
  teams: Team[];
  documents: Document[];
  authTokens: Record<string, string>;
}

/**
 * Create a test application with all routes registered
 */
export async function createTestApp(): Promise<TestApp> {
  const app = express();
  app.use(express.json());
  
  // Register API routes
  const server = await registerRoutes(app);
  
  return { app, server };
}

/**
 * Create test data for API tests
 */
export async function createTestData(): Promise<TestData> {
  const users: User[] = [];
  const projects: Project[] = [];
  const tasks: Task[] = [];
  const teams: Team[] = [];
  const documents: Document[] = [];
  const authTokens: Record<string, string> = {};
  
  // Create test users with different roles
  const adminUser = await createTestUser({
    username: 'admin_test',
    password: await hashPassword('password123'),
    email: 'admin@test.com',
    fullName: 'Admin User',
    role: 'admin'
  });
  
  const regularUser = await createTestUser({
    username: 'user_test',
    password: await hashPassword('password123'),
    email: 'user@test.com',
    fullName: 'Regular User',
    role: 'user'
  });
  
  users.push(adminUser, regularUser);
  
  // Create test project
  const testProject = await createTestProject({
    name: 'Test API Project',
    description: 'A project for API testing',
    status: 'active',
    progress: 50,
    ownerId: adminUser.id
  });
  
  projects.push(testProject);
  
  // Create test team
  const testTeam = await createTestTeam({
    name: 'Test API Team',
    description: 'A team for API testing',
    icon: 'test-icon',
    progress: 25
  });
  
  teams.push(testTeam);
  
  // Create test tasks
  const testTask1 = await createTestTask({
    title: 'Test Task 1',
    description: 'A task for API testing',
    status: 'pending',
    projectId: testProject.id,
    assigneeId: regularUser.id,
    teamId: testTeam.id,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  });
  
  const testTask2 = await createTestTask({
    title: 'Test Task 2',
    description: 'Another task for API testing',
    status: 'in_progress',
    projectId: testProject.id,
    assigneeId: adminUser.id,
    teamId: testTeam.id,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
  });
  
  tasks.push(testTask1, testTask2);
  
  // Create test document
  const testDocument = await createTestDocument({
    title: 'Test Document',
    content: 'This is a test document for API testing',
    description: 'A document for API testing',
    fileType: 'text',
    projectId: testProject.id,
    createdBy: adminUser.id,
    updatedBy: adminUser.id
  });
  
  documents.push(testDocument);
  
  return {
    users,
    projects,
    tasks,
    teams,
    documents,
    authTokens
  };
}

/**
 * Create a test user
 */
export async function createTestUser(userData: InsertUser): Promise<User> {
  // Check if user already exists
  const existingUser = await storage.getUserByUsername(userData.username);
  if (existingUser) {
    return existingUser;
  }
  
  return await storage.createUser(userData);
}

/**
 * Create a test project
 */
export async function createTestProject(projectData: InsertProject): Promise<Project> {
  return await storage.createProject(projectData);
}

/**
 * Create a test task
 */
export async function createTestTask(taskData: InsertTask): Promise<Task> {
  return await storage.createTask(taskData);
}

/**
 * Create a test team
 */
export async function createTestTeam(teamData: InsertTeam): Promise<Team> {
  return await storage.createTeam(teamData);
}

/**
 * Create a test document
 */
export async function createTestDocument(documentData: InsertDocument): Promise<Document> {
  return await storage.createDocument(documentData);
}

/**
 * Get authentication token for a user (login)
 */
export async function getAuthToken(app: Express, username: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/api/login')
    .send({ username, password });
  
  if (response.status !== 200) {
    throw new Error(`Failed to login as ${username}: ${response.status}`);
  }
  
  const token = response.body.token || '';
  return token;
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(testData: TestData): Promise<void> {
  // Delete in reverse order of dependencies
  for (const task of testData.tasks) {
    try {
      await storage.deleteTask(task.id);
    } catch (err) {
      console.error(`Failed to delete test task ${task.id}:`, err);
    }
  }
  
  for (const document of testData.documents) {
    try {
      await storage.deleteDocument(document.id);
    } catch (err) {
      console.error(`Failed to delete test document ${document.id}:`, err);
    }
  }
  
  for (const team of testData.teams) {
    try {
      await storage.deleteTeam(team.id);
    } catch (err) {
      console.error(`Failed to delete test team ${team.id}:`, err);
    }
  }
  
  for (const project of testData.projects) {
    try {
      await storage.deleteProject(project.id);
    } catch (err) {
      console.error(`Failed to delete test project ${project.id}:`, err);
    }
  }
  
  for (const user of testData.users) {
    try {
      await storage.deleteUser(user.id);
    } catch (err) {
      console.error(`Failed to delete test user ${user.id}:`, err);
    }
  }
}