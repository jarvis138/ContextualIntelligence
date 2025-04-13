import { Request, Response } from "express";
import * as elasticsearchService from "../services/elasticsearch";
import * as nlpService from "../services/nlp";
import { storage } from "../storage";

/**
 * Check if Elasticsearch is available
 */
export async function checkElasticsearchStatus(req: Request, res: Response) {
  try {
    const available = await elasticsearchService.isElasticsearchAvailable();
    
    res.json({
      success: true,
      status: available ? 'available' : 'unavailable'
    });
  } catch (error: any) {
    console.error("Elasticsearch status check error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking Elasticsearch status",
      error: error?.message || "Unknown error"
    });
  }
}

/**
 * Initialize Elasticsearch indices and index all data
 */
export async function initializeElasticsearch(req: Request, res: Response) {
  try {
    const initialized = await elasticsearchService.initializeElasticsearch();
    
    if (!initialized) {
      return res.status(500).json({
        success: false,
        message: "Failed to initialize Elasticsearch"
      });
    }
    
    // Index all data
    const indexStats = await elasticsearchService.indexAllData();
    
    res.json({
      success: true,
      message: "Elasticsearch initialized successfully",
      stats: indexStats
    });
  } catch (error: any) {
    console.error("Elasticsearch initialization error:", error);
    res.status(500).json({
      success: false,
      message: "Error initializing Elasticsearch",
      error: error?.message || "Unknown error"
    });
  }
}

/**
 * Perform global search across all indices
 */
export async function globalSearch(req: Request, res: Response) {
  try {
    const { query, filters } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }
    
    // Check if Elasticsearch is available
    const elasticsearchAvailable = await elasticsearchService.isElasticsearchAvailable();
    
    if (!elasticsearchAvailable) {
      // Fall back to simple in-memory search if Elasticsearch is not available
      return fallbackSearch(query, req, res);
    }
    
    const results = await elasticsearchService.globalSearch(query, filters);
    
    // Record search activity
    try {
      await storage.createActivity({
        type: "search",
        description: `Performed global search: "${query}"`,
        userId: req.body.userId || 1,
        projectId: filters?.projectId || null,
        entityType: null,
        entityId: null
      });
    } catch (error) {
      console.warn('Failed to record search activity:', error);
    }
    
    res.json({
      success: true,
      results,
      source: 'elasticsearch'
    });
  } catch (error: any) {
    console.error("Global search error:", error);
    
    // Fall back to simple search if Elasticsearch throws an error
    return fallbackSearch(req.body.query, req, res);
  }
}

/**
 * Perform hybrid search using both Elasticsearch and semantic search
 */
export async function hybridSearch(req: Request, res: Response) {
  try {
    const { query, projectId } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }
    
    // Check if Elasticsearch is available
    const elasticsearchAvailable = await elasticsearchService.isElasticsearchAvailable();
    
    if (!elasticsearchAvailable) {
      // Fall back to semantic search only if Elasticsearch is not available
      return semanticOnlySearch(query, projectId, req, res);
    }
    
    // Perform hybrid search
    const results = await elasticsearchService.hybridSearch(query, projectId);
    
    // Record search activity
    try {
      await storage.createActivity({
        type: "search",
        description: `Performed hybrid search: "${query}"`,
        userId: req.body.userId || 1,
        projectId: projectId || null,
        entityType: null,
        entityId: null
      });
    } catch (error) {
      console.warn('Failed to record search activity:', error);
    }
    
    res.json({
      success: true,
      results,
      source: 'hybrid'
    });
  } catch (error: any) {
    console.error("Hybrid search error:", error);
    
    // Fall back to semantic search only if hybrid search fails
    return semanticOnlySearch(req.body.query, req.body.projectId, req, res);
  }
}

/**
 * Fallback search function when Elasticsearch is not available
 */
async function fallbackSearch(query: string, req: Request, res: Response) {
  try {
    // Simple in-memory search across all entities
    const projects = await storage.getProjects();
    const users = await storage.getUsers();
    const teams = await storage.getTeams();
    
    // Filter based on query string (case-insensitive)
    const queryLower = query.toLowerCase();
    
    const filteredProjects = projects.filter(p => 
      p.name.toLowerCase().includes(queryLower) || 
      (p.description && p.description.toLowerCase().includes(queryLower))
    );
    
    const filteredUsers = users.filter(u => 
      u.username.toLowerCase().includes(queryLower) || 
      u.fullName.toLowerCase().includes(queryLower) || 
      u.email.toLowerCase().includes(queryLower)
    );
    
    const filteredTeams = teams.filter(t => 
      t.name.toLowerCase().includes(queryLower) || 
      (t.description && t.description.toLowerCase().includes(queryLower))
    );
    
    // Get documents and tasks for the filtered projects
    const documentsPromises = filteredProjects.map(p => storage.getDocuments(p.id));
    const tasksPromises = filteredProjects.map(p => storage.getTasks(p.id));
    
    const projectDocuments = await Promise.all(documentsPromises);
    const projectTasks = await Promise.all(tasksPromises);
    
    // Flatten and filter documents and tasks
    const allDocuments = projectDocuments.flat();
    const allTasks = projectTasks.flat();
    
    const filteredDocuments = allDocuments.filter(d => 
      d.title.toLowerCase().includes(queryLower) || 
      (d.content && d.content.toLowerCase().includes(queryLower))
    );
    
    const filteredTasks = allTasks.filter(t => 
      t.title.toLowerCase().includes(queryLower) || 
      (t.description && t.description.toLowerCase().includes(queryLower))
    );
    
    // Record search activity
    try {
      await storage.createActivity({
        type: "search",
        description: `Performed fallback search: "${query}"`,
        userId: req.body.userId || 1,
        projectId: 1, // Default to project ID 1 when no project ID is provided
        entityType: null,
        entityId: null
      });
    } catch (error) {
      console.warn('Failed to record search activity:', error);
    }
    
    res.json({
      success: true,
      results: {
        projects: filteredProjects,
        documents: filteredDocuments,
        tasks: filteredTasks,
        users: filteredUsers,
        teams: filteredTeams,
        semanticResults: []
      },
      source: 'fallback'
    });
  } catch (error: any) {
    console.error("Fallback search error:", error);
    res.status(500).json({
      success: false,
      message: "Error performing search",
      error: error?.message || "Unknown error"
    });
  }
}

/**
 * Semantic-only search when Elasticsearch is not available
 */
async function semanticOnlySearch(query: string, projectId: number | undefined, req: Request, res: Response) {
  try {
    if (!projectId) {
      // If no projectId is provided, fall back to basic search
      return fallbackSearch(query, req, res);
    }
    
    // Check if project exists
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    // Perform semantic search
    const semanticResults = await nlpService.semanticSearch(projectId, query);
    
    // Record search activity
    try {
      await storage.createActivity({
        type: "search",
        description: `Performed semantic search: "${query}"`,
        userId: req.body.userId || 1,
        projectId,
        entityType: "project",
        entityId: projectId
      });
    } catch (error) {
      console.warn('Failed to record search activity:', error);
    }
    
    res.json({
      success: true,
      results: {
        projects: [],
        documents: [],
        tasks: [],
        users: [],
        teams: [],
        semanticResults
      },
      source: 'semantic'
    });
  } catch (error: any) {
    console.error("Semantic search error:", error);
    res.status(500).json({
      success: false,
      message: "Error performing semantic search",
      error: error?.message || "Unknown error"
    });
  }
}