import OpenAI from "openai";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Type definitions
interface InsightResult {
  type: 'risk' | 'opportunity' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  relatedEntities?: {
    type: string;
    id: number;
    name: string;
  }[];
  metadata?: Record<string, any>;
}

interface AnalysisRequest {
  projectId: number;
  context?: string;
  options?: {
    maxInsights?: number;
    includeTasks?: boolean;
    includeDocuments?: boolean;
    includeActivities?: boolean;
    focusArea?: 'timeline' | 'resources' | 'deliverables' | 'general';
  };
}

interface TopicModelingResult {
  topics: {
    id: number;
    keywords: string[];
    documents: number[];
    score: number;
  }[];
  documentTopics: {
    documentId: number;
    topicId: number;
    score: number;
  }[];
}

/**
 * Generate AI-powered insights for a project
 */
export async function generateAIInsights(params: AnalysisRequest): Promise<InsightResult[]> {
  try {
    const { projectId, context, options = {} } = params;
    
    // Gather project data
    const projectData = await getProjectDataForAnalysis(projectId, options);
    
    // Prepare prompt for OpenAI
    const prompt = buildProjectInsightPrompt(projectData, context, options);
    
    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: `You are an AI project analyst that identifies risks, opportunities, trends, anomalies, and recommendations based on project data. 
                   Analyze the provided project data and output exactly 5 insights in JSON format.
                   Each insight should have: type (risk, opportunity, trend, anomaly, recommendation), 
                   title (concise description), description (detailed explanation), and confidence (number between 0-100).`
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000
    });
    
    // Parse and process response
    const result = JSON.parse(response.choices[0].message.content);
    
    return result.insights || [];
  } catch (error) {
    console.error("Error generating AI insights:", error);
    throw new Error(`Failed to generate AI insights: ${error.message}`);
  }
}

/**
 * Generate topic models from project documents
 */
export async function generateTopicModels(projectId: number): Promise<TopicModelingResult> {
  try {
    // Get documents related to project
    const documents = await getProjectDocuments(projectId);
    
    if (!documents.length) {
      throw new Error("No documents found for this project");
    }
    
    // Extract text content for analysis
    const documentContents = documents.map(doc => ({
      id: doc.id,
      content: doc.content || doc.title
    }));
    
    // Build prompt for topic modeling
    const prompt = `
      I need to identify key topics across these project documents:
      ${documentContents.map(doc => `Document ${doc.id}: ${doc.content.substring(0, 500)}...`).join('\n\n')}
      
      Use LDA-like topic modeling to identify 3-5 main topics. For each topic:
      1. Provide a list of keywords
      2. Indicate which documents contain this topic
      3. Assign a relevance score (0.0-1.0)
      
      Output in JSON format with 'topics' array and 'documentTopics' array mapping documents to topics.
    `;
    
    // Call OpenAI for topic modeling
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an AI text analysis expert with topic modeling capabilities." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2000
    });
    
    // Parse response
    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      topics: result.topics || [],
      documentTopics: result.documentTopics || []
    };
  } catch (error) {
    console.error("Error generating topic models:", error);
    throw new Error(`Failed to generate topic models: ${error.message}`);
  }
}

/**
 * Resolve coreferences across multiple documents
 * This helps connect mentions of the same entity across different contexts
 */
export async function resolveCoreferences(documentIds: number[]): Promise<Record<string, string[]>> {
  try {
    // Get documents by IDs
    const documents = await getDocumentsByIds(documentIds);
    
    if (!documents.length) {
      throw new Error("No documents found with the provided IDs");
    }
    
    // Extract text content for analysis
    const documentContents = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content || ""
    }));
    
    // Build prompt for coreference resolution
    const prompt = `
      I need to identify entities mentioned across these documents and resolve coreferences:
      ${documentContents.map(doc => `Document "${doc.title}" (ID: ${doc.id}): ${doc.content.substring(0, 300)}...`).join('\n\n')}
      
      Identify key entities (people, companies, projects, concepts) mentioned across these documents.
      For each entity, list all the different ways it's referred to across documents.
      
      Output in JSON format with entity names as keys and arrays of coreferent mentions as values.
    `;
    
    // Call OpenAI for coreference resolution
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an AI NLP expert specializing in coreference resolution." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2000
    });
    
    // Parse response
    const result = JSON.parse(response.choices[0].message.content);
    
    return result.coreferences || {};
  } catch (error) {
    console.error("Error resolving coreferences:", error);
    throw new Error(`Failed to resolve coreferences: ${error.message}`);
  }
}

/**
 * Generate predictive analysis for project timeline, resource needs, or potential blockers
 */
export async function generatePredictiveInsights(projectId: number, focusArea: 'timeline' | 'resources' | 'risks' = 'timeline'): Promise<any> {
  try {
    // Get project data for analysis
    const projectData = await getProjectDataForAnalysis(projectId, {
      includeTasks: true,
      includeDocuments: true,
      includeActivities: true
    });
    
    // Determine focus area specific prompt additions
    let focusPrompt = '';
    
    switch (focusArea) {
      case 'timeline':
        focusPrompt = `
          Focus on timeline predictions:
          - Estimated completion dates for key milestones
          - Identification of potential schedule delays
          - Timeline optimization recommendations
        `;
        break;
      case 'resources':
        focusPrompt = `
          Focus on resource predictions:
          - Resource utilization forecasts
          - Potential resource constraints
          - Staffing and budget allocation recommendations
        `;
        break;
      case 'risks':
        focusPrompt = `
          Focus on risk predictions:
          - Potential project risks and their likelihood
          - Impact assessment of identified risks
          - Risk mitigation recommendations
        `;
        break;
    }
    
    // Build main prompt
    const prompt = `
      Based on this project data, generate predictive insights for the '${focusArea}' focus area:
      
      Project: ${projectData.name}
      Description: ${projectData.description}
      Status: ${projectData.status}
      Progress: ${projectData.progress}%
      
      Tasks: ${JSON.stringify(projectData.tasks || [])}
      Recent Activities: ${JSON.stringify(projectData.activities || [])}
      
      ${focusPrompt}
      
      Provide predictions and recommendations in JSON format with:
      - predictions: key metrics and forecasts
      - recommendations: list of actionable recommendations
    `;
    
    // Call OpenAI for predictive analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an AI project management expert with predictive analytics capabilities." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000
    });
    
    // Parse response
    const result = JSON.parse(response.choices[0].message.content);
    
    return result;
  } catch (error) {
    console.error("Error generating predictive insights:", error);
    throw new Error(`Failed to generate predictive insights: ${error.message}`);
  }
}

/**
 * Detect anomalies in project data
 */
export async function detectAnomalies(projectId: number): Promise<any> {
  try {
    // Get project data for analysis
    const projectData = await getProjectDataForAnalysis(projectId, {
      includeTasks: true,
      includeDocuments: true,
      includeActivities: true
    });
    
    // Build prompt for anomaly detection
    const prompt = `
      Analyze this project data to detect anomalies, outliers, or unusual patterns:
      
      Project: ${projectData.name}
      Description: ${projectData.description}
      Status: ${projectData.status}
      Progress: ${projectData.progress}%
      
      Tasks: ${JSON.stringify(projectData.tasks || [])}
      Recent Activities: ${JSON.stringify(projectData.activities || [])}
      
      Look for:
      - Unusual timing patterns
      - Unexpected resource allocation
      - Atypical task dependencies
      - Deviation from project baseline or industry standards
      - Communication or activity patterns that seem abnormal
      
      For each anomaly, provide:
      - description: what the anomaly is
      - evidence: data points supporting this detection
      - severity: numeric rating 1-10
      - recommendations: suggested actions
      
      Output as a JSON array of anomalies.
    `;
    
    // Call OpenAI for anomaly detection
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an AI expert in detecting anomalies and outliers in project data." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000
    });
    
    // Parse response
    const result = JSON.parse(response.choices[0].message.content);
    
    return result.anomalies || [];
  } catch (error) {
    console.error("Error detecting anomalies:", error);
    throw new Error(`Failed to detect anomalies: ${error.message}`);
  }
}

// Helper functions

/**
 * Get project data necessary for AI analysis
 */
async function getProjectDataForAnalysis(projectId: number, options: AnalysisRequest['options'] = {}): Promise<any> {
  try {
    // Get project details
    const [project] = await db.query.projects.findMany({
      where: eq(db.schema.projects.id, projectId),
      limit: 1
    });
    
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    
    // Base project data
    const projectData: any = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress,
    };
    
    // Get tasks if requested
    if (options.includeTasks) {
      projectData.tasks = await db.query.tasks.findMany({
        where: eq(db.schema.tasks.projectId, projectId)
      });
    }
    
    // Get documents if requested
    if (options.includeDocuments) {
      projectData.documents = await getProjectDocuments(projectId);
    }
    
    // Get activities if requested
    if (options.includeActivities) {
      projectData.activities = await db.query.activities.findMany({
        where: eq(db.schema.activities.projectId, projectId),
        orderBy: db.schema.activities.createdAt,
        desc: true,
        limit: 20
      });
    }
    
    return projectData;
  } catch (error) {
    console.error("Error getting project data for analysis:", error);
    throw new Error(`Failed to get project data: ${error.message}`);
  }
}

/**
 * Get documents for a project
 */
async function getProjectDocuments(projectId: number): Promise<any[]> {
  try {
    const documents = await db.query.documents.findMany({
      where: eq(db.schema.documents.projectId, projectId),
    });
    
    return documents;
  } catch (error) {
    console.error("Error getting project documents:", error);
    return [];
  }
}

/**
 * Get documents by IDs
 */
async function getDocumentsByIds(documentIds: number[]): Promise<any[]> {
  try {
    if (!documentIds.length) return [];
    
    const documents = await db.query.documents.findMany({
      where: (doc) => {
        return documentIds.includes(doc.id);
      }
    });
    
    return documents;
  } catch (error) {
    console.error("Error getting documents by IDs:", error);
    return [];
  }
}

/**
 * Build prompt for project insights
 */
function buildProjectInsightPrompt(projectData: any, context?: string, options: AnalysisRequest['options'] = {}): string {
  const prompt = `
    Analyze this project and generate insights:
    
    Project: ${projectData.name}
    Description: ${projectData.description}
    Status: ${projectData.status}
    Progress: ${projectData.progress}%
    
    ${projectData.tasks ? `Tasks: ${JSON.stringify(projectData.tasks)}` : ''}
    ${projectData.activities ? `Recent Activities: ${JSON.stringify(projectData.activities)}` : ''}
    ${projectData.documents ? `Document Count: ${projectData.documents.length}` : ''}
    
    ${context ? `Additional Context: ${context}` : ''}
    
    Generate exactly 5 insights with the following distribution:
    - 1 risk (something that could negatively impact the project)
    - 1 opportunity (something that could positively impact the project)
    - 1 trend (pattern that's emerging in the project data)
    - 1 anomaly (something unusual or unexpected)
    - 1 recommendation (suggested action to improve project outcomes)
    
    For each insight, provide:
    - type: one of "risk", "opportunity", "trend", "anomaly", "recommendation"
    - title: short, descriptive title
    - description: detailed explanation
    - confidence: percentage (0-100) indicating confidence level
    
    Return the insights as a JSON object with an "insights" array.
  `;
  
  return prompt;
}