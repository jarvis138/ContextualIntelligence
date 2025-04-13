import express, { type Express } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertProjectSchema, 
  insertTeamSchema, 
  insertTeamMemberSchema, 
  insertTaskSchema, 
  insertDocumentSchema, 
  insertActivitySchema, 
  insertIntegrationSchema, 
  insertInsightSchema, 
  insertRelationshipSchema 
} from "@shared/schema";
import { analyzeProjectData, generateInsights } from "./services/nlp";
import { fetchExternalProjectData } from "./services/integrations";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create initial demo data if the database is empty
  const createInitialData = async () => {
    const projects = await storage.getProjects();
    
    if (projects.length === 0) {
      console.log("Creating initial demo data...");
      
      // Create demo user
      const user = await storage.createUser({
        username: "demo",
        password: "password",
        fullName: "Demo User",
        email: "demo@example.com",
        role: "admin",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      });
      
      // Create demo project
      const project = await storage.createProject({
        name: "Web Application Redesign",
        description: "Redesign of the company's web application with improved UX/UI and functionality",
        status: "active",
        progress: 67
      });
      
      // Create demo teams
      const frontendTeam = await storage.createTeam({
        name: "Frontend Team",
        description: "Responsible for UI development",
        icon: "ri-code-s-slash-line",
        progress: 85
      });
      
      const backendTeam = await storage.createTeam({
        name: "Backend Team",
        description: "Responsible for API and database",
        icon: "ri-database-2-line",
        progress: 43
      });
      
      // Create demo tasks
      await storage.createTask({
        title: "Design system implementation",
        description: "Implement the new design system components",
        status: "in_progress",
        assigneeId: user.id,
        projectId: project.id,
        teamId: frontendTeam.id,
        dueDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))
      });
      
      await storage.createTask({
        title: "API refactoring",
        description: "Refactor API endpoints for better performance",
        status: "pending",
        assigneeId: user.id,
        projectId: project.id,
        teamId: backendTeam.id,
        dueDate: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000))
      });
      
      // Create demo document
      await storage.createDocument({
        title: "Project Requirements",
        content: "Detailed requirements for the web application redesign",
        fileType: "text",
        projectId: project.id,
        createdBy: user.id,
        updatedBy: user.id
      });
      
      // Create demo activity
      await storage.createActivity({
        type: "create",
        description: "Project created",
        userId: user.id,
        projectId: project.id,
        entityType: "project",
        entityId: project.id
      });
      
      // Create demo insight
      await storage.createInsight({
        type: "info",
        content: "Project on track for timely completion",
        projectId: project.id,
        confidence: 85
      });
      
      console.log("Initial demo data created successfully");
    }
  };
  
  // Initialize demo data
  await createInitialData();
  
  const router = express.Router();

  // User routes
  router.get("/users", async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  router.get("/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  router.post("/users", async (req, res) => {
    try {
      const user = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(user);
      res.status(201).json(newUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  // Project routes
  router.get("/projects", async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  router.get("/projects/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  router.post("/projects", async (req, res) => {
    try {
      const project = insertProjectSchema.parse(req.body);
      const newProject = await storage.createProject(project);
      res.status(201).json(newProject);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data", error });
    }
  });

  router.patch("/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(id, project);
      if (!updatedProject) return res.status(404).json({ message: "Project not found" });
      res.json(updatedProject);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data", error });
    }
  });

  // Team routes
  router.get("/teams", async (req, res) => {
    const teams = await storage.getTeams();
    res.json(teams);
  });

  router.get("/teams/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const team = await storage.getTeam(id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  });

  router.post("/teams", async (req, res) => {
    try {
      const team = insertTeamSchema.parse(req.body);
      const newTeam = await storage.createTeam(team);
      res.status(201).json(newTeam);
    } catch (error) {
      res.status(400).json({ message: "Invalid team data", error });
    }
  });

  // Team Members routes
  router.get("/teams/:teamId/members", async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const teamMembers = await storage.getTeamMembers(teamId);
    
    // Get full user details for each team member
    const members = await Promise.all(
      teamMembers.map(async (member) => {
        const user = await storage.getUser(member.userId);
        return { ...member, user };
      })
    );
    
    res.json(members);
  });

  router.post("/teams/:teamId/members", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const teamMember = insertTeamMemberSchema.parse({ ...req.body, teamId });
      const newTeamMember = await storage.createTeamMember(teamMember);
      res.status(201).json(newTeamMember);
    } catch (error) {
      res.status(400).json({ message: "Invalid team member data", error });
    }
  });

  // Task routes
  router.get("/projects/:projectId/tasks", async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const tasks = await storage.getTasks(projectId);
    res.json(tasks);
  });

  router.get("/teams/:teamId/tasks", async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const tasks = await storage.getTasksByTeam(teamId);
    res.json(tasks);
  });

  router.post("/projects/:projectId/tasks", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const task = insertTaskSchema.parse({ ...req.body, projectId });
      const newTask = await storage.createTask(task);
      res.status(201).json(newTask);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data", error });
    }
  });

  // Document routes
  router.get("/projects/:projectId/documents", async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const documents = await storage.getDocuments(projectId);
    res.json(documents);
  });

  router.get("/documents/recent", async (req, res) => {
    const limit = parseInt(req.query.limit as string || "3");
    const documents = await storage.getRecentDocuments(limit);
    
    // Get user details for each document
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const updatedBy = await storage.getUser(doc.updatedBy);
        return { ...doc, updatedByUser: updatedBy };
      })
    );
    
    res.json(enrichedDocuments);
  });

  router.post("/projects/:projectId/documents", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const document = insertDocumentSchema.parse({ ...req.body, projectId });
      const newDocument = await storage.createDocument(document);
      res.status(201).json(newDocument);
    } catch (error) {
      res.status(400).json({ message: "Invalid document data", error });
    }
  });

  // Activity routes
  router.get("/projects/:projectId/activities", async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const activities = await storage.getActivities(projectId, limit);
    
    // Get user details for each activity
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        const user = await storage.getUser(activity.userId);
        return { ...activity, user };
      })
    );
    
    res.json(enrichedActivities);
  });

  router.post("/projects/:projectId/activities", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const activity = insertActivitySchema.parse({ ...req.body, projectId });
      const newActivity = await storage.createActivity(activity);
      res.status(201).json(newActivity);
    } catch (error) {
      res.status(400).json({ message: "Invalid activity data", error });
    }
  });

  // Integration routes
  router.get("/users/:userId/integrations", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const integrations = await storage.getIntegrations(userId);
    res.json(integrations);
  });

  router.post("/users/:userId/integrations", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const integration = insertIntegrationSchema.parse({ ...req.body, userId });
      const newIntegration = await storage.createIntegration(integration);
      res.status(201).json(newIntegration);
    } catch (error) {
      res.status(400).json({ message: "Invalid integration data", error });
    }
  });

  router.patch("/integrations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const integration = insertIntegrationSchema.partial().parse(req.body);
      const updatedIntegration = await storage.updateIntegration(id, integration);
      if (!updatedIntegration) return res.status(404).json({ message: "Integration not found" });
      res.json(updatedIntegration);
    } catch (error) {
      res.status(400).json({ message: "Invalid integration data", error });
    }
  });

  router.delete("/integrations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteIntegration(id);
    if (!success) return res.status(404).json({ message: "Integration not found" });
    res.status(204).send();
  });

  // Insight routes
  router.get("/projects/:projectId/insights", async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const insights = await storage.getInsights(projectId);
    res.json(insights);
  });

  router.post("/projects/:projectId/insights", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const insight = insertInsightSchema.parse({ ...req.body, projectId });
      const newInsight = await storage.createInsight(insight);
      res.status(201).json(newInsight);
    } catch (error) {
      res.status(400).json({ message: "Invalid insight data", error });
    }
  });

  // Relationship routes
  router.get("/projects/:projectId/relationships", async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const relationships = await storage.getRelationships(projectId);
    res.json(relationships);
  });

  router.post("/relationships", async (req, res) => {
    try {
      const relationship = insertRelationshipSchema.parse(req.body);
      const newRelationship = await storage.createRelationship(relationship);
      res.status(201).json(newRelationship);
    } catch (error) {
      res.status(400).json({ message: "Invalid relationship data", error });
    }
  });

  // AI Analysis routes
  router.get("/projects/:projectId/analyze", async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const project = await storage.getProject(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    
    // Get all relevant project data
    const tasks = await storage.getTasks(projectId);
    const documents = await storage.getDocuments(projectId);
    const activities = await storage.getActivities(projectId, 20);
    
    // Analyze the data
    const analysis = await analyzeProjectData(project, tasks, documents, activities);
    res.json(analysis);
  });

  router.post("/projects/:projectId/generate-insights", async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const project = await storage.getProject(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    
    // Get all relevant project data
    const tasks = await storage.getTasks(projectId);
    const documents = await storage.getDocuments(projectId);
    const activities = await storage.getActivities(projectId, 20);
    
    // Generate insights
    const insights = await generateInsights(project, tasks, documents, activities);
    
    // Save insights to database
    const savedInsights = await Promise.all(
      insights.map(insight => storage.createInsight({
        type: insight.type,
        content: insight.content,
        projectId,
        confidence: insight.confidence
      }))
    );
    
    res.json(savedInsights);
  });

  // External data sync routes
  router.post("/integrations/:id/sync", async (req, res) => {
    const id = parseInt(req.params.id);
    const integration = await storage.getIntegration(id);
    if (!integration) return res.status(404).json({ message: "Integration not found" });
    
    try {
      const data = await fetchExternalProjectData(integration);
      res.json({ success: true, message: "Data synchronization started", data });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync data", error });
    }
  });

  // Dashboard data route - combined endpoint for dashboard data
  router.get("/projects/:projectId/dashboard", async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const project = await storage.getProject(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    
    // Get all data needed for dashboard
    const tasks = await storage.getTasks(projectId);
    const teams = await storage.getTeams();
    const documents = await storage.getRecentDocuments(3);
    const activities = await storage.getActivities(projectId, 5);
    const insights = await storage.getInsights(projectId);
    
    // Enrich activities with user data
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        const user = await storage.getUser(activity.userId);
        return { ...activity, user };
      })
    );
    
    // Enrich documents with user data
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const updatedBy = await storage.getUser(doc.updatedBy);
        return { ...doc, updatedByUser: updatedBy };
      })
    );

    // Get team members count for each team
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const members = await storage.getTeamMembers(team.id);
        const teamTasks = await storage.getTasksByTeam(team.id);
        return { 
          ...team, 
          memberCount: members.length,
          taskCount: teamTasks.length 
        };
      })
    );
    
    // Return combined dashboard data
    res.json({
      project,
      summaryCards: {
        activeTasks: tasks.filter(t => t.status !== "completed").length,
        documents: documents.length,
        teamMembers: (await storage.getUsers()).length,
        integrations: (await storage.getIntegrations(1)).length // Hard-coded user ID 1 for demo
      },
      teams: teamsWithCounts,
      recentActivities: enrichedActivities,
      recentDocuments: enrichedDocuments,
      insights
    });
  });

  // Register the router with /api prefix
  app.use("/api", router);

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Broadcast to all clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'update',
              data
            }));
          }
        });
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  return httpServer;
}
