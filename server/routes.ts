import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import cookieParser from "cookie-parser";
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
import { authService, authenticateToken, authorizeRoles, hashPassword } from "./auth";
import { testSlackIntegration, sendProjectUpdate, sendProjectInsight } from "./services/slack";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup middleware
  app.use(cookieParser());
  
  // Create initial demo data if the database is empty
  const createInitialData = async () => {
    const projects = await storage.getProjects();
    
    if (projects.length === 0) {
      console.log("Creating initial demo data...");
      
      // Create demo user
      const hashedPassword = await hashPassword("password");
      const user = await storage.createUser({
        username: "demo",
        password: hashedPassword,
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

  // Authentication routes
  router.post("/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const { user, token } = await authService.register(userData);
      
      // Set token in cookie and response
      res.cookie('token', token, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' 
      });
      
      res.status(201).json({ user, token });
    } catch (error: any) {
      if (error?.message === 'Username already exists') {
        return res.status(409).json({ message: error.message });
      }
      res.status(400).json({ message: "Registration failed", error: error?.message || 'Unknown error' });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const { user, token } = await authService.login(username, password);
      
      // Set token in cookie and response
      res.cookie('token', token, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' 
      });
      
      res.status(200).json({ user, token });
    } catch (error: any) {
      res.status(401).json({ message: "Invalid credentials", error: error?.message || 'Unknown error' });
    }
  });

  router.post("/logout", (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: "Logged out successfully" });
  });

  router.get("/me", authenticateToken, (req, res) => {
    res.json(req.user);
  });

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
    } catch (error: any) {
      res.status(400).json({ message: "Invalid user data", error: error?.message || 'Unknown error' });
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

  // Integration actions routes
  router.post("/integrations/:id/sync", async (req, res) => {
    const id = parseInt(req.params.id);
    const integration = await storage.getIntegration(id);
    if (!integration) return res.status(404).json({ message: "Integration not found" });
    
    try {
      const data = await fetchExternalProjectData(integration);
      res.json({ success: true, message: "Data synchronization started", data });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to sync data", error: error?.message || 'Unknown error' });
    }
  });
  
  // Slack integration specific routes
  router.post("/integrations/slack/test", async (req, res) => {
    try {
      const { token, channelId } = req.body;
      
      if (!token || !channelId) {
        return res.status(400).json({ 
          success: false, 
          message: "Token and channelId are required" 
        });
      }
      
      const success = await testSlackIntegration(token, channelId);
      
      if (success) {
        // If test is successful, create or update integration
        if (req.body.userId) {
          const userId = parseInt(req.body.userId);
          const existingIntegrations = await storage.getIntegrations(userId);
          const slackIntegration = existingIntegrations.find(i => i.type === 'slack');
          
          if (slackIntegration) {
            // Update existing integration
            await storage.updateIntegration(slackIntegration.id, {
              config: {
                token,
                channelId
              },
              active: true
            });
          } else {
            // Create new integration
            await storage.createIntegration({
              userId,
              name: "Slack Integration",
              type: "slack",
              active: true,
              config: {
                token,
                channelId
              }
            });
          }
        }
        
        res.json({ 
          success: true, 
          message: "Slack integration test successful" 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: "Slack integration test failed" 
        });
      }
    } catch (error: any) {
      console.error("Slack test error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error testing Slack integration", 
        error: error?.message || 'Unknown error' 
      });
    }
  });
  
  router.post("/projects/:projectId/slack/update", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { token, channelId, message } = req.body;
      
      if (!token || !channelId || !message) {
        return res.status(400).json({ 
          success: false, 
          message: "Token, channelId, and message are required" 
        });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: "Project not found" 
        });
      }
      
      const messageTs = await sendProjectUpdate(
        projectId,
        project.name,
        message,
        channelId,
        token
      );
      
      // Record the activity
      await storage.createActivity({
        type: "integration",
        description: "Sent project update to Slack",
        userId: parseInt(req.body.userId) || 1, // Default to user 1 if not provided
        projectId,
        entityType: "project",
        entityId: projectId
      });
      
      res.json({ 
        success: true, 
        message: "Project update sent to Slack", 
        messageTs 
      });
    } catch (error: any) {
      console.error("Slack update error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error sending project update to Slack", 
        error: error?.message || 'Unknown error' 
      });
    }
  });
  
  router.post("/projects/:projectId/slack/insight", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { token, channelId, insightId } = req.body;
      
      if (!token || !channelId || !insightId) {
        return res.status(400).json({ 
          success: false, 
          message: "Token, channelId, and insightId are required" 
        });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: "Project not found" 
        });
      }
      
      const insight = await storage.getInsight(parseInt(insightId));
      if (!insight) {
        return res.status(404).json({ 
          success: false, 
          message: "Insight not found" 
        });
      }
      
      const messageTs = await sendProjectInsight(
        projectId,
        project.name,
        insight.type,
        insight.content,
        insight.confidence,
        channelId,
        token
      );
      
      // Record the activity
      await storage.createActivity({
        type: "integration",
        description: "Shared project insight to Slack",
        userId: parseInt(req.body.userId) || 1, // Default to user 1 if not provided
        projectId,
        entityType: "insight",
        entityId: parseInt(insightId)
      });
      
      res.json({ 
        success: true, 
        message: "Project insight sent to Slack", 
        messageTs 
      });
    } catch (error: any) {
      console.error("Slack insight error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error sending project insight to Slack", 
        error: error?.message || 'Unknown error' 
      });
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
      } catch (error: any) {
        console.error('WebSocket message error:', error?.message || 'Unknown error');
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  return httpServer;
}
