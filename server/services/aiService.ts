import OpenAI from "openai";
import { storage } from "../storage";
import * as schema from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types
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
    // Get project data
    const project = await storage.getProject(params.projectId);
    if (!project) {
      throw new Error(`Project with ID ${params.projectId} not found`);
    }

    // Gather related data based on options
    const options = params.options || {};
    
    let tasks: schema.Task[] = [];
    let documents: schema.Document[] = [];
    let activities: schema.Activity[] = [];
    
    if (options.includeTasks || !options.hasOwnProperty('includeTasks')) {
      tasks = await storage.getTasks(params.projectId);
    }
    
    if (options.includeDocuments || !options.hasOwnProperty('includeDocuments')) {
      documents = await storage.getDocuments(params.projectId);
    }
    
    if (options.includeActivities || !options.hasOwnProperty('includeActivities')) {
      activities = await storage.getActivities(params.projectId, 50); // Get last 50 activities
    }
    
    // Create project summary for the AI
    const taskSummary = tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate
    }));
    
    const documentSummary = documents.map(d => ({
      id: d.id, 
      title: d.title,
      fileType: d.fileType,
      // Include a content snippet if available
      contentSnippet: d.content ? d.content.substring(0, 500) + (d.content.length > 500 ? '...' : '') : null
    }));
    
    const activitySummary = activities.map(a => ({
      type: a.type,
      description: a.description,
      timestamp: a.timestamp,
      entityType: a.entityType,
      entityId: a.entityId
    }));

    // Format all data as a detailed prompt
    const systemPrompt = `
You are an advanced AI project analyst for the Contextual Project Intelligence (CPI) Hub. 
Your job is to analyze project data and generate actionable insights.
Please analyze the following project data and provide insightful observations that would help project managers.

Each insight must include:
1. A type (risk, opportunity, trend, anomaly, or recommendation)
2. A short, clear title (max 10 words)
3. A detailed description explaining the insight (2-3 sentences)
4. A confidence score between 0 and 1 (e.g., 0.85)
5. Related entities if applicable (connecting to specific tasks, documents, or activities)

Focus on identifying:
- Timeline risks and opportunities
- Resource allocation issues
- Important trends in activity patterns
- Potential bottlenecks
- Anomalies compared to typical project patterns
- Strategic recommendations

Format your response as a JSON array of insight objects.
`;

    const userPrompt = `
Project: ${project.name}
Description: ${project.description || 'No description provided'}
Progress: ${project.progress}%
Status: ${project.status}
${project.startDate ? `Start Date: ${project.startDate}` : ''}
${project.endDate ? `End Date: ${project.endDate}` : ''}

Tasks (${tasks.length}):
${JSON.stringify(taskSummary, null, 2)}

Documents (${documents.length}):
${JSON.stringify(documentSummary, null, 2)}

Recent Activities (${activities.length}):
${JSON.stringify(activitySummary, null, 2)}

${params.context ? `Additional Context: ${params.context}` : ''}
${options.focusArea ? `Please focus especially on aspects related to: ${options.focusArea}` : ''}

Please provide ${options.maxInsights || 5} insights based on this data in the required JSON format.
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    // Parse response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsedResponse = JSON.parse(content);
    const insights = parsedResponse.insights || [];

    // Store insights in database
    for (const insight of insights) {
      await storage.createInsight({
        type: insight.type,
        content: `${insight.title}: ${insight.description}`,
        projectId: params.projectId,
        confidence: Math.round(insight.confidence * 100)
      });
    }

    return insights;
  } catch (error) {
    console.error("Error generating AI insights:", error);
    throw error;
  }
}

/**
 * Generate topic models from project documents
 */
export async function generateTopicModels(projectId: number): Promise<TopicModelingResult> {
  try {
    // Get all documents for the project
    const documents = await storage.getDocuments(projectId);
    
    // Extract document content
    const documentContents = documents.map(doc => ({
      id: doc.id,
      content: doc.content || '',
      title: doc.title
    })).filter(doc => doc.content.length > 0);
    
    if (documentContents.length === 0) {
      throw new Error("No document content available for topic modeling");
    }

    // Prepare prompt for OpenAI
    const systemPrompt = `
You are an expert in topic modeling for document collections. You will analyze a collection of documents 
and identify the main topics across them. For each topic:
1. Assign a numeric ID (starting from 1)
2. Provide a list of 5-7 relevant keywords that characterize the topic
3. List the document IDs that are most associated with this topic
4. Assign a relevance score (0-1) for how significant this topic is to the project

Format your response as a JSON object with two arrays:
1. "topics": Array of topic objects with id, keywords, documents (array of document IDs), and score
2. "documentTopics": Array of document-topic relationships with documentId, topicId, and score fields
`;

    const userPrompt = `
Here are ${documentContents.length} documents from project ${projectId}:

${documentContents.map(doc => (
  `Document ID: ${doc.id}
  Title: ${doc.title}
  Content snippet: ${doc.content.substring(0, 500)}${doc.content.length > 500 ? '...' : ''}`
)).join('\n\n')}

Please identify the main topics in these documents and return the result in the specified JSON format.
Identify between 3-7 topics depending on the diversity of the content.
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    // Parse response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsedResponse = JSON.parse(content);
    return {
      topics: parsedResponse.topics || [],
      documentTopics: parsedResponse.documentTopics || []
    };
  } catch (error) {
    console.error("Error generating topic models:", error);
    throw error;
  }
}

/**
 * Resolve coreferences across multiple documents
 * This helps connect mentions of the same entity across different contexts
 */
export async function resolveCoreferences(documentIds: number[]): Promise<Record<string, string[]>> {
  try {
    // Get document contents
    const documents = await Promise.all(
      documentIds.map(id => storage.getDocument(id))
    );
    
    const validDocuments = documents.filter(doc => doc && doc.content);
    
    if (validDocuments.length === 0) {
      throw new Error("No valid documents with content found");
    }
    
    // Create context for each document
    const documentContexts = validDocuments.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content?.substring(0, 1000) || '' // Limit content size
    }));
    
    // Prepare prompt for OpenAI
    const systemPrompt = `
You are an expert in natural language processing and coreference resolution.
Your task is to identify entities and their coreferences across multiple documents.
Please identify the main entities (people, organizations, projects, technologies, etc.) 
and list all references to them across the documents.

Format your response as a JSON object where:
- Keys are the canonical entity names
- Values are arrays of alternative references/mentions of that entity
`;

    const userPrompt = `
Here are ${validDocuments.length} documents for coreference resolution:

${documentContexts.map(doc => (
  `Document ID: ${doc.id}
  Title: ${doc.title}
  Content:
  ${doc.content}`
)).join('\n\n')}

Please identify the main entities and their coreferences across these documents.
Return the results as a JSON object with entity names as keys and arrays of alternative references as values.
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    // Parse and return coreferences
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error resolving coreferences:", error);
    throw error;
  }
}

/**
 * Generate predictive analysis for project timeline, resource needs, or potential blockers
 */
export async function generatePredictiveInsights(projectId: number, focusArea: 'timeline' | 'resources' | 'risks' = 'timeline'): Promise<any> {
  try {
    // Get project data
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    
    // Get tasks and activities
    const tasks = await storage.getTasks(projectId);
    const activities = await storage.getActivities(projectId, 100); // Get more activities for pattern analysis
    
    // Calculate completion rates and patterns
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;
    
    // Group activities by day to see pattern
    const activityByDay = activities.reduce((acc, activity) => {
      const date = new Date(activity.timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Prepare analysis context
    const analysisContext = {
      project: {
        name: project.name,
        description: project.description,
        progress: project.progress,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        completionRate
      },
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate
      })),
      activityPattern: activityByDay
    };

    // Prepare prompt based on focus area
    let analysisPrompt = '';
    switch (focusArea) {
      case 'timeline':
        analysisPrompt = `
Based on the project data, predict:
1. The likely completion date (if not specified or if current progress suggests a different timeline)
2. Potential timeline risks based on task completion patterns
3. Recommendations for timeline management
`;
        break;
      case 'resources':
        analysisPrompt = `
Based on the project data, predict:
1. Resource allocation issues or bottlenecks
2. Areas that may require additional resources based on task status and activity patterns
3. Resource optimization recommendations
`;
        break;
      case 'risks':
        analysisPrompt = `
Based on the project data, predict:
1. Potential risk factors that could impact project success
2. Likelihood and potential impact of identified risks
3. Risk mitigation recommendations
`;
        break;
    }

    // System prompt
    const systemPrompt = `
You are an advanced predictive analytics AI specialized in project intelligence.
Based on project data, you'll generate predictive insights focused on ${focusArea}.
Use patterns in task completion, activity trends, and project progress to make predictions.
Format your response as a detailed JSON object with predictions, confidence levels, and recommendations.
`;

    const userPrompt = `
Project Data:
${JSON.stringify(analysisContext, null, 2)}

${analysisPrompt}

Please provide a detailed predictive analysis in JSON format with clear insights, confidence levels, and actionable recommendations.
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    // Parse and return predictive insights
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating predictive insights:", error);
    throw error;
  }
}

/**
 * Detect anomalies in project data
 */
export async function detectAnomalies(projectId: number): Promise<any> {
  try {
    // Get project data
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    
    // Get tasks, documents, and activities
    const tasks = await storage.getTasks(projectId);
    const documents = await storage.getDocuments(projectId);
    const activities = await storage.getActivities(projectId, 100);
    
    // Create dataset for anomaly detection
    const dataContext = {
      projectData: {
        name: project.name,
        progress: project.progress,
        status: project.status
      },
      taskStats: {
        total: tasks.length,
        byStatus: tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      documentStats: {
        total: documents.length,
        byType: documents.reduce((acc, doc) => {
          acc[doc.fileType] = (acc[doc.fileType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      activityStats: {
        total: activities.length,
        byType: activities.reduce((acc, activity) => {
          acc[activity.type] = (acc[activity.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };

    // System prompt
    const systemPrompt = `
You are an anomaly detection specialist for project analytics.
Your task is to analyze project data and identify potential anomalies or outliers
that could indicate issues, risks, or unusual patterns worth investigating.

Consider the following types of anomalies:
1. Statistical outliers in activity patterns
2. Unusual task distribution or completion rates
3. Mismatches between progress reported and task status
4. Anomalous document or activity patterns

Format your response as a JSON array of anomaly objects, each with:
- description: Detailed description of the anomaly
- severity: Numerical score from 1-10
- evidence: What data points suggest this anomaly
- recommendations: Suggested actions to investigate or address
`;

    const userPrompt = `
Project Context:
${JSON.stringify(dataContext, null, 2)}

Additional Tasks Info:
${JSON.stringify(tasks.map(t => ({
  id: t.id,
  title: t.title,
  status: t.status,
  dueDate: t.dueDate
})), null, 2).substring(0, 1000)}...

Please analyze this data and identify any anomalies that should be investigated.
Return the results as a JSON array of anomaly objects.
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    // Parse and return anomalies
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error detecting anomalies:", error);
    throw error;
  }
}