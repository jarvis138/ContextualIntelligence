import { apiRequest } from './queryClient';
import { Entity } from '../components/nlp/DocumentSummary';

export interface DocumentSummary {
  summary: string;
  keyTopics: string[];
  sentiment: {
    label: string;
    score: number;
  };
  entities: Entity[];
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchResult {
  documentId: number;
  title: string;
  relevance: number;
  snippet: string;
}

/**
 * Extract entities from text
 */
export async function extractEntities(text: string): Promise<Entity[]> {
  try {
    const response = await apiRequest('POST', '/api/nlp/extract-entities', { text });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to extract entities');
    }
    return data.entities;
  } catch (error: any) {
    console.error('Entity extraction error:', error);
    throw new Error(`Failed to extract entities: ${error.message}`);
  }
}

/**
 * Generate summary for a document
 */
export async function summarizeDocument(documentId: number, save: boolean = false): Promise<DocumentSummary> {
  try {
    const url = `/api/documents/${documentId}/summarize${save ? '?save=true' : ''}`;
    const response = await apiRequest('GET', url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to summarize document');
    }
    
    return data.summary;
  } catch (error: any) {
    console.error('Document summarization error:', error);
    throw new Error(`Failed to summarize document: ${error.message}`);
  }
}

/**
 * Process a document (extract entities, create tasks, etc.)
 */
export async function processDocument(documentId: number): Promise<{
  summary: DocumentSummary;
  entitiesProcessed: number;
}> {
  try {
    const response = await apiRequest('POST', `/api/documents/${documentId}/process`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to process document');
    }
    
    return {
      summary: data.summary,
      entitiesProcessed: data.entitiesProcessed
    };
  } catch (error: any) {
    console.error('Document processing error:', error);
    throw new Error(`Failed to process document: ${error.message}`);
  }
}

/**
 * Generate context graph for a project
 */
export async function generateContextGraph(projectId: number): Promise<GraphData> {
  try {
    const response = await apiRequest('GET', `/api/projects/${projectId}/context-graph`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to generate context graph');
    }
    
    return data.graph;
  } catch (error: any) {
    console.error('Context graph generation error:', error);
    throw new Error(`Failed to generate context graph: ${error.message}`);
  }
}

/**
 * Perform semantic search across project documents
 */
export async function semanticSearch(projectId: number, query: string): Promise<SearchResult[]> {
  try {
    const response = await apiRequest('POST', `/api/projects/${projectId}/semantic-search`, { query });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to perform semantic search');
    }
    
    return data.results;
  } catch (error: any) {
    console.error('Semantic search error:', error);
    throw new Error(`Failed to perform semantic search: ${error.message}`);
  }
}