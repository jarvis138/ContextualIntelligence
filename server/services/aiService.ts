import OpenAI from "openai";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { tenantService } from "../tenant-service";
import { logger } from "../services/observability";
import { featureFlagService } from "./feature-flag";

// Create child logger for AI service
const aiLogger = logger.createChildLogger({ component: 'AIService' });

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  aiLogger.warn("OPENAI_API_KEY environment variable is not set. AI features will be limited.");
}

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || '' // Provide empty string as fallback to avoid null
});

// Utility to check if the OpenAI client is properly configured
function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Helper to get tenant context for multi-tenant isolation
interface TenantContext {
  tenantId: number | null;
  rlsTenantId: string | null;
  tier: string | null;
  aiFeatureLevel: 'basic' | 'standard' | 'enterprise';
}

// Default tenant context when not specified (single-tenant mode)
const DEFAULT_TENANT_CONTEXT: TenantContext = {
  tenantId: null,
  rlsTenantId: null,
  tier: null,
  aiFeatureLevel: 'basic'
};

/**
 * Get tenant context for AI operations
 * This ensures proper multi-tenant isolation for AI features
 */
async function getTenantContext(tenantId?: number): Promise<TenantContext> {
  if (!tenantId) {
    return DEFAULT_TENANT_CONTEXT;
  }
  
  try {
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      aiLogger.warn(`Tenant with ID ${tenantId} not found, using default context`);
      return DEFAULT_TENANT_CONTEXT;
    }
    
    // Check AI feature flags for this tenant
    const aiFeatureFlags = await tenantService.getTenantFeatureFlag(tenantId, 'ai_features');
    
    // Determine AI feature level based on tenant tier and feature flags
    let aiFeatureLevel: 'basic' | 'standard' | 'enterprise' = 'basic';
    
    if (tenant.tier === 'enterprise') {
      aiFeatureLevel = 'enterprise';
    } else if (tenant.tier === 'professional' || tenant.tier === 'standard') {
      aiFeatureLevel = 'standard';
    }
    
    // Override with explicit feature flag if present
    if (aiFeatureFlags && aiFeatureFlags.settings && aiFeatureFlags.settings.level) {
      aiFeatureLevel = aiFeatureFlags.settings.level;
    }
    
    return {
      tenantId: tenant.id,
      rlsTenantId: tenant.rlsTenantId,
      tier: tenant.tier,
      aiFeatureLevel
    };
  } catch (error) {
    aiLogger.error('Error getting tenant context for AI', { error, tenantId });
    return DEFAULT_TENANT_CONTEXT;
  }
}

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
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      console.warn("OpenAI API key not configured. Cannot generate AI insights.");
      return [];
    }
    
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
    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    
    return result.insights || [];
  } catch (error: unknown) {
    console.error("Error generating AI insights:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate AI insights: ${error.message}`);
    } else {
      throw new Error("Failed to generate AI insights: Unknown error");
    }
  }
}

/**
 * Generate topic models from project documents
 */
export async function generateTopicModels(projectId: number): Promise<TopicModelingResult> {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      console.warn("OpenAI API key not configured. Cannot generate topic models.");
      return { topics: [], documentTopics: [] };
    }
    
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
    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    
    return {
      topics: result.topics || [],
      documentTopics: result.documentTopics || []
    };
  } catch (error: unknown) {
    console.error("Error generating topic models:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate topic models: ${error.message}`);
    } else {
      throw new Error("Failed to generate topic models: Unknown error");
    }
  }
}

/**
 * Resolve coreferences across multiple documents
 * This helps connect mentions of the same entity across different contexts
 */
export async function resolveCoreferences(documentIds: number[]): Promise<Record<string, string[]>> {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      console.warn("OpenAI API key not configured. Cannot resolve coreferences.");
      return {};
    }
    
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
    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    
    return result.coreferences || {};
  } catch (error: unknown) {
    console.error("Error resolving coreferences:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to resolve coreferences: ${error.message}`);
    } else {
      throw new Error("Failed to resolve coreferences: Unknown error");
    }
  }
}

/**
 * Generate predictive analysis for project timeline, resource needs, or potential blockers
 */
export async function generatePredictiveInsights(projectId: number, focusArea: 'timeline' | 'resources' | 'risks' = 'timeline'): Promise<any> {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      console.warn("OpenAI API key not configured. Cannot generate predictive insights.");
      return { predictions: [], recommendations: [] };
    }
    
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
    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    
    return result;
  } catch (error: unknown) {
    console.error("Error generating predictive insights:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate predictive insights: ${error.message}`);
    } else {
      throw new Error("Failed to generate predictive insights: Unknown error");
    }
  }
}

/**
 * Detect anomalies in project data
 */
export async function detectAnomalies(projectId: number): Promise<any> {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      console.warn("OpenAI API key not configured. Cannot detect anomalies.");
      return [];
    }
    
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
    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    
    return result.anomalies || [];
  } catch (error: unknown) {
    console.error("Error detecting anomalies:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to detect anomalies: ${error.message}`);
    } else {
      throw new Error("Failed to detect anomalies: Unknown error");
    }
  }
}

/**
 * Analyze document content with AI
 * This is a key Phase 3 feature for AI-powered document analysis with enterprise-grade multi-tenant isolation
 */
export async function analyzeDocument(documentId: number, tenantId?: number): Promise<any> {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      aiLogger.warn("OpenAI API key not configured. Cannot analyze document.");
      return {
        summary: "AI analysis unavailable - API key not configured",
        entities: [],
        keywords: [],
        topics: [],
        sentiment: { score: 0, label: "neutral" },
        importance: 0.5
      };
    }
    
    // Get tenant context for multi-tenant isolation
    const tenantContext = await getTenantContext(tenantId);
    
    // Check tenant AI feature entitlement
    if (tenantContext.aiFeatureLevel === 'basic' && tenantId) {
      aiLogger.info('Tenant does not have access to advanced document analysis', { 
        tenantId, 
        documentId,
        aiFeatureLevel: tenantContext.aiFeatureLevel 
      });
      
      return {
        documentId,
        summary: "Advanced document analysis unavailable - please upgrade your subscription",
        aiFeatureLevel: 'basic',
        entities: [],
        keywords: [],
        topics: [],
        sentiment: { score: 0, label: "neutral" },
        importance: 0.5
      };
    }
    
    // Apply tenant RLS for proper data isolation
    let documentQuery = db.query.documents;
    if (tenantContext.tenantId && tenantContext.rlsTenantId) {
      // Apply tenant isolation if we're in a multi-tenant context
      documentQuery = db.query.documents.findMany({
        where: and(
          eq(db.documents.id, documentId),
          // Only include document if it belongs to this tenant
          // This provides proper multi-tenant isolation
          eq(db.documents.tenantId, tenantContext.tenantId)
        ),
        limit: 1
      });
    } else {
      // No tenant context, use regular query
      documentQuery = db.query.documents.findMany({
        where: eq(db.documents.id, documentId),
        limit: 1
      });
    }
    
    // Execute query with proper tenant isolation
    const [document] = await documentQuery;
    
    if (!document) {
      aiLogger.warn(`Document with ID ${documentId} not found or not accessible by tenant`, { 
        tenantId: tenantContext.tenantId,
        documentId
      });
      throw new Error(`Document with ID ${documentId} not found or not accessible`);
    }
    
    // Extract content for analysis
    const content = document.content || document.title;
    
    if (!content || content.length < 10) {
      throw new Error("Document content too short for meaningful analysis");
    }
    
    // Audit log the document analysis request for compliance
    aiLogger.info('Document analysis requested', {
      tenantId: tenantContext.tenantId,
      documentId,
      documentTitle: document.title,
      aiFeatureLevel: tenantContext.aiFeatureLevel,
      contentLength: content.length
    });
    
    // Build prompt for document analysis with enterprise features
    // For enterprise tenants, provide more comprehensive analysis
    const enterprisePrompt = tenantContext.aiFeatureLevel === 'enterprise' ? `
      7. Risk assessment (identify sensitive information, compliance concerns)
      8. Document classification (by type, department, confidentiality)
      9. Regulatory compliance analysis
      10. Action items identification
    ` : '';
    
    const prompt = `
      Analyze this document thoroughly:
      
      Title: ${document.title}
      Content: ${content.substring(0, 8000)} ${content.length > 8000 ? '...(truncated)' : ''}
      
      Provide a comprehensive analysis including:
      1. A concise summary (max 200 words)
      2. Key entities mentioned (people, organizations, concepts, etc.)
      3. Important keywords
      4. Main topics covered
      5. Overall sentiment (score from -1 to 1, and label)
      6. Document importance rating (0.0 to 1.0)
      ${enterprisePrompt}
      
      Return the analysis in JSON format with these sections.
    `;
    
    // Model selection based on tenant tier
    const model = tenantContext.aiFeatureLevel === 'enterprise' ? "gpt-4o" : "gpt-4o";
    
    // Call OpenAI for document analysis with proper tenant context
    const response = await openai.chat.completions.create({
      model, // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an AI expert in document analysis and information extraction." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: tenantContext.aiFeatureLevel === 'enterprise' ? 4000 : 2000
    });
    
    // Parse response
    const content_response = response.choices[0].message.content || "{}";
    const result = JSON.parse(content_response);
    
    // Record metrics for this analysis
    aiLogger.info('Document analysis completed', {
      tenantId: tenantContext.tenantId,
      documentId,
      aiFeatureLevel: tenantContext.aiFeatureLevel,
      topicsCount: result.topics?.length || 0,
      entitiesCount: result.entities?.length || 0
    });
    
    // For enterprise tenants, store analysis results in the database for later reference
    if (tenantContext.aiFeatureLevel === 'enterprise' && tenantContext.tenantId) {
      try {
        await storeDocumentAnalysis(documentId, result, tenantContext.tenantId);
      } catch (storageError) {
        aiLogger.error('Failed to store document analysis results', { 
          error: storageError,
          tenantId: tenantContext.tenantId,
          documentId
        });
        // Don't fail the entire operation if storage fails
      }
    }
    
    return {
      documentId,
      title: document.title,
      aiFeatureLevel: tenantContext.aiFeatureLevel,
      ...result
    };
  } catch (error: unknown) {
    aiLogger.error("Error analyzing document:", { 
      error,
      documentId,
      tenantId
    });
    
    if (error instanceof Error) {
      throw new Error(`Failed to analyze document: ${error.message}`);
    } else {
      throw new Error("Failed to analyze document: Unknown error");
    }
  }
}

/**
 * Store document analysis results for enterprise tenants
 * This enables historical analysis, auditing, and advanced search
 */
async function storeDocumentAnalysis(
  documentId: number, 
  analysis: any, 
  tenantId: number
): Promise<void> {
  try {
    const analysisRecord = {
      documentId,
      tenantId,
      createdAt: new Date(),
      analysisType: 'document',
      result: analysis,
      model: 'gpt-4o'
    };
    
    // In a real implementation, we would store the analysis in the database
    // await db.insert(analysisRecords).values(analysisRecord);
    
    aiLogger.debug('Document analysis stored', { documentId, tenantId });
  } catch (error) {
    aiLogger.error('Error storing document analysis', { error, documentId, tenantId });
    throw error;
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
  } catch (error: unknown) {
    console.error("Error getting project data for analysis:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to get project data: ${error.message}`);
    } else {
      throw new Error("Failed to get project data: Unknown error");
    }
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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