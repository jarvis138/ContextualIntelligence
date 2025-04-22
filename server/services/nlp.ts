import { storage } from '../storage';
import OpenAI from 'openai';
import { DocumentSummary, GraphData, GraphNode, GraphEdge, SearchResult } from '../../client/src/lib/nlpService';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Initialize OpenAI client with fallback for development
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-development-environment-only'
});

// Mock implementation for development
const mockOpenAI = {
  chat: {
    completions: {
      create: async (params: any) => {
        console.log('Using mock OpenAI response for local development');
        // Return a mock response based on the request
        if (params.messages[1].content.includes('Analyze the following text')) {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  summary: "This is a mock summary for local development. The application is working in development mode.",
                  keyTopics: ["Development", "Testing", "Mock Data", "Nuvexa"],
                  sentiment: { label: "positive", score: 0.8 }
                })
              }
            }]
          };
        } else if (params.messages[1].content.includes('Extract entities')) {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  entities: [
                    { name: "Nuvexa", type: "product", confidence: 0.95 },
                    { name: "Development", type: "concept", confidence: 0.9 },
                    { name: "Application", type: "product", confidence: 0.85 }
                  ]
                })
              }
            }]
          };
        } else {
          return {
            choices: [{
              message: {
                content: JSON.stringify({ result: "Mock response for development" })
              }
            }]
          };
        }
      }
    }
  }
};

// Use mock implementation in development mode
const aiClient = isDevelopment ? mockOpenAI : openai;

// Define entity type
export interface Entity {
  name: string;
  type: string;
  confidence: number;
  start?: number;
  end?: number;
  metadata?: Record<string, any>;
}

/**
 * Process text content through NLP to extract insights
 * @param content Text content to analyze
 */
export async function analyzeTextContent(content: string): Promise<{
  summary: string;
  keyTopics: string[];
  sentiment: { label: string; score: number };
  entities: Entity[];
}> {
  try {
    // Extract entities first
    const entities = await extractEntities(content);
    
    // Analyze sentiment and extract key topics using OpenAI
    const response = await aiClient.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert NLP processor that analyzes text and returns structured data."
        },
        {
          role: "user",
          content: `Analyze the following text and provide:
1. A concise summary (max 200 words)
2. 3-7 key topics as simple phrases or terms
3. Sentiment analysis (positive, negative, or neutral) with a confidence score (0-1)

Text to analyze:
${content}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      summary: result.summary || "No summary available",
      keyTopics: result.keyTopics || [],
      sentiment: {
        label: result.sentiment?.label || "neutral",
        score: result.sentiment?.score || 0.5
      },
      entities
    };
  } catch (error: any) {
    console.error('Text analysis error:', error);
    return {
      summary: "Error analyzing text content",
      keyTopics: [],
      sentiment: { label: "neutral", score: 0.5 },
      entities: []
    };
  }
}

/**
 * Extract entities from text content
 * @param text Text content to analyze
 */
export async function extractEntities(text: string): Promise<Entity[]> {
  try {
    // Use OpenAI to extract entities
    const response = await aiClient.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert entity extractor. Extract the following types of entities:
- person: Names of people
- organization: Company and organization names
- location: Physical locations, cities, countries
- date: Dates, deadlines and time references
- task: Action items or todo items
- project: Project names or references
- technology: Technologies, frameworks, programming languages
- product: Product names
- concept: Abstract concepts and ideas`
        },
        {
          role: "user",
          content: `Extract entities from the following text. Return a JSON array of entities, each with name, type, and confidence (0-1).

Text:
${text}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return (result.entities || []) as Entity[];
  } catch (error: any) {
    console.error('Entity extraction error:', error);
    return [];
  }
}

/**
 * Generate a summary for a document by ID
 * @param documentId ID of the document to summarize
 */
export async function summarizeDocument(documentId: number): Promise<DocumentSummary | null> {
  try {
    // Get document
    const document = await storage.getDocument(documentId);
    
    if (!document || !document.content) {
      console.error(`Document not found or empty content: ${documentId}`);
      return null;
    }
    
    // Process document content
    const analysis = await analyzeTextContent(document.content);
    
    return {
      summary: analysis.summary,
      keyTopics: analysis.keyTopics,
      sentiment: analysis.sentiment,
      entities: analysis.entities
    };
  } catch (error: any) {
    console.error('Document summarization error:', error);
    return null;
  }
}

/**
 * Generate a context graph for a project by mapping relationships between entities
 * @param projectId ID of the project for which to generate the graph
 */
export async function generateContextGraph(projectId: number): Promise<GraphData | null> {
  try {
    // Get project data
    const project = await storage.getProject(projectId);
    if (!project) {
      console.error(`Project not found: ${projectId}`);
      return null;
    }
    
    // Initialize graph data
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeMap = new Map<string, GraphNode>();
    
    // Add project node
    const projectNode: GraphNode = {
      id: `project-${project.id}`,
      type: 'project',
      label: project.name,
      properties: {
        description: project.description,
        status: project.status,
        progress: project.progress
      }
    };
    nodes.push(projectNode);
    nodeMap.set(projectNode.id, projectNode);
    
    // Get documents for the project
    const documents = await storage.getDocuments(projectId);
    
    // Add document nodes and process their content
    for (const document of documents) {
      const documentNode: GraphNode = {
        id: `document-${document.id}`,
        type: 'document',
        label: document.title,
        properties: {
          fileType: document.fileType,
          // Remove createdAt and updatedAt references since they don't exist in the Document type
          createdById: document.createdBy,
          updatedById: document.updatedBy
        }
      };
      nodes.push(documentNode);
      nodeMap.set(documentNode.id, documentNode);
      
      // Link document to project
      edges.push({
        source: projectNode.id,
        target: documentNode.id,
        type: 'contains',
        strength: 5,
        properties: {}
      });
      
      // If document has content, extract entities
      if (document.content) {
        const analysis = await analyzeTextContent(document.content);
        
        // Process high-confidence entities
        for (const entity of analysis.entities) {
          if (entity.confidence < 0.7) continue;
          
          const entityId = `entity-${entity.type}-${entity.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          
          // Add entity node if it doesn't exist
          if (!nodeMap.has(entityId)) {
            const entityNode: GraphNode = {
              id: entityId,
              type: entity.type,
              label: entity.name,
              properties: {
                confidence: entity.confidence,
                source: `document-${document.id}`
              }
            };
            nodes.push(entityNode);
            nodeMap.set(entityId, entityNode);
          }
          
          // Link entity to document
          edges.push({
            source: documentNode.id,
            target: entityId,
            type: 'mentions',
            strength: Math.round(entity.confidence * 10),
            properties: {}
          });
        }
      }
    }
    
    // Get tasks for the project
    const tasks = await storage.getTasks(projectId);
    
    // Add task nodes
    for (const task of tasks) {
      const taskNode: GraphNode = {
        id: `task-${task.id}`,
        type: 'task',
        label: task.title,
        properties: {
          status: task.status,
          description: task.description,
          dueDate: task.dueDate
        }
      };
      nodes.push(taskNode);
      nodeMap.set(taskNode.id, taskNode);
      
      // Link task to project
      edges.push({
        source: projectNode.id,
        target: taskNode.id,
        type: 'has_task',
        strength: 5,
        properties: {}
      });
      
      // If task description exists, extract entities
      if (task.description) {
        const entities = await extractEntities(task.description);
        
        // Process high-confidence entities
        for (const entity of entities) {
          if (entity.confidence < 0.7) continue;
          
          const entityId = `entity-${entity.type}-${entity.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          
          // Add entity node if it doesn't exist
          if (!nodeMap.has(entityId)) {
            const entityNode: GraphNode = {
              id: entityId,
              type: entity.type,
              label: entity.name,
              properties: {
                confidence: entity.confidence,
                source: `task-${task.id}`
              }
            };
            nodes.push(entityNode);
            nodeMap.set(entityId, entityNode);
          }
          
          // Link entity to task
          edges.push({
            source: taskNode.id,
            target: entityId,
            type: 'mentions',
            strength: Math.round(entity.confidence * 10),
            properties: {}
          });
        }
      }
    }
    
    // Get explicit relationships
    const relationships = await storage.getRelationships(projectId);
    
    // Add relationships as edges
    for (const rel of relationships) {
      const sourceId = `${rel.sourceType}-${rel.sourceId}`;
      const targetId = `${rel.targetType}-${rel.targetId}`;
      
      if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
        edges.push({
          source: sourceId,
          target: targetId,
          type: rel.description || 'relates_to',
          strength: rel.strength || 5,
          properties: {}
        });
      }
    }
    
    return { nodes, edges };
  } catch (error: any) {
    console.error('Context graph generation error:', error);
    return null;
  }
}

/**
 * Perform semantic search across project documents
 * @param projectId ID of the project to search in
 * @param query Search query
 */
export async function semanticSearch(projectId: number, query: string): Promise<SearchResult[]> {
  try {
    // Get documents for the project
    const documents = await storage.getDocuments(projectId);
    
    if (documents.length === 0) {
      return [];
    }
    
    // Transform documents into text chunks for embedding
    const documentChunks: Array<{
      documentId: number;
      title: string;
      chunk: string;
    }> = [];
    
    // Split documents into chunks
    for (const doc of documents) {
      if (!doc.content) continue;
      
      // Simple chunking - split by paragraphs
      const paragraphs = doc.content.split(/\n\s*\n/);
      
      paragraphs.forEach((paragraph, i) => {
        if (paragraph.trim().length > 10) {
          documentChunks.push({
            documentId: doc.id,
            title: doc.title,
            chunk: paragraph
          });
        }
      });
    }
    
    if (documentChunks.length === 0) {
      return [];
    }
    
    // Use OpenAI to rank the chunks by relevance
    const response = await aiClient.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert search algorithm that ranks text chunks by relevance to a query."
        },
        {
          role: "user",
          content: `Rank the following text chunks by relevance to this query: "${query}".
Return JSON with an array of objects containing:
- index: The original index of the chunk in the array
- relevance: A score from 0-1 indicating relevance
- snippet: A key excerpt from the chunk that matches the query

Text chunks:
${documentChunks.map((chunk, i) => `[${i}] ${chunk.chunk.substring(0, 500)}...`).join("\n\n")}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    const rankings = result.rankings || [];
    
    // Convert rankings to search results
    const searchResults: SearchResult[] = rankings
      .filter((rank: any) => rank.relevance > 0.5) // Only include relevant results
      .map((rank: any) => {
        const chunk = documentChunks[rank.index];
        return {
          documentId: chunk.documentId,
          title: chunk.title,
          relevance: rank.relevance,
          snippet: rank.snippet || chunk.chunk.substring(0, 150) + "..."
        };
      })
      .slice(0, 10); // Limit to top 10 results
    
    return searchResults;
  } catch (error: any) {
    console.error('Semantic search error:', error);
    return [];
  }
}

/**
 * Generate project insights by analyzing all project data
 * @param projectId ID of the project to analyze
 */
export async function generateInsights(project: any, tasks: any[], documents: any[], activities: any[]): Promise<any[]> {
  try {
    if (!project) {
      console.error(`Invalid project data`);
      return [];
    }
    
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
    
    // Generate insights based on task completion and activities
    const insights = [];
    
    // Progress insight
    if (completionRate < 0.3 && project.progress > 40) {
      insights.push({
        type: 'warning',
        content: 'Task completion rate (${Math.round(completionRate * 100)}%) is lower than expected for the reported progress (${project.progress}%)',
        confidence: 0.8
      });
    } else if (completionRate > 0.7 && project.progress < 60) {
      insights.push({
        type: 'info',
        content: 'Task completion rate is high (${Math.round(completionRate * 100)}%) but reported progress is lower (${project.progress}%)',
        confidence: 0.75
      });
    }
    
    // Activity insights
    const recentActivityCount = activities.filter(a => {
      const activityDate = new Date(a.timestamp); // Activity uses timestamp, not createdAt
      const daysDiff = (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff < 7;
    }).length;
    
    if (recentActivityCount < 3) {
      insights.push({
        type: 'warning',
        content: 'Low project activity detected in the last week',
        confidence: 0.7
      });
    } else if (recentActivityCount > 10) {
      insights.push({
        type: 'success',
        content: 'High project activity detected in the last week',
        confidence: 0.8
      });
    }
    
    // Format and save insights
    const formattedInsights = insights.map(insight => ({
      type: insight.type,
      content: insight.content,
      projectId: project.id,
      confidence: insight.confidence * 100
    }));
    
    // Save insights to database
    for (const insight of formattedInsights) {
      await storage.createInsight(insight);
    }
    
    return formattedInsights;
  } catch (error: any) {
    console.error('Generate insights error:', error);
    return [];
  }
}

/**
 * Analyze project data for dashboard
 * @param projectId ID of the project to analyze
 */
export async function analyzeProjectData(projectId: number): Promise<any> {
  try {
    // Get tasks
    const tasks = await storage.getTasks(projectId);
    
    // Calculate task stats
    const tasksByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get activities
    const activities = await storage.getActivities(projectId, 30);
    
    // Calculate activity trends
    const activityByDay = activities.reduce((acc, activity) => {
      const date = new Date(activity.timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Sort dates and convert to arrays
    const sortedDates = Object.keys(activityByDay).sort();
    const activityTrend = {
      dates: sortedDates,
      counts: sortedDates.map(date => activityByDay[date])
    };
    
    return {
      taskStats: tasksByStatus,
      activityTrend
    };
  } catch (error: any) {
    console.error('Analyze project data error:', error);
    return {
      taskStats: {},
      activityTrend: { dates: [], counts: [] }
    };
  }
}