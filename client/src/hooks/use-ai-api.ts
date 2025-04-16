/**
 * Custom hooks for AI API calls
 * 
 * Used for integration with the AI features in Phase 3
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Entity, Relation, DocumentAnalysis, ProjectInsight } from '@/types/ai-types';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for entity extraction
 */
export function useEntityExtraction() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (text: string): Promise<Entity[]> => {
      const response = await apiRequest('POST', '/api/ai/entities', { text });
      const data = await response.json();
      return data.entities;
    },
    onError: (error: Error) => {
      toast({
        title: 'Entity extraction failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for relation extraction
 */
export function useRelationExtraction() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ text, entities }: { text: string; entities?: Entity[] }): Promise<Relation[]> => {
      const response = await apiRequest('POST', '/api/ai/relations', { text, entities });
      const data = await response.json();
      return data.relations;
    },
    onError: (error: Error) => {
      toast({
        title: 'Relation extraction failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for document analysis
 */
export function useDocumentAnalysis() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (text: string): Promise<DocumentAnalysis> => {
      const response = await apiRequest('POST', '/api/ai/document-analysis', { text });
      const data = await response.json();
      return data.analysis;
    },
    onError: (error: Error) => {
      toast({
        title: 'Document analysis failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for generating project insights
 */
export function useProjectInsights() {
  const { toast } = useToast();
  
  interface ProjectInsightContext {
    projectDescription?: string;
    recentDocuments?: string[];
    teamMembers?: string[];
    recentActivities?: string[];
    currentIssues?: string[];
  }
  
  return useMutation({
    mutationFn: async (context: ProjectInsightContext): Promise<ProjectInsight[]> => {
      const response = await apiRequest('POST', '/api/ai/project-insights', context);
      const data = await response.json();
      return data.insights;
    },
    onError: (error: Error) => {
      toast({
        title: 'Project insights generation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for sentiment analysis
 */
export function useSentimentAnalysis() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (text: string): Promise<{ sentiment: string; confidence: number }> => {
      const response = await apiRequest('POST', '/api/ai/sentiment', { text });
      const data = await response.json();
      return data.sentiment;
    },
    onError: (error: Error) => {
      toast({
        title: 'Sentiment analysis failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for text summarization
 */
export function useTextSummarization() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ text, maxLength }: { text: string; maxLength?: number }): Promise<string> => {
      const response = await apiRequest('POST', '/api/ai/summarize', { text, maxLength });
      const data = await response.json();
      return data.summary;
    },
    onError: (error: Error) => {
      toast({
        title: 'Text summarization failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}