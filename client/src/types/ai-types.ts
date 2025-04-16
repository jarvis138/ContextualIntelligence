/**
 * Type definitions for AI features
 * 
 * Used in the Phase 3 implementation of AI Intelligence.
 */

/**
 * Entity extracted from text
 */
export interface Entity {
  name: string;
  type: string;
  confidence: number;
  aliases?: string[];
  metadata?: Record<string, any>;
}

/**
 * Relation between entities
 */
export interface Relation {
  source: string;
  sourceType?: string;
  target: string;
  targetType?: string;
  relationType: string;
  confidence: number;
  context?: string;
  metadata?: Record<string, any>;
}

/**
 * Results of document analysis
 */
export interface DocumentAnalysis {
  summary: string;
  entities: Entity[];
  keywords: string[];
  topics: string[];
  sentiment: {
    score: number;
    label: string;
  };
  importance: number;
  metadata?: Record<string, any>;
}

/**
 * Project insight generated from project data
 */
export interface ProjectInsight {
  title: string;
  description: string;
  confidence: number;
  impact: number;
  category: string;
  relatedEntities?: string[];
  suggestions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Graph node representation for visualization
 */
export interface GraphNode {
  id: string;
  label: string;
  type: string;
  size?: number;
  color?: string;
  metadata?: Record<string, any>;
}

/**
 * Graph link representation for visualization
 */
export interface GraphLink {
  source: string;
  target: string;
  label: string;
  value?: number;
  color?: string;
  metadata?: Record<string, any>;
}

/**
 * Complete graph structure for visualization
 */
export interface Graph {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Named entity in context, with position information
 */
export interface NamedEntity extends Entity {
  start: number;
  end: number;
  text: string;
}

/**
 * Sentiment result from analysis
 */
export interface SentimentResult {
  sentiment: string;
  confidence: number;
  score?: number;
}

/**
 * Project context for insight generation
 */
export interface ProjectContext {
  projectDescription?: string;
  recentDocuments?: string[];
  teamMembers?: string[];
  recentActivities?: string[];
  currentIssues?: string[];
}