import { z } from 'zod';
import {
  users, type User, type InsertUser,
  oauthTokens, insertOAuthTokenSchema,
  projects, type Project, type InsertProject,
  teams, type Team, type InsertTeam,
  teamMembers, type TeamMember, type InsertTeamMember,
  tasks, type Task, type InsertTask,
  documents, type Document, type InsertDocument,
  documentVersions, type DocumentVersion, type InsertDocumentVersion,
  activities, type Activity, type InsertActivity,
  integrations, type Integration, type InsertIntegration,
  insights, type Insight, type InsertInsight,
  relationships, type Relationship, type InsertRelationship,
  refreshTokens, type RefreshToken, type InsertRefreshToken
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql, lt } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

export interface IStorage {
  // Session management
  sessionStore: session.Store;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByExternalId(externalId: string, provider: string): Promise<User | undefined>;
  
  // Refresh Tokens
  storeRefreshToken(userId: number, tokenId: string, token: string, expiresAt: Date): Promise<RefreshToken>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // OAuth Tokens
  saveOAuthToken(token: z.infer<typeof insertOAuthTokenSchema>): Promise<any>;
  getOAuthToken(userId: number, provider: string): Promise<any | undefined>;
  deleteOAuthToken(userId: number, provider: string): Promise<boolean>;
  
  // Refresh Tokens
  saveRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(userId: number, tokenId: string): Promise<RefreshToken | undefined>;
  getRefreshTokenByToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(userId: number, tokenId: string): Promise<boolean>;
  deleteAllRefreshTokens(userId: number): Promise<number>;
  deleteExpiredRefreshTokens(): Promise<number>;

  // Projects
  getProject(id: number): Promise<Project | undefined>;
  getProjects(limit?: number, offset?: number): Promise<Project[]>;
  getProjectsCount(): Promise<number>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;

  // Teams
  getTeam(id: number): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  getTeamsByProject(projectId: number): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined>;

  // Team Members
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  createTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  deleteTeamMember(id: number): Promise<boolean>;

  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getTasks(projectId: number): Promise<Task[]>;
  getTasksByTeam(teamId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;

  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  getDocuments(projectId: number): Promise<Document[]>;
  getRecentDocuments(limit: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Document Versions
  getDocumentVersion(id: number): Promise<DocumentVersion | undefined>;
  getDocumentVersions(documentId: number): Promise<DocumentVersion[]>;
  getDocumentVersionByVersionId(documentId: number, versionId: string): Promise<DocumentVersion | undefined>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;

  // Activities
  getActivity(id: number): Promise<Activity | undefined>;
  getActivities(projectId: number, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Integrations
  getIntegration(id: number): Promise<Integration | undefined>;
  getIntegrations(userId: number): Promise<Integration[]>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, integration: Partial<InsertIntegration>): Promise<Integration | undefined>;
  deleteIntegration(id: number): Promise<boolean>;

  // Insights
  getInsight(id: number): Promise<Insight | undefined>;
  getInsights(projectId: number): Promise<Insight[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;

  // Relationships
  getRelationship(id: number): Promise<Relationship | undefined>;
  getRelationships(projectId: number): Promise<Relationship[]>;
  createRelationship(relationship: InsertRelationship): Promise<Relationship>;
}

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private teams: Map<number, Team>;
  private teamMembers: Map<number, TeamMember>;
  private tasks: Map<number, Task>;
  private documents: Map<number, Document>;
  private documentVersions: Map<number, DocumentVersion>;
  private activities: Map<number, Activity>;
  private integrations: Map<number, Integration>;
  private insights: Map<number, Insight>;
  private relationships: Map<number, Relationship>;
  private refreshTokens: Map<number, RefreshToken>;

  private currentIds: {
    users: number;
    projects: number;
    teams: number;
    teamMembers: number;
    tasks: number;
    documents: number;
    documentVersions: number;
    activities: number;
    integrations: number;
    insights: number;
    relationships: number;
    refreshTokens: number;
  };

  constructor() {
    // Create an in-memory session store
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    this.users = new Map();
    this.projects = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.tasks = new Map();
    this.documents = new Map();
    this.documentVersions = new Map();
    this.activities = new Map();
    this.integrations = new Map();
    this.insights = new Map();
    this.relationships = new Map();
    this.refreshTokens = new Map();

    this.currentIds = {
      users: 1,
      projects: 1,
      teams: 1,
      teamMembers: 1,
      tasks: 1,
      documents: 1,
      documentVersions: 1,
      activities: 1,
      integrations: 1,
      insights: 1,
      relationships: 1,
      refreshTokens: 1
    };

    // Initialize with demo data
    this.initDemoData();
  }

  private initDemoData() {
    // Create demo users
    const user1 = this.createUser({
      username: "alexmorgan",
      password: "password",
      fullName: "Alex Morgan",
      email: "alex.morgan@example.com",
      role: "admin",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    });

    const user2 = this.createUser({
      username: "sarahchen",
      password: "password",
      fullName: "Sarah Chen",
      email: "sarah.chen@example.com",
      role: "user",
      avatar: "https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    });

    const user3 = this.createUser({
      username: "markjohnson",
      password: "password",
      fullName: "Mark Johnson",
      email: "mark.johnson@example.com",
      role: "user",
      avatar: "https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    });

    const user4 = this.createUser({
      username: "lisawong",
      password: "password",
      fullName: "Lisa Wong",
      email: "lisa.wong@example.com",
      role: "user",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    });

    const user5 = this.createUser({
      username: "davidkim",
      password: "password",
      fullName: "David Kim",
      email: "david.kim@example.com",
      role: "user",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80"
    });

    // Create demo project
    const project = this.createProject({
      name: "Web Application Redesign",
      description: "Redesign of the company's web application with improved UX/UI and functionality",
      status: "active",
      progress: 67
    });

    // Create demo teams
    const frontendTeam = this.createTeam({
      name: "Frontend Team",
      description: "Responsible for UI development",
      icon: "ri-code-s-slash-line",
      progress: 85
    });

    const backendTeam = this.createTeam({
      name: "Backend Team",
      description: "Responsible for API and database",
      icon: "ri-database-2-line",
      progress: 43
    });

    const designTeam = this.createTeam({
      name: "Design Team",
      description: "Responsible for UX/UI design",
      icon: "ri-pen-nib-line",
      progress: 92
    });

    const qaTeam = this.createTeam({
      name: "QA Team",
      description: "Responsible for testing",
      icon: "ri-test-tube-line",
      progress: 65
    });

    // Add team members
    this.createTeamMember({ teamId: frontendTeam.id, userId: user2.id });
    this.createTeamMember({ teamId: frontendTeam.id, userId: user3.id });
    this.createTeamMember({ teamId: backendTeam.id, userId: user3.id });
    this.createTeamMember({ teamId: backendTeam.id, userId: user5.id });
    this.createTeamMember({ teamId: designTeam.id, userId: user2.id });
    this.createTeamMember({ teamId: designTeam.id, userId: user4.id });
    this.createTeamMember({ teamId: qaTeam.id, userId: user4.id });
    this.createTeamMember({ teamId: qaTeam.id, userId: user5.id });

    // Create demo tasks
    for (let i = 1; i <= 24; i++) {
      const teamId = i % 4 === 0 ? qaTeam.id :
                     i % 3 === 0 ? designTeam.id :
                     i % 2 === 0 ? backendTeam.id : frontendTeam.id;
      
      const assigneeId = i % 5 === 0 ? user5.id :
                         i % 4 === 0 ? user4.id :
                         i % 3 === 0 ? user3.id :
                         i % 2 === 0 ? user2.id : user1.id;
      
      this.createTask({
        title: `Task #${i}`,
        description: `Description for task #${i}`,
        status: i % 3 === 0 ? "completed" : (i % 4 === 0 ? "in_progress" : "pending"),
        assigneeId,
        projectId: project.id,
        teamId,
        dueDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000))
      });
    }

    // Create demo documents
    this.createDocument({
      title: "UI Component Documentation",
      content: "Detailed documentation of all UI components used in the application",
      fileType: "text",
      projectId: project.id,
      createdBy: user2.id,
      updatedBy: user2.id,
      updatedAt: new Date(Date.now() - (2 * 60 * 60 * 1000))
    });

    this.createDocument({
      title: "Project Timeline (Q3-Q4)",
      content: "Timeline for the project covering Q3 and Q4",
      fileType: "excel",
      projectId: project.id,
      createdBy: user1.id,
      updatedBy: user1.id,
      updatedAt: new Date(Date.now() - (24 * 60 * 60 * 1000))
    });

    this.createDocument({
      title: "API Documentation",
      content: "Documentation for all APIs used in the application",
      fileType: "pdf",
      projectId: project.id,
      createdBy: user3.id,
      updatedBy: user3.id,
      updatedAt: new Date(Date.now() - (3 * 24 * 60 * 60 * 1000))
    });

    // Create demo activities
    this.createActivity({
      type: "update",
      description: "Updated the UI Components document",
      userId: user2.id,
      projectId: project.id,
      entityType: "document",
      entityId: 1,
      timestamp: new Date(Date.now() - (2 * 60 * 60 * 1000))
    });

    this.createActivity({
      type: "comment",
      description: "Commented on API Integration Issue #42",
      userId: user3.id,
      projectId: project.id,
      entityType: "issue",
      entityId: 42,
      timestamp: new Date(Date.now() - (3 * 60 * 60 * 1000))
    });

    this.createActivity({
      type: "assign",
      description: "Assigned 3 tasks to Backend Team",
      userId: user1.id,
      projectId: project.id,
      entityType: "team",
      entityId: backendTeam.id,
      timestamp: new Date(Date.now() - (24 * 60 * 60 * 1000))
    });

    this.createActivity({
      type: "upload",
      description: "Team meeting minutes uploaded",
      userId: user4.id,
      projectId: project.id,
      entityType: "document",
      entityId: 2,
      timestamp: new Date(Date.now() - (26 * 60 * 60 * 1000))
    });

    this.createActivity({
      type: "create",
      description: "Created a new milestone Beta Release",
      userId: user5.id,
      projectId: project.id,
      entityType: "milestone",
      entityId: 1,
      timestamp: new Date(Date.now() - (29 * 60 * 60 * 1000))
    });

    // Create demo integrations
    this.createIntegration({
      name: "Trello",
      type: "trello",
      config: { apiKey: "demo_api_key", token: "demo_token" },
      active: true,
      userId: user1.id
    });

    this.createIntegration({
      name: "Jira",
      type: "jira",
      config: { url: "https://company.atlassian.net", token: "demo_token" },
      active: true,
      userId: user1.id
    });

    this.createIntegration({
      name: "Slack",
      type: "slack",
      config: { token: "demo_token", channels: ["general", "dev"] },
      active: true,
      userId: user1.id
    });

    this.createIntegration({
      name: "G Suite",
      type: "gsuite",
      config: { refreshToken: "demo_token" },
      active: true,
      userId: user1.id
    });

    // Create demo insights
    this.createInsight({
      type: "warning",
      content: "Backend integration timeline at risk (17% behind schedule)",
      projectId: project.id,
      confidence: 85
    });

    this.createInsight({
      type: "success",
      content: "UI component library completed ahead of schedule (+3 days)",
      projectId: project.id,
      confidence: 95
    });

    this.createInsight({
      type: "info",
      content: "API documentation needs updates (mentioned in 5 recent discussions)",
      projectId: project.id,
      confidence: 78
    });

    // Create demo relationships
    this.createRelationship({
      sourceType: "project",
      sourceId: project.id,
      targetType: "document",
      targetId: 1,
      strength: 8,
      description: "Project documentation"
    });

    this.createRelationship({
      sourceType: "project",
      sourceId: project.id,
      targetType: "task",
      targetId: 1,
      strength: 5,
      description: "Project task"
    });

    this.createRelationship({
      sourceType: "project",
      sourceId: project.id,
      targetType: "team",
      targetId: frontendTeam.id,
      strength: 9,
      description: "Project team"
    });

    this.createRelationship({
      sourceType: "document",
      sourceId: 1,
      targetType: "task",
      targetId: 2,
      strength: 6,
      description: "Document relates to task"
    });

    this.createRelationship({
      sourceType: "team",
      sourceId: frontendTeam.id,
      targetType: "team",
      targetId: designTeam.id,
      strength: 7,
      description: "Teams work closely together"
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getUserByExternalId(externalId: string, provider: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.externalId === externalId && user.authMethod === provider,
    );
  }

  // OAuth Tokens
  private oauthTokens: Map<string, any> = new Map();
  
  async saveOAuthToken(token: z.infer<typeof insertOAuthTokenSchema>): Promise<any> {
    const key = `${token.userId}:${token.provider}`;
    this.oauthTokens.set(key, token);
    return token;
  }
  
  async getOAuthToken(userId: number, provider: string): Promise<any | undefined> {
    const key = `${userId}:${provider}`;
    return this.oauthTokens.get(key);
  }
  
  async updateOAuthToken(tokenId: number, updates: Partial<any>): Promise<any> {
    // Find the token by ID
    let foundKey: string | undefined;
    let foundToken: any | undefined;
    
    for (const [key, token] of this.oauthTokens.entries()) {
      if (token.id === tokenId) {
        foundKey = key;
        foundToken = token;
        break;
      }
    }
    
    if (!foundKey || !foundToken) {
      throw new Error(`Token with ID ${tokenId} not found`);
    }
    
    // Update the token
    const updatedToken = {
      ...foundToken,
      ...updates,
      updatedAt: new Date()
    };
    
    this.oauthTokens.set(foundKey, updatedToken);
    return updatedToken;
  }
  
  async deleteOAuthToken(userId: number, provider: string): Promise<boolean> {
    const key = `${userId}:${provider}`;
    return this.oauthTokens.delete(key);
  }

  // Projects
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjects(limit?: number, offset?: number): Promise<Project[]> {
    const projects = Array.from(this.projects.values());
    
    if (limit !== undefined && offset !== undefined) {
      return projects.slice(offset, offset + limit);
    }
    
    return projects;
  }
  
  async getProjectsCount(): Promise<number> {
    return this.projects.size;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentIds.projects++;
    const project: Project = { ...insertProject, id };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) return undefined;
    
    const updatedProject = { ...existingProject, ...project };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  // Teams
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeamsByProject(projectId: number): Promise<Team[]> {
    // In a real implementation, we would have a teams_projects relationship table
    // For this demo, we'll just return all teams
    return this.getTeams();
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.currentIds.teams++;
    const team: Team = { ...insertTeam, id };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined> {
    const existingTeam = this.teams.get(id);
    if (!existingTeam) return undefined;
    
    const updatedTeam = { ...existingTeam, ...team };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  // Team Members
  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    return this.teamMembers.get(id);
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      member => member.teamId === teamId
    );
  }

  async createTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const id = this.currentIds.teamMembers++;
    const teamMember: TeamMember = { ...insertTeamMember, id };
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    return this.teamMembers.delete(id);
  }

  // Tasks
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasks(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.projectId === projectId
    );
  }

  async getTasksByTeam(teamId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.teamId === teamId
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentIds.tasks++;
    const task: Task = { ...insertTask, id };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask = { ...existingTask, ...task };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Documents
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocuments(projectId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      doc => doc.projectId === projectId
    );
  }

  async getRecentDocuments(limit: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentIds.documents++;
    const document: Document = { 
      ...insertDocument, 
      id,
      updatedAt: insertDocument.updatedAt || new Date()
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const existingDoc = this.documents.get(id);
    if (!existingDoc) return undefined;
    
    const updatedDoc = { 
      ...existingDoc, 
      ...document,
      updatedAt: new Date()
    };
    this.documents.set(id, updatedDoc);
    return updatedDoc;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Document Versions
  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    return this.documentVersions.get(id);
  }

  async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    return Array.from(this.documentVersions.values()).filter(
      version => version.documentId === documentId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getDocumentVersionByVersionId(documentId: number, versionId: string): Promise<DocumentVersion | undefined> {
    return Array.from(this.documentVersions.values()).find(
      version => version.documentId === documentId && version.versionId === versionId
    );
  }

  async createDocumentVersion(insertVersion: InsertDocumentVersion): Promise<DocumentVersion> {
    const id = this.currentIds.documentVersions++;
    const version: DocumentVersion = {
      ...insertVersion,
      id,
      createdAt: new Date()
    };
    this.documentVersions.set(id, version);
    return version;
  }

  // Activities
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async getActivities(projectId: number, limit?: number): Promise<Activity[]> {
    const activities = Array.from(this.activities.values())
      .filter(activity => activity.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return limit ? activities.slice(0, limit) : activities;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.currentIds.activities++;
    const activity: Activity = { 
      ...insertActivity, 
      id,
      timestamp: insertActivity.timestamp || new Date()
    };
    this.activities.set(id, activity);
    return activity;
  }

  // Integrations
  async getIntegration(id: number): Promise<Integration | undefined> {
    return this.integrations.get(id);
  }

  async getIntegrations(userId: number): Promise<Integration[]> {
    return Array.from(this.integrations.values()).filter(
      integration => integration.userId === userId
    );
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const id = this.currentIds.integrations++;
    const integration: Integration = { ...insertIntegration, id };
    this.integrations.set(id, integration);
    return integration;
  }

  async updateIntegration(id: number, integration: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const existingIntegration = this.integrations.get(id);
    if (!existingIntegration) return undefined;
    
    const updatedIntegration = { ...existingIntegration, ...integration };
    this.integrations.set(id, updatedIntegration);
    return updatedIntegration;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    return this.integrations.delete(id);
  }

  // Insights
  async getInsight(id: number): Promise<Insight | undefined> {
    return this.insights.get(id);
  }

  async getInsights(projectId: number): Promise<Insight[]> {
    return Array.from(this.insights.values()).filter(
      insight => insight.projectId === projectId
    );
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const id = this.currentIds.insights++;
    const insight: Insight = { 
      ...insertInsight, 
      id,
      timestamp: new Date()
    };
    this.insights.set(id, insight);
    return insight;
  }

  // Relationships
  async getRelationship(id: number): Promise<Relationship | undefined> {
    return this.relationships.get(id);
  }

  async getRelationships(projectId: number): Promise<Relationship[]> {
    // This is a simplified implementation. In a real app, we would query
    // relationships where source or target is related to the project
    return Array.from(this.relationships.values()).filter(
      rel => (rel.sourceType === 'project' && rel.sourceId === projectId) ||
             (rel.targetType === 'project' && rel.targetId === projectId)
    );
  }

  async createRelationship(insertRelationship: InsertRelationship): Promise<Relationship> {
    const id = this.currentIds.relationships++;
    const relationship: Relationship = { ...insertRelationship, id };
    this.relationships.set(id, relationship);
    return relationship;
  }

  // Refresh Tokens
  async saveRefreshToken(token: InsertRefreshToken): Promise<RefreshToken> {
    const id = this.currentIds.refreshTokens++;
    const refreshToken: RefreshToken = { ...token, id };
    this.refreshTokens.set(id, refreshToken);
    return refreshToken;
  }
  
  async storeRefreshToken(userId: number, tokenId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    return this.saveRefreshToken({
      userId,
      tokenId,
      token,
      expiresAt,
      createdAt: new Date(),
      revokedAt: null
    });
  }

  async getRefreshToken(userId: number, tokenId: string): Promise<RefreshToken | undefined> {
    return Array.from(this.refreshTokens.values()).find(
      token => token.userId === userId && token.tokenId === tokenId
    );
  }

  async getRefreshTokenByToken(token: string): Promise<RefreshToken | undefined> {
    return Array.from(this.refreshTokens.values()).find(
      refreshToken => refreshToken.token === token
    );
  }

  async deleteRefreshToken(userId: number, tokenId: string): Promise<boolean> {
    // Find the token by userId and tokenId
    const token = await this.getRefreshToken(userId, tokenId);
    if (!token) return false;
    
    // Delete the token from storage
    return this.refreshTokens.delete(token.id);
  }

  async deleteAllRefreshTokens(userId: number): Promise<number> {
    // Find all tokens for this user
    const tokens = Array.from(this.refreshTokens.values()).filter(
      token => token.userId === userId
    );
    
    // Delete each token
    let count = 0;
    for (const token of tokens) {
      if (this.refreshTokens.delete(token.id)) {
        count++;
      }
    }
    
    return count;
  }

  async deleteExpiredRefreshTokens(): Promise<number> {
    const now = new Date();
    // Find expired tokens
    const expiredTokens = Array.from(this.refreshTokens.values()).filter(
      token => token.expiresAt && new Date(token.expiresAt) < now
    );
    
    // Delete each expired token
    let count = 0;
    for (const token of expiredTokens) {
      if (this.refreshTokens.delete(token.id)) {
        count++;
      }
    }
    
    return count;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // Refresh Tokens
  async saveRefreshToken(token: InsertRefreshToken): Promise<RefreshToken> {
    const [refreshToken] = await db.insert(refreshTokens).values(token).returning();
    return refreshToken;
  }
  
  async storeRefreshToken(userId: number, tokenId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    return this.saveRefreshToken({
      userId,
      tokenId,
      token,
      expiresAt,
      createdAt: new Date(),
      revokedAt: null
    });
  }

  async getRefreshToken(userId: number, tokenId: string): Promise<RefreshToken | undefined> {
    const [token] = await db.select()
      .from(refreshTokens)
      .where(
        sql`${refreshTokens.userId} = ${userId} AND ${refreshTokens.tokenId} = ${tokenId}`
      );
    return token || undefined;
  }

  async getRefreshTokenByToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db.select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token));
    return refreshToken || undefined;
  }

  async deleteRefreshToken(userId: number, tokenId: string): Promise<boolean> {
    await db.delete(refreshTokens)
      .where(
        sql`${refreshTokens.userId} = ${userId} AND ${refreshTokens.tokenId} = ${tokenId}`
      );
    return true; // We don't actually get a boolean back from drizzle
  }

  async deleteAllRefreshTokens(userId: number): Promise<number> {
    const result = await db.delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
    
    // Count is not directly available from delete operation
    // This is an approximation
    return 1; // Return at least 1 if operation was successful
  }

  async deleteExpiredRefreshTokens(): Promise<number> {
    const now = new Date();
    const result = await db.delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, now));
    
    // Count is not directly available from delete operation
    // This is an approximation
    return 1; // Return at least 1 if operation was successful
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Drizzle ORM handles the mapping between JavaScript camelCase and SQL snake_case
    // but we'll log what we're inserting to verify
    console.log('Creating user with data:', JSON.stringify(insertUser, null, 2));
    
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async getUserByExternalId(externalId: string, provider: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(
        sql`${users.externalId} = ${externalId} AND ${users.authMethod} = ${provider}`
      );
    return user || undefined;
  }
  
  // OAuth Tokens
  async saveOAuthToken(token: z.infer<typeof insertOAuthTokenSchema>): Promise<any> {
    // Check if token exists
    const [existingToken] = await db.select()
      .from(oauthTokens)
      .where(
        sql`${oauthTokens.userId} = ${token.userId} AND ${oauthTokens.provider} = ${token.provider}`
      );
    
    if (existingToken) {
      // Update existing token
      const [updatedToken] = await db.update(oauthTokens)
        .set(token)
        .where(
          sql`${oauthTokens.userId} = ${token.userId} AND ${oauthTokens.provider} = ${token.provider}`
        )
        .returning();
      return updatedToken;
    } else {
      // Insert new token
      const [newToken] = await db.insert(oauthTokens)
        .values(token)
        .returning();
      return newToken;
    }
  }
  
  async getOAuthToken(userId: number, provider: string): Promise<any | undefined> {
    const [token] = await db.select()
      .from(oauthTokens)
      .where(
        sql`${oauthTokens.userId} = ${userId} AND ${oauthTokens.provider} = ${provider}`
      );
    return token || undefined;
  }
  
  async deleteOAuthToken(userId: number, provider: string): Promise<boolean> {
    await db.delete(oauthTokens)
      .where(
        sql`${oauthTokens.userId} = ${userId} AND ${oauthTokens.provider} = ${provider}`
      );
    return true; // We don't actually get a boolean back from drizzle
  }

  // Projects
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      progress: projects.progress,
    }).from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjects(limit?: number, offset?: number): Promise<Project[]> {
    // Select only columns that exist in the database
    let query = db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      progress: projects.progress,
    }).from(projects);
    
    if (limit !== undefined && offset !== undefined) {
      query = query.limit(limit).offset(offset);
    }
    
    return await query;
  }
  
  async getProjectsCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(projects);
    return Number(result[0].count);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db.update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject || undefined;
  }

  // Teams
  async getTeam(id: number): Promise<Team | undefined> {
    // Select only columns that exist in the actual database table
    const [team] = await db.select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      icon: teams.icon,
      progress: teams.progress
      // No timestamp fields in the actual database
    }).from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async getTeams(): Promise<Team[]> {
    // Select only columns that exist in the actual database table
    return await db.select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      icon: teams.icon,
      progress: teams.progress
      // No timestamp fields in the actual database
    }).from(teams);
  }

  async getTeamsByProject(projectId: number): Promise<Team[]> {
    // In a real implementation, we would have a teams_projects relationship table
    // For this demo, we'll just return all teams
    return this.getTeams();
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    // Make sure we're only inserting fields that actually exist in the database
    const { leaderId, ...validTeamData } = insertTeam as any; 
    const [team] = await db.insert(teams).values(validTeamData).returning({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      icon: teams.icon,
      progress: teams.progress
      // No timestamp fields in the actual database
    });
    return team;
  }

  async updateTeam(id: number, updateTeam: Partial<InsertTeam>): Promise<Team | undefined> {
    // Make sure we're only updating fields that actually exist in the database
    const { leaderId, ...validTeamData } = updateTeam as any;
    const [updatedTeam] = await db.update(teams)
      .set(validTeamData)
      .where(eq(teams.id, id))
      .returning({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        icon: teams.icon,
        progress: teams.progress
        // No timestamp fields in the actual database
      });
    return updatedTeam || undefined;
  }

  // Team Members
  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [teamMember] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return teamMember || undefined;
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async createTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const [teamMember] = await db.insert(teamMembers).values(insertTeamMember).returning();
    return teamMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return true; // We don't actually get a boolean back from drizzle
  }

  // Tasks
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasks(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async getTasksByTeam(teamId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.teamId, teamId));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db.update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  // Documents
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        fileType: documents.fileType,
        projectId: documents.projectId,
        createdBy: documents.createdBy,
        updatedBy: documents.updatedBy,
        // sourceUrl column doesn't exist in the actual database
        // embeddings column doesn't exist in the actual database
        // tags column doesn't exist in the actual database
        // createdAt column doesn't exist in the actual database
        // updatedAt column doesn't exist in the actual database
    })
    .from(documents)
    .where(eq(documents.id, id));
    return document || undefined;
  }

  async getDocuments(projectId: number): Promise<Document[]> {
    return await db.select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        fileType: documents.fileType,
        projectId: documents.projectId,
        createdBy: documents.createdBy,
        updatedBy: documents.updatedBy,
        // sourceUrl column doesn't exist in the actual database
        // embeddings column doesn't exist in the actual database
        // tags column doesn't exist in the actual database
        // createdAt column doesn't exist in the actual database
        // updatedAt column doesn't exist in the actual database
    })
    .from(documents)
    .where(eq(documents.projectId, projectId));
  }

  async getRecentDocuments(limit: number): Promise<Document[]> {
    return await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        fileType: documents.fileType,
        projectId: documents.projectId,
        createdBy: documents.createdBy,
        updatedBy: documents.updatedBy,
        // sourceUrl column doesn't exist in the actual database
        // embeddings column doesn't exist in the actual database
        // tags column doesn't exist in the actual database
        // createdAt column doesn't exist in the actual database
        // updatedAt column doesn't exist in the actual database
        // Explicitly exclude parentDocumentId which doesn't exist in the database
      })
      .from(documents)
      // We can't order by updatedAt as it doesn't exist
      // Using id for now as a simple fallback
      .orderBy(desc(documents.id))
      .limit(limit);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    // Remove any timestamp fields that don't exist in the database
    const documentToUpdate = { ...document };
    // @ts-ignore - these properties don't exist in InsertDocument but TypeScript doesn't know that
    delete documentToUpdate.createdAt;
    // @ts-ignore
    delete documentToUpdate.updatedAt;
    
    const [updatedDocument] = await db.update(documents)
      .set(documentToUpdate)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    await db.delete(documents).where(eq(documents.id, id));
    return true; // We don't actually get a boolean back from drizzle
  }

  // Document Versions
  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    const [version] = await db.select().from(documentVersions).where(eq(documentVersions.id, id));
    return version || undefined;
  }

  async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    return await db.select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.createdAt));
  }

  async getDocumentVersionByVersionId(documentId: number, versionId: string): Promise<DocumentVersion | undefined> {
    const [version] = await db.select()
      .from(documentVersions)
      .where(
        sql`${documentVersions.documentId} = ${documentId} AND ${documentVersions.versionId} = ${versionId}`
      );
    return version || undefined;
  }

  async createDocumentVersion(insertVersion: InsertDocumentVersion): Promise<DocumentVersion> {
    const [version] = await db.insert(documentVersions)
      .values(insertVersion)
      .returning();
    return version;
  }

  // Activities
  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async getActivities(projectId: number, limit?: number): Promise<Activity[]> {
    const query = db
      .select()
      .from(activities)
      .where(eq(activities.projectId, projectId))
      .orderBy(desc(activities.timestamp)); // Use timestamp instead of createdAt
    
    if (limit) {
      return await query.limit(limit);
    }
    
    return await query;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  // Integrations
  async getIntegration(id: number): Promise<Integration | undefined> {
    // Modified query to match actual database structure (no lastSyncAt field)
    const [integration] = await db.select({
      id: integrations.id,
      name: integrations.name,
      type: integrations.type,
      config: integrations.config,
      active: integrations.active,
      userId: integrations.userId
    }).from(integrations).where(eq(integrations.id, id));
    return integration || undefined;
  }

  async getIntegrations(userId: number): Promise<Integration[]> {
    // Modified query to match actual database structure (no lastSyncAt field)
    return await db.select({
      id: integrations.id,
      name: integrations.name,
      type: integrations.type,
      config: integrations.config,
      active: integrations.active,
      userId: integrations.userId
    }).from(integrations).where(eq(integrations.userId, userId));
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    // Filter out any fields that don't exist in the actual database
    const validFields = {
      name: insertIntegration.name,
      type: insertIntegration.type,
      config: insertIntegration.config,
      active: insertIntegration.active !== undefined ? insertIntegration.active : true,
      userId: insertIntegration.userId
    };
    
    const [integration] = await db.insert(integrations).values(validFields).returning({
      id: integrations.id,
      name: integrations.name,
      type: integrations.type,
      config: integrations.config,
      active: integrations.active,
      userId: integrations.userId
    });
    return integration;
  }

  async updateIntegration(id: number, integration: Partial<InsertIntegration>): Promise<Integration | undefined> {
    // Filter out any fields that don't exist in the actual database
    const validFields: Partial<InsertIntegration> = {};
    if (integration.name !== undefined) validFields.name = integration.name;
    if (integration.type !== undefined) validFields.type = integration.type;
    if (integration.config !== undefined) validFields.config = integration.config;
    if (integration.active !== undefined) validFields.active = integration.active;
    if (integration.userId !== undefined) validFields.userId = integration.userId;
    
    const [updatedIntegration] = await db.update(integrations)
      .set(validFields)
      .where(eq(integrations.id, id))
      .returning({
        id: integrations.id,
        name: integrations.name,
        type: integrations.type,
        config: integrations.config,
        active: integrations.active,
        userId: integrations.userId
      });
    return updatedIntegration || undefined;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    const result = await db.delete(integrations).where(eq(integrations.id, id));
    return true;
  }

  // Insights
  async getInsight(id: number): Promise<Insight | undefined> {
    const [insight] = await db.select().from(insights).where(eq(insights.id, id));
    return insight || undefined;
  }

  async getInsights(projectId: number): Promise<Insight[]> {
    return await db.select({
      id: insights.id,
      type: insights.type,
      content: insights.content,
      projectId: insights.projectId,
      confidence: insights.confidence,
      timestamp: insights.timestamp,
      // entityType and entityId don't exist in the actual database
    }).from(insights).where(eq(insights.projectId, projectId));
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    // Validate that insertInsight only contains fields that exist in the actual database
    const validInsight = {
      type: insertInsight.type,
      content: insertInsight.content,
      projectId: insertInsight.projectId,
      confidence: insertInsight.confidence || 100,
      // Don't include timestamp as it's handled by the default value
    };
    
    const [insight] = await db.insert(insights).values(validInsight).returning();
    return insight;
  }

  // Relationships
  async getRelationship(id: number): Promise<Relationship | undefined> {
    // Select only the columns that exist in the actual database table
    const [relationship] = await db.select({
      id: relationships.id,
      sourceType: relationships.sourceType,
      sourceId: relationships.sourceId,
      targetType: relationships.targetType,
      targetId: relationships.targetId,
      strength: relationships.strength,
      description: relationships.description
    })
    .from(relationships)
    .where(eq(relationships.id, id));
    return relationship || undefined;
  }

  async getRelationships(projectId: number): Promise<Relationship[]> {
    // Select only the columns that exist in the actual database table
    return await db
      .select({
        id: relationships.id,
        sourceType: relationships.sourceType,
        sourceId: relationships.sourceId,
        targetType: relationships.targetType,
        targetId: relationships.targetId,
        strength: relationships.strength,
        description: relationships.description
      })
      .from(relationships)
      .where(eq(relationships.sourceId, projectId));
  }

  async createRelationship(insertRelationship: InsertRelationship): Promise<Relationship> {
    const [relationship] = await db.insert(relationships).values(insertRelationship).returning();
    return relationship;
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
