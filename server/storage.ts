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
  refreshTokens, type RefreshToken, type InsertRefreshToken,
  pkceCodeVerifiers, type PkceCodeVerifier, type InsertPkceCodeVerifier,
  oauthProviderSettings, type OAuthProviderSetting, type InsertOAuthProviderSetting,
  graphNodes, type GraphNode, type InsertGraphNode,
  graphEdges, type GraphEdge, type InsertGraphEdge
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
  storeRefreshToken(userId: number, tokenId: string, token: string, expiresAt: Date): Promise<RefreshToken>;
  getRefreshToken(userId: number, tokenId: string): Promise<RefreshToken | undefined>;
  getRefreshTokenByToken(token: string): Promise<RefreshToken | undefined>;
  getRefreshTokenByTokenId(tokenId: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(userId: number, tokenId: string): Promise<boolean>;
  revokeRefreshToken(tokenId: string): Promise<boolean>;
  deleteAllRefreshTokens(userId: number): Promise<number>;
  deleteExpiredRefreshTokens(): Promise<number>;
  
  // PKCE Code Verifiers
  createPkceCodeVerifier(verifier: InsertPkceCodeVerifier): Promise<PkceCodeVerifier>;
  getPkceCodeVerifierByState(state: string): Promise<PkceCodeVerifier | undefined>;
  updatePkceCodeVerifier(id: number, data: Partial<InsertPkceCodeVerifier>): Promise<PkceCodeVerifier | undefined>;
  deleteExpiredPkceCodeVerifiers(): Promise<number>;
  
  // OAuth Provider Settings
  getOAuthProviderSettings(): Promise<OAuthProviderSetting[]>;
  getOAuthProviderSetting(providerId: string): Promise<OAuthProviderSetting | undefined>;
  saveOAuthProviderSettings(providerSetting: InsertOAuthProviderSetting): Promise<OAuthProviderSetting>;

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
  
  // OAuth Provider Settings
  getOAuthProviderSettings(): Promise<OAuthProviderSetting[]>;
  getOAuthProviderSetting(providerId: string): Promise<OAuthProviderSetting | undefined>;
  saveOAuthProviderSettings(provider: InsertOAuthProviderSetting): Promise<OAuthProviderSetting>;
  
  // Context Graph Operations
  // Graph Nodes
  getGraphNode(id: number): Promise<GraphNode | undefined>;
  getGraphNodeByExternalId(externalId: string): Promise<GraphNode | undefined>;
  getGraphNodes(type?: string, limit?: number, offset?: number): Promise<GraphNode[]>;
  createGraphNode(node: InsertGraphNode): Promise<GraphNode>;
  updateGraphNode(id: number, node: Partial<InsertGraphNode>): Promise<GraphNode | undefined>;
  deleteGraphNode(id: number): Promise<boolean>;
  
  // Graph Edges
  getGraphEdge(id: number): Promise<GraphEdge | undefined>;
  getGraphEdges(sourceId?: number, targetId?: number, type?: string): Promise<GraphEdge[]>;
  getGraphEdgesBetween(sourceId: number, targetId: number): Promise<GraphEdge[]>;
  getGraphEdgesByNode(nodeId: number, direction?: 'incoming' | 'outgoing' | 'both'): Promise<GraphEdge[]>;
  createGraphEdge(edge: InsertGraphEdge): Promise<GraphEdge>;
  updateGraphEdge(id: number, edge: Partial<InsertGraphEdge>): Promise<GraphEdge | undefined>;
  deleteGraphEdge(id: number): Promise<boolean>;
  
  // Graph Analysis
  getNodeConnections(nodeId: number, depth?: number, types?: string[]): Promise<{nodes: GraphNode[], edges: GraphEdge[]}>;
  findRelatedNodes(nodeId: number, minWeight?: number, maxConnections?: number): Promise<GraphNode[]>;
  getGraphForVisualization(centralNodeId?: number, depth?: number, limit?: number): Promise<{nodes: any[], links: any[]}>;
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
  private pkceCodeVerifiers: Map<number, PkceCodeVerifier>;
  private oauthProviderSettings: Map<number, OAuthProviderSetting>;
  private graphNodes: Map<number, GraphNode>;
  private graphEdges: Map<number, GraphEdge>;

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
    pkceCodeVerifiers: number;
    oauthProviderSettings: number;
    graphNodes: number;
    graphEdges: number;
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
    this.pkceCodeVerifiers = new Map();
    this.oauthProviderSettings = new Map();
    this.graphNodes = new Map();
    this.graphEdges = new Map();

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
      refreshTokens: 1,
      pkceCodeVerifiers: 1,
      oauthProviderSettings: 1,
      graphNodes: 1,
      graphEdges: 1
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
  
  async getRefreshTokenByTokenId(tokenId: string): Promise<RefreshToken | undefined> {
    return Array.from(this.refreshTokens.values()).find(
      refreshToken => refreshToken.tokenId === tokenId
    );
  }

  async deleteRefreshToken(userId: number, tokenId: string): Promise<boolean> {
    // Find the token by userId and tokenId
    const token = await this.getRefreshToken(userId, tokenId);
    if (!token) return false;
    
    // Delete the token from storage
    return this.refreshTokens.delete(token.id);
  }
  
  async revokeRefreshToken(tokenId: string): Promise<boolean> {
    // Find the token by tokenId
    const token = await this.getRefreshTokenByTokenId(tokenId);
    if (!token) return false;
    
    // Mark token as revoked instead of deleting it
    token.revokedAt = new Date();
    this.refreshTokens.set(token.id, token);
    return true;
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

  // PKCE Code Verifiers
  async createPkceCodeVerifier(verifier: InsertPkceCodeVerifier): Promise<PkceCodeVerifier> {
    const id = this.currentIds.pkceCodeVerifiers++;
    const newVerifier: PkceCodeVerifier = {
      id,
      userId: verifier.userId,
      codeChallenge: verifier.codeChallenge,
      codeVerifier: verifier.codeVerifier,
      state: verifier.state,
      provider: verifier.provider,
      redirectUri: verifier.redirectUri,
      scope: verifier.scope,
      createdAt: new Date(),
      expiresAt: verifier.expiresAt,
      used: verifier.used || false
    };
    
    this.pkceCodeVerifiers.set(id, newVerifier);
    return newVerifier;
  }
  
  async getPkceCodeVerifierByState(state: string): Promise<PkceCodeVerifier | undefined> {
    for (const verifier of this.pkceCodeVerifiers.values()) {
      if (verifier.state === state) {
        return verifier;
      }
    }
    return undefined;
  }
  
  async updatePkceCodeVerifier(id: number, data: Partial<InsertPkceCodeVerifier>): Promise<PkceCodeVerifier | undefined> {
    const verifier = this.pkceCodeVerifiers.get(id);
    if (!verifier) {
      return undefined;
    }
    
    const updatedVerifier = {
      ...verifier,
      ...data
    };
    
    this.pkceCodeVerifiers.set(id, updatedVerifier);
    return updatedVerifier;
  }
  
  async deleteExpiredPkceCodeVerifiers(): Promise<number> {
    const now = new Date();
    let count = 0;
    
    for (const [id, verifier] of this.pkceCodeVerifiers.entries()) {
      if (verifier.expiresAt < now) {
        this.pkceCodeVerifiers.delete(id);
        count++;
      }
    }
    
    return count;
  }
  
  // OAuth Provider Settings
  async getOAuthProviderSettings(): Promise<OAuthProviderSetting[]> {
    return Array.from(this.oauthProviderSettings.values());
  }
  
  async getOAuthProviderSetting(providerId: string): Promise<OAuthProviderSetting | undefined> {
    return Array.from(this.oauthProviderSettings.values()).find(
      (setting) => setting.providerId === providerId
    );
  }
  
  async saveOAuthProviderSettings(providerSetting: InsertOAuthProviderSetting): Promise<OAuthProviderSetting> {
    const id = this.currentIds.oauthProviderSettings++;
    const setting: OAuthProviderSetting = { 
      ...providerSetting, 
      id,
      createdAt: new Date(),
      updatedAt: new Date() 
    };
    this.oauthProviderSettings.set(id, setting);
    return setting;
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
  
  async getRefreshTokenByTokenId(tokenId: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db.select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenId, tokenId));
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
  
  async revokeRefreshToken(tokenId: string): Promise<boolean> {
    // Mark token as revoked instead of deleting it
    const [updatedToken] = await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenId, tokenId))
      .returning();
    
    return !!updatedToken;
  }

  // PKCE Code Verifiers
  async createPkceCodeVerifier(verifier: InsertPkceCodeVerifier): Promise<PkceCodeVerifier> {
    const [newVerifier] = await db.insert(pkceCodeVerifiers).values({
      ...verifier,
      createdAt: new Date(),
      used: verifier.used || false
    }).returning();
    return newVerifier;
  }
  
  async getPkceCodeVerifierByState(state: string): Promise<PkceCodeVerifier | undefined> {
    const [verifier] = await db.select()
      .from(pkceCodeVerifiers)
      .where(eq(pkceCodeVerifiers.state, state));
    return verifier || undefined;
  }
  
  async updatePkceCodeVerifier(id: number, data: Partial<InsertPkceCodeVerifier>): Promise<PkceCodeVerifier | undefined> {
    const [updatedVerifier] = await db.update(pkceCodeVerifiers)
      .set(data)
      .where(eq(pkceCodeVerifiers.id, id))
      .returning();
    return updatedVerifier || undefined;
  }
  
  async deleteExpiredPkceCodeVerifiers(): Promise<number> {
    const now = new Date();
    const result = await db.delete(pkceCodeVerifiers)
      .where(lt(pkceCodeVerifiers.expiresAt, now));
    
    // Count is not directly available from delete operation
    // This is an approximation
    return 1; // Return at least 1 if operation was successful
  }
  
  // OAuth Provider Settings
  async getOAuthProviderSettings(): Promise<OAuthProviderSetting[]> {
    return await db.select().from(oauthProviderSettings);
  }
  
  async getOAuthProviderSetting(providerId: string): Promise<OAuthProviderSetting | undefined> {
    const [setting] = await db.select()
      .from(oauthProviderSettings)
      .where(eq(oauthProviderSettings.providerId, providerId));
    return setting || undefined;
  }
  
  async saveOAuthProviderSettings(providerSetting: InsertOAuthProviderSetting): Promise<OAuthProviderSetting> {
    // Check if setting already exists
    const [existingSetting] = await db.select()
      .from(oauthProviderSettings)
      .where(eq(oauthProviderSettings.providerId, providerSetting.providerId));
    
    if (existingSetting) {
      // Update existing setting
      const [updatedSetting] = await db.update(oauthProviderSettings)
        .set({
          name: providerSetting.name,
          enabled: providerSetting.enabled,
          clientId: providerSetting.clientId,
          clientSecret: providerSetting.clientSecret,
          scope: providerSetting.scope,
          updatedAt: new Date(),
          updatedBy: providerSetting.updatedBy
        })
        .where(eq(oauthProviderSettings.providerId, providerSetting.providerId))
        .returning();
      return updatedSetting;
    } else {
      // Insert new setting
      const [newSetting] = await db.insert(oauthProviderSettings)
        .values({
          providerId: providerSetting.providerId,
          name: providerSetting.name,
          enabled: providerSetting.enabled,
          clientId: providerSetting.clientId,
          clientSecret: providerSetting.clientSecret,
          scope: providerSetting.scope,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: providerSetting.updatedBy
        })
        .returning();
      return newSetting;
    }
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
  
  async getLatestOAuthToken(userId: number, provider: string): Promise<any | undefined> {
    // In this implementation, there's only one token per user/provider combination
    // So this is the same as getOAuthToken
    return this.getOAuthToken(userId, provider);
  }
  
  async revokeOAuthToken(userId: number, provider: string): Promise<boolean> {
    // This implementation simply deletes the token
    return this.deleteOAuthToken(userId, provider);
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

  // Graph Nodes
  async getGraphNode(id: number): Promise<GraphNode | undefined> {
    const [node] = await db.select().from(graphNodes).where(eq(graphNodes.id, id));
    return node;
  }

  async getGraphNodeByExternalId(externalId: string): Promise<GraphNode | undefined> {
    const [node] = await db.select().from(graphNodes).where(eq(graphNodes.externalId, externalId));
    return node;
  }

  async getGraphNodes(type?: string, limit?: number, offset?: number): Promise<GraphNode[]> {
    let query = db.select().from(graphNodes);
    
    if (type) {
      query = query.where(eq(graphNodes.type, type));
    }
    
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    
    if (offset !== undefined) {
      query = query.offset(offset);
    }
    
    return await query;
  }

  async createGraphNode(node: InsertGraphNode): Promise<GraphNode> {
    const [graphNode] = await db.insert(graphNodes).values(node).returning();
    return graphNode;
  }

  async updateGraphNode(id: number, updates: Partial<InsertGraphNode>): Promise<GraphNode | undefined> {
    const [updatedNode] = await db.update(graphNodes)
      .set(updates)
      .where(eq(graphNodes.id, id))
      .returning();
    
    return updatedNode;
  }

  async deleteGraphNode(id: number): Promise<boolean> {
    // Delete all associated edges first
    await db.delete(graphEdges)
      .where(
        or(
          eq(graphEdges.sourceId, id),
          eq(graphEdges.targetId, id)
        )
      );
    
    const result = await db.delete(graphNodes)
      .where(eq(graphNodes.id, id));
    
    return result.count > 0;
  }

  // Graph Edges
  async getGraphEdge(id: number): Promise<GraphEdge | undefined> {
    const [edge] = await db.select().from(graphEdges).where(eq(graphEdges.id, id));
    return edge;
  }

  async getGraphEdges(sourceId?: number, targetId?: number, type?: string): Promise<GraphEdge[]> {
    let query = db.select().from(graphEdges);
    
    if (sourceId !== undefined) {
      query = query.where(eq(graphEdges.sourceId, sourceId));
    }
    
    if (targetId !== undefined) {
      query = query.where(eq(graphEdges.targetId, targetId));
    }
    
    if (type !== undefined) {
      query = query.where(eq(graphEdges.type, type));
    }
    
    return await query;
  }

  async getGraphEdgesBetween(sourceId: number, targetId: number): Promise<GraphEdge[]> {
    return await db.select()
      .from(graphEdges)
      .where(
        or(
          and(
            eq(graphEdges.sourceId, sourceId),
            eq(graphEdges.targetId, targetId)
          ),
          and(
            eq(graphEdges.sourceId, targetId),
            eq(graphEdges.targetId, sourceId)
          )
        )
      );
  }

  async getGraphEdgesByNode(nodeId: number, direction: 'incoming' | 'outgoing' | 'both' = 'both'): Promise<GraphEdge[]> {
    if (direction === 'incoming') {
      return await db.select()
        .from(graphEdges)
        .where(eq(graphEdges.targetId, nodeId));
    } else if (direction === 'outgoing') {
      return await db.select()
        .from(graphEdges)
        .where(eq(graphEdges.sourceId, nodeId));
    } else {
      return await db.select()
        .from(graphEdges)
        .where(
          or(
            eq(graphEdges.sourceId, nodeId),
            eq(graphEdges.targetId, nodeId)
          )
        );
    }
  }

  async createGraphEdge(edge: InsertGraphEdge): Promise<GraphEdge> {
    const [graphEdge] = await db.insert(graphEdges).values(edge).returning();
    return graphEdge;
  }

  async updateGraphEdge(id: number, updates: Partial<InsertGraphEdge>): Promise<GraphEdge | undefined> {
    const [updatedEdge] = await db.update(graphEdges)
      .set(updates)
      .where(eq(graphEdges.id, id))
      .returning();
    
    return updatedEdge;
  }

  async deleteGraphEdge(id: number): Promise<boolean> {
    const result = await db.delete(graphEdges)
      .where(eq(graphEdges.id, id));
    
    return result.count > 0;
  }

  // Graph Analysis
  async getNodeConnections(nodeId: number, depth: number = 1, types?: string[]): Promise<{nodes: GraphNode[], edges: GraphEdge[]}> {
    // This is a complex query that's better implemented in application code
    // rather than as a single SQL query, especially with variable depth
    
    const result: { nodes: GraphNode[], edges: GraphEdge[] } = {
      nodes: [],
      edges: []
    };
    
    const processedNodeIds = new Set<number>();
    const queue: { id: number, currentDepth: number }[] = [{ id: nodeId, currentDepth: 0 }];
    
    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;
      
      if (processedNodeIds.has(id)) continue;
      processedNodeIds.add(id);
      
      const node = await this.getGraphNode(id);
      if (!node) continue;
      
      result.nodes.push(node);
      
      if (currentDepth >= depth) continue;
      
      const edges = await this.getGraphEdgesByNode(id);
      
      for (const edge of edges) {
        if (types && !types.includes(edge.type)) continue;
        
        result.edges.push(edge);
        
        const nextNodeId = edge.sourceId === id ? edge.targetId : edge.sourceId;
        if (!processedNodeIds.has(nextNodeId)) {
          queue.push({ id: nextNodeId, currentDepth: currentDepth + 1 });
        }
      }
    }
    
    return result;
  }

  async findRelatedNodes(nodeId: number, minWeight: number = 0.5, maxConnections: number = 10): Promise<GraphNode[]> {
    const edges = await this.getGraphEdgesByNode(nodeId);
    
    // Filter and sort edges by weight
    const sortedEdges = edges
      .filter(edge => edge.weight >= minWeight)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxConnections);
    
    // Get related nodes
    const relatedNodes: GraphNode[] = [];
    
    for (const edge of sortedEdges) {
      const relatedNodeId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
      const relatedNode = await this.getGraphNode(relatedNodeId);
      
      if (relatedNode) {
        relatedNodes.push(relatedNode);
      }
    }
    
    return relatedNodes;
  }

  async getGraphForVisualization(centralNodeId?: number, depth: number = 2, limit: number = 100): Promise<{nodes: any[], links: any[]}> {
    let nodes: any[] = [];
    let links: any[] = [];
    
    if (centralNodeId) {
      // Get connections around a central node
      const { nodes: connectedNodes, edges } = await this.getNodeConnections(centralNodeId, depth);
      
      // Format nodes for visualization
      nodes = connectedNodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type,
        group: node.type, // For coloring by type
        properties: node.properties || {}
      }));
      
      // Format edges for visualization
      links = edges.map(edge => ({
        source: edge.sourceId,
        target: edge.targetId,
        label: edge.type,
        value: edge.weight, // For edge thickness
        properties: edge.properties || {}
      }));
    } else {
      // Get all nodes and edges (with limit)
      const allNodes = await this.getGraphNodes(undefined, limit);
      
      // Format nodes for visualization
      nodes = allNodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type,
        group: node.type,
        properties: node.properties || {}
      }));
      
      // Get edges between these nodes
      const nodeIds = allNodes.map(node => node.id);
      
      // This query would be more efficient in SQL, but for simplicity:
      const allEdges = await db.select()
        .from(graphEdges)
        .where(
          and(
            inArray(graphEdges.sourceId, nodeIds),
            inArray(graphEdges.targetId, nodeIds)
          )
        );
      
      // Format edges for visualization
      links = allEdges.map(edge => ({
        source: edge.sourceId,
        target: edge.targetId,
        label: edge.type,
        value: edge.weight,
        properties: edge.properties || {}
      }));
    }
    
    return { nodes, links };
  }
  
  // Graph Nodes
  async getGraphNode(id: number): Promise<GraphNode | undefined> {
    return this.graphNodes.get(id);
  }

  async getGraphNodeByExternalId(externalId: string): Promise<GraphNode | undefined> {
    return Array.from(this.graphNodes.values()).find(
      (node) => node.externalId === externalId
    );
  }

  async getGraphNodes(type?: string, limit?: number, offset?: number): Promise<GraphNode[]> {
    let nodes = Array.from(this.graphNodes.values());
    
    if (type) {
      nodes = nodes.filter(node => node.type === type);
    }
    
    if (limit !== undefined && offset !== undefined) {
      return nodes.slice(offset, offset + limit);
    }
    
    return nodes;
  }

  async createGraphNode(node: InsertGraphNode): Promise<GraphNode> {
    const id = this.currentIds.graphNodes++;
    const graphNode: GraphNode = { ...node, id };
    this.graphNodes.set(id, graphNode);
    return graphNode;
  }

  async updateGraphNode(id: number, updates: Partial<InsertGraphNode>): Promise<GraphNode | undefined> {
    const existingNode = this.graphNodes.get(id);
    if (!existingNode) return undefined;
    
    const updatedNode = { ...existingNode, ...updates };
    this.graphNodes.set(id, updatedNode);
    return updatedNode;
  }

  async deleteGraphNode(id: number): Promise<boolean> {
    // Also delete all associated edges
    const edges = await this.getGraphEdgesByNode(id, 'both');
    for (const edge of edges) {
      await this.deleteGraphEdge(edge.id);
    }
    
    return this.graphNodes.delete(id);
  }

  // Graph Edges
  async getGraphEdge(id: number): Promise<GraphEdge | undefined> {
    return this.graphEdges.get(id);
  }

  async getGraphEdges(sourceId?: number, targetId?: number, type?: string): Promise<GraphEdge[]> {
    let edges = Array.from(this.graphEdges.values());
    
    if (sourceId !== undefined) {
      edges = edges.filter(edge => edge.sourceId === sourceId);
    }
    
    if (targetId !== undefined) {
      edges = edges.filter(edge => edge.targetId === targetId);
    }
    
    if (type !== undefined) {
      edges = edges.filter(edge => edge.type === type);
    }
    
    return edges;
  }

  async getGraphEdgesBetween(sourceId: number, targetId: number): Promise<GraphEdge[]> {
    return Array.from(this.graphEdges.values()).filter(
      edge => (edge.sourceId === sourceId && edge.targetId === targetId) || 
              (edge.sourceId === targetId && edge.targetId === sourceId)
    );
  }

  async getGraphEdgesByNode(nodeId: number, direction: 'incoming' | 'outgoing' | 'both' = 'both'): Promise<GraphEdge[]> {
    return Array.from(this.graphEdges.values()).filter(edge => {
      if (direction === 'incoming') return edge.targetId === nodeId;
      if (direction === 'outgoing') return edge.sourceId === nodeId;
      return edge.sourceId === nodeId || edge.targetId === nodeId;
    });
  }

  async createGraphEdge(edge: InsertGraphEdge): Promise<GraphEdge> {
    const id = this.currentIds.graphEdges++;
    const graphEdge: GraphEdge = { ...edge, id };
    this.graphEdges.set(id, graphEdge);
    return graphEdge;
  }

  async updateGraphEdge(id: number, updates: Partial<InsertGraphEdge>): Promise<GraphEdge | undefined> {
    const existingEdge = this.graphEdges.get(id);
    if (!existingEdge) return undefined;
    
    const updatedEdge = { ...existingEdge, ...updates };
    this.graphEdges.set(id, updatedEdge);
    return updatedEdge;
  }

  async deleteGraphEdge(id: number): Promise<boolean> {
    return this.graphEdges.delete(id);
  }

  // Graph Analysis
  async getNodeConnections(nodeId: number, depth: number = 1, types?: string[]): Promise<{nodes: GraphNode[], edges: GraphEdge[]}> {
    const result: { nodes: GraphNode[], edges: GraphEdge[] } = {
      nodes: [],
      edges: []
    };
    
    const processedNodeIds = new Set<number>();
    const queue: { id: number, currentDepth: number }[] = [{ id: nodeId, currentDepth: 0 }];
    
    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;
      
      if (processedNodeIds.has(id)) continue;
      processedNodeIds.add(id);
      
      const node = await this.getGraphNode(id);
      if (!node) continue;
      
      result.nodes.push(node);
      
      if (currentDepth >= depth) continue;
      
      const edges = await this.getGraphEdgesByNode(id);
      
      for (const edge of edges) {
        if (types && !types.includes(edge.type)) continue;
        
        result.edges.push(edge);
        
        const nextNodeId = edge.sourceId === id ? edge.targetId : edge.sourceId;
        queue.push({ id: nextNodeId, currentDepth: currentDepth + 1 });
      }
    }
    
    return result;
  }

  async findRelatedNodes(nodeId: number, minWeight: number = 0.5, maxConnections: number = 10): Promise<GraphNode[]> {
    const edges = await this.getGraphEdgesByNode(nodeId);
    
    // Sort edges by weight (descending)
    const sortedEdges = edges
      .filter(edge => edge.weight >= minWeight)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxConnections);
    
    const relatedNodes: GraphNode[] = [];
    
    for (const edge of sortedEdges) {
      const relatedNodeId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
      const relatedNode = await this.getGraphNode(relatedNodeId);
      
      if (relatedNode) {
        relatedNodes.push(relatedNode);
      }
    }
    
    return relatedNodes;
  }

  async getGraphForVisualization(centralNodeId?: number, depth: number = 2, limit: number = 100): Promise<{nodes: any[], links: any[]}> {
    let nodes: any[] = [];
    let links: any[] = [];
    
    if (centralNodeId) {
      // Get connections around a central node
      const { nodes: connectedNodes, edges } = await this.getNodeConnections(centralNodeId, depth);
      
      // Format nodes for visualization
      nodes = connectedNodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type,
        group: node.type, // For coloring by type
        properties: node.properties || {}
      }));
      
      // Format edges for visualization
      links = edges.map(edge => ({
        source: edge.sourceId,
        target: edge.targetId,
        label: edge.type,
        value: edge.weight, // For edge thickness
        properties: edge.properties || {}
      }));
    } else {
      // Get all nodes and edges (with limit)
      const allNodes = await this.getGraphNodes(undefined, limit);
      
      // Format nodes for visualization
      nodes = allNodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type,
        group: node.type,
        properties: node.properties || {}
      }));
      
      // Get edges between these nodes
      const nodeIds = allNodes.map(node => node.id);
      const allEdges = (await this.getGraphEdges()).filter(
        edge => nodeIds.includes(edge.sourceId) && nodeIds.includes(edge.targetId)
      );
      
      // Format edges for visualization
      links = allEdges.map(edge => ({
        source: edge.sourceId,
        target: edge.targetId,
        label: edge.type,
        value: edge.weight,
        properties: edge.properties || {}
      }));
    }
    
    return { nodes, links };
  }
}



// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
