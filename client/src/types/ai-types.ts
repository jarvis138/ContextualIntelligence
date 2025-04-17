/**
 * AI Types
 * 
 * This file defines TypeScript types for AI-related features in the CPI Hub.
 * These types correspond to the data structures returned by the AI API.
 */

// Entity represents a named entity extracted from text
export interface Entity {
  name: string;
  type: string;
  confidence: number;
  aliases?: string[];
  metadata?: Record<string, any>;
}

// Relation represents a relationship between two entities
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

// DocumentAnalysis provides comprehensive analysis of a document
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

// ProjectInsight represents an AI-generated insight about a project
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

// SentimentAnalysis represents the sentiment of text
export interface SentimentAnalysis {
  sentiment: string;
  confidence: number;
  score: number;
}

// Response types for AI API endpoints
export interface EntitiesResponse {
  entities: Entity[];
}

export interface RelationsResponse {
  relations: Relation[];
}

export interface DocumentAnalysisResponse {
  analysis: DocumentAnalysis;
}

export interface ProjectInsightsResponse {
  insights: ProjectInsight[];
}

export interface SentimentResponse {
  sentiment: SentimentAnalysis;
}

export interface SummarizeResponse {
  summary: string;
}

// Request types for AI API endpoints
export interface ProjectInsightsRequest {
  projectDescription?: string;
  recentDocuments?: string[];
  teamMembers?: string[];
  recentActivities?: string[];
  currentIssues?: string[];
}